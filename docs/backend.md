# Backend · Milestone 6

## Running locally

Use the supported Node.js 22.13+ or 24+ runtime. `npm ci` installs the runtime helper and dependencies. `npm run dev` starts the API on `127.0.0.1:4318` and Vite on `127.0.0.1:5173`. Both stop together when the launcher exits. The frontend proxies `/api` to the local API, keeping browser requests same-origin.

For separate processes, use `npm run dev:client` and `npm run dev:api`. `npm run start:api` starts the API without watching source changes. `npm run build` compiles client and server TypeScript and bundles the frontend, without running tests. `npm run preview` serves that bundle on port 4173; keep the API running separately to use backups.

The backend uses Node's built-in SQLite driver (experimental on Node 22). Its file lives at `.data/abyss.sqlite` and is excluded from Git. Environment variables are read from the process: `ABYSS_API_PORT`, `ABYSS_DATABASE_PATH`, `ABYSS_ALLOWED_ORIGINS` (comma-separated), and `ABYSS_SECURE_COOKIE=true`. Defaults allow the loopback Vite and preview origins. A non-default API port also requires changing the Vite proxy target. No cloud deployment is performed by this milestone.

## API boundary

All responses are JSON with `Cache-Control: no-store`. API version 1 is independent of game save version 6. The client validates envelopes and save data; the server uses the same game save validator and migrations as local persistence. Domain simulation has no dependency on HTTP, authentication or SQLite.

| Endpoint               | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `GET /api/v1/health`   | API availability and server timestamp                             |
| `POST /api/v1/session` | Reuse an authenticated guest session or create a new guest player |
| `GET /api/v1/save`     | Current player's server snapshot or null                          |
| `PUT /api/v1/save`     | Validate and replace the snapshot using an expected revision      |

A snapshot contains `revision`, `updatedAt` and `save`. PUT accepts `{ expectedRevision, save }`. A new snapshot requires revision zero. Successful writes return the full saved snapshot and next revision. A stale revision receives HTTP 409 and the current snapshot. Invalid input receives 400, missing authentication 401, prohibited origins 403 and oversized saves 413. Requests time out; the maximum save body is 128 KiB. Server timestamps describe storage time and do not make the client economy authoritative.

`CloudSaveGateway` in the application layer defines connect/load/save. `CloudSaveClient` implements HTTP with an eight-second timeout. `SaveSync` coordinates backup and conflict choices without replacing the existing `SaveRepository` or coupling autosaves to network availability.

## Authentication design

This milestone implements anonymous browser sessions, not account sign-in. The API creates an opaque 256-bit token in an HttpOnly, SameSite=Strict cookie scoped to `/api`; only its SHA-256 hash is stored. Sessions expire after 30 days. The player identity always comes from the session lookup, never an ID sent by the client. Mutations require an explicitly allowed Origin and the `X-Abyss-Client: 1` header. No permissive CORS is enabled. The service listens on loopback.

For a future hosted deployment, serve frontend and API through one HTTPS origin, configure its allowed origin and enable Secure cookies. Account authentication should use an established OIDC provider with authorization-code/PKCE login. Store `(issuer, subject)` as a unique identity mapped to a player, rotate the guest session during linking and retain the existing player ID/save. Never infer ownership from email, device ID, timestamps or an unverified client token. Account linking and cross-device recovery are deliberately not presented as available features. Clearing cookies or session expiry loses access to an anonymous server profile; local saves remain.

## Database and revision safety

Schema migrations 1 and 2 are recorded through SQLite `user_version`. Tables are introduced in one transaction:

- `players`: opaque player ID and creation time;
- `sessions`: hashed token, player foreign key and expiration;
- `saves`: current snapshot and revision per player;
- `save_history`: the ten preceding snapshots per player.

Foreign keys, WAL journaling and a busy timeout are enabled. Each PUT starts an immediate transaction, checks the current revision, preserves the prior snapshot and writes the next revision before committing. The revision check and write are atomic. SQL parameters are bound. A failed operation rolls back. Unknown schema versions stop startup instead of rewriting the database. Back up the SQLite database with an SQLite-aware backup or stop the server before copying its file; include live WAL state if making filesystem snapshots.

## Sync and conflict behavior

Local autosave continues unchanged. Server backup is opt-in through **Sync now**, preserving local play when the server is stopped or unavailable. The UI reports backup time and reminds players that later actions remain local until the next sync. Nothing automatically merges two wallets, upgrades or claimed rewards.

The coordinator retains the last acknowledged revision for the browser profile in `abyss-corp.server-sync`, and freezes that baseline per tab. It does not adopt metadata written by another tab during a live session. An existing remote copy with no trusted baseline, a different profile, or an unexpected revision requires a choice. PUT still enforces the expected revision if another writer wins after the initial read. Uncertain/lost network acknowledgements lead to conflict resolution on retry rather than blind replay.

**Keep this device** re-reads the server revision before uploading. **Use server copy** re-reads the selected revision, saves the current local session and writes `abyss-corp.save.before-server-restore` before replacing it. The imported save receives normal capped offline production. Both choices reject a newly changed server copy and ask the player to choose again. The server retains the overwritten snapshot in its history. Browser profile changes during resolution are treated as a new conflict too.

To recover the pre-restore local copy, close other game tabs, copy the JSON from `abyss-corp.save.before-server-restore` into `abyss-corp.save` in browser storage and reload. Server history is retained in SQLite for operator recovery; no history browser is included yet. Recovery keys and database contents must not be committed.

One active game tab is still the supported local play mode. Revision checks protect server copies; they do not add live multi-tab game-state sharing. Saves are structurally validated, but economy mutations, purchases, leaderboard rewards and offline time remain client-owned. This backend is a backup boundary, not server-authoritative gameplay.

## Development scope

No tests were added or run, per the user's instruction. No authentication provider or cloud host is provisioned. Milestone 7 adds first-party live config, opt-in analytics and events; see [live-ops design](live-ops.md). Payments and push notifications remain outside scope.

## Live endpoints added in Milestone 7

`GET /api/v1/live-ops` returns validated operator config and server time without creating a guest session. `POST /api/v1/telemetry` accepts explicit-consent allowlisted batches without cookies, subject to origin/header checks, deduplication and installation rate limits. Migration 2 introduces the analytics table and retention indexes without modifying player or save tables. `ABYSS_LIVE_OPS_PATH` overrides the operator config file location. Full details are in [live-ops notes](live-ops.md).
