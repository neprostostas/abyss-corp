# Architecture

## Boundaries

- `src/data`: resource, depth, production, automation and research configuration.
- `src/domain`: immutable production, shared wallet, depth unlocks, research and mission rules. It has no React, network, storage or authentication dependencies.
- `src/application/GameSession.ts`: elapsed-time simulation, commands, offline reports and serialized local saves through `SaveRepository`.
- `src/application/accountPorts.ts`: account save synchronization status and canonical cloud update contract.
- `src/infrastructure/supabase`: the configured Supabase client, generated public database types and account save repository.
- `src/infrastructure/persistence`: strict runtime save validation, explicit version 3-7 migration for account saves.
- `src/app`: authentication lifecycle, one game runtime per user ID, cloud sync scheduling and route selection.
- `src/ui`: the ocean scene, upgrades, compact equipment panels, account forms and read-only database browser.

Before saving, GameSession advances production to the captured time so a save cannot consume elapsed time without its corresponding output. Long foreground gaps compare both the monotonic and wall clocks, covering [platforms where the monotonic clock pauses during sleep](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now#ticking_during_sleep). The same four-hour offline cap and suspension timestamp prevent duplicate awards on resume or reload.

The existing bounded extraction → transport → processing → storage/sale engine is unchanged. Production stops at full buffers without losing cargo. Unselected running outposts continue producing; credits are shared. Automation and capped four-hour offline simulation use the same domain engine.

## Authentication

Supabase Auth owns passwords, verification, reset emails, sessions and token refresh. The SPA uses the provider's supported browser session flow; recovery redirects to `/reset-password`. The application never stores passwords in its database. Only a publishable key reaches the browser. PostgreSQL derives ownership from `auth.uid()`.

Authentication changes remount the game by user ID. An old runtime can write only its own local journal. The cloud write RPC also compares the requested account ID to the JWT subject, so a late request from an old runtime cannot upload its progress into a newly signed-in account.

## Saving and conflicts

The account repository implements `SaveRepository`. Each local journal is stored under `abyss-corp.account.<user-id>` with the save, acknowledged server revision and dirty marker. Domain saves keep version 7; account identity and server revision belong to the storage envelope.

Loading reads the server before enabling gameplay. An invalid device journal is retained under the account `.corrupt` key and can be replaced only by a valid cloud copy; a missing or unreachable cloud save keeps loading blocked rather than creating fresh progress. A clean journal follows the cloud copy. A dirty journal resumes only when its base revision still matches the server; otherwise the rejected device journal is backed up and the canonical cloud copy loads automatically. Load failures never create or overwrite a fresh cloud save.

Game actions and the existing two-second autosave persist to the device immediately. Cloud requests are serialized and throttled to a 15-second cadence. The local journal stores the pending operation ID and payload before sending. Newer local edits stay separate while that upload is in flight. A retry acknowledges an already-applied operation without another write; reload can recognize that acknowledgement by the persisted operation ID. Unrelated remote changes use the canonical cloud copy automatically, with a local backup of the rejected journal. SQL performs the compare-and-swap atomically.

There is no manual conflict dialog. On HTTP 409 the repository backs up local progress, loads the current cloud revision and notifies GameSession to adopt it. The session recalculates capped offline production and resumes without reloading the page. It never adds two wallets together. Completed expeditions are preserved as permanent milestones from valid device, backup and cloud copies; their maximum count is retained without combining currencies or cargo. Concurrent/offline device changes can be superseded by another device's accepted cloud revision; the rejected copy remains under the account backup key for recovery.

Legacy device import has been removed. Account saves remain isolated by user ID. The obsolete SQLite archive was removed after the Supabase migration; there is no deployed dependency on a local filesystem, Node API process or guest cookie.

## UI and deployment

The game remains a viewport-sized ocean with a compact HUD, upgrade deck and bottom navigation. Secondary systems open in a non-modal side panel; narrow screens use a scrolling bottom panel. Affordable actions use existing domain offers. Tutorial overlays, repeated explanatory hints, experimental events and usage sharing have been removed.

The account and admin routes scroll independently on short screens. Authenticated game and admin UI are loaded separately. Netlify serves the Vite `dist` bundle and rewrites application paths to `index.html`. Supabase supplies the shared managed backend. See [deployment](deployment.md).

Checks validate strict TypeScript, ESLint and formatting. The test runner and existing test files were removed as requested. Relevant browser behavior, SQL access policies and the production build were checked directly.

## Captain standings

`PlayerGateway` separates the game interface from `PlayerClient`. Opening Leaders synchronizes the current account before reading standings; the board then refreshes every 30 seconds. Only the latest request may update results, errors or loading state; delayed older responses and responses arriving after close are ignored. Names can be edited inline without an extra onboarding screen. The public board shows only confirmed accounts, with generated captain names until the owner chooses another name. Emails are never used as default nicknames.

`public.player_progress` is a bounded, sanitized projection maintained by database triggers on account confirmation and saved-game writes. Authenticated users can read it and update only their own `captain_name` column. The credits/depth/upgrade columns have no client write grant. `public.leaderboard` is a security-invoker view ranked by deepest outpost, infrastructure upgrades, research, automation, credits and a stable ID tie-break. The same projection supplies pagination and the current player's position.

This is an informational progress board, not a tamper-proof competition. The source simulation still runs in the client. A technical player can submit a modified valid save for their own account even though they cannot directly edit another account or the projected summary columns. Competitive rewards require server-authoritative commands and simulation before launch; no leaderboard rewards or verified-score claims are present here.

## Operator database browser

`AdminDatabaseGateway` exposes paged read-only queries. `/database` includes profiles, safe Auth account statuses, current saves, public progress, administrator assignments and pending invitations. Search is literal and server-side; table IDs come from a fixed allowlist. The detail inspector displays the complete selected application record without making the whole underlying database public.

The public RPC is a security-invoker wrapper around a private, restricted security-definer helper. It checks the operator-controlled administrator table, confirmed identity, ban status and an active, unexpired `auth.sessions` entry for the JWT's `session_id`. Neither user-editable metadata nor a claimed UI role can grant access. Password hashes, recovery tokens, session secrets and provider credentials are excluded. PostgreSQL system data and secrets remain in Supabase Studio, linked from the operator page.

## Redirects and API failures

Auth redirect allowlists govern where email flows return the browser; they are not a database permission boundary. The hosted project permits only exact `/` and `/reset-password` URLs on `https://abysscorp.us.ci`. There are no preview, localhost or globstar entries. `authReturnUrl` sends all email links to this primary domain; local password sign-in remains usable. An isolated development database can be configured separately when needed.

Business save conflicts use SQLSTATE `PT409` (HTTP 409). `40001` is reserved for actual serialization failures because PostgREST 14 can retry that SQLSTATE indefinitely. Idempotent operation IDs still acknowledge interrupted requests without replaying work. Account-scoped backup keys remain `abyss-corp.account.<id>.backup`.

## Smooth submarine movement

`useSubmarineMotion` updates one SVG transform through `requestAnimationFrame`, interpolating between authoritative economic snapshots. React and economy stay at their existing 10 Hz cadence; no per-frame global state is introduced. The render loop stops in hidden tabs, cleans up on unmount and respects reduced motion. Position follows the same curve in both directions and clamps at the endpoints; visual frames never award production.

## Visitor analytics and consent

`VisitorAnalytics` sends allowlisted anonymous page events to PostHog EU only after affirmative consent, only on the primary domain and the reserve `abyss-corp.netlify.app` host. It never reads the Auth token, account ID, email or game save. URL fragments, query strings and referrers are omitted. No autocapture, recordings, forms or advertisements are enabled. Optional visitor/session cookies use Secure on HTTPS and SameSite=Lax; consent is stored separately and can be withdrawn through Settings or `/privacy`.

`/analytics` is admin-only. A Netlify Function validates the Supabase access token and checks active database administrator permission before querying PostHog with a server-only read key. Fixed 7/30/90-day reports cover production page views, unique visitors and visits in UTC. The function does not accept arbitrary SQL or expose raw provider responses or API keys. Admin authorization happens before the short-lived report cache. The dashboard counts consenting visits, not all network requests.

## Expeditions

Version 7 adds an explicit expedition state. Older saves migrate with zero completed expeditions and empty deliveries; their credits, levels and timers are unchanged. After all three outposts and research reach maximum level, with a pilot hired at every outpost, three sequential cargo expeditions become available in Missions. Opting in routes pilot shipments into capped per-resource goals before selling the remainder. Manual sales still earn credits normally. Completion is claimed once and adds five percentage points to base cargo prices, without a cash payout or progress reset. The same supply logic runs in foreground and capped offline simulation.

## Admin reports

Vite development and preview proxy `/.netlify/functions` to the production Netlify function; bearer-token authorization and PostHog credentials remain on that server. An HTML fallback is rejected before JSON parsing. The chart switches between daily unique visitors, visits and page views, fills missing dates with zero, and keeps totals deduplicated over the whole period. Charts support pointer and keyboard inspection.

`admin_overview` uses the same private administrator check as the database browser. It reports account creation dates, deepest unlocked outpost, and accounts with recent saves. Recent saves are explicitly labelled as saves, not live users or visits. No search or current table page changes these aggregate numbers.
