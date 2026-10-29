# Architecture

## Boundaries

- `src/data`: resource, depth, production, automation and research configuration.
- `src/domain`: immutable production, shared wallet, depth unlocks, research and mission rules. It has no React, network, storage or authentication dependencies.
- `src/application/GameSession.ts`: elapsed-time simulation, commands, offline reports and serialized local saves through `SaveRepository`.
- `src/application/accountPorts.ts`: account save synchronization status and canonical cloud update contract.
- `src/infrastructure/supabase`: the configured Supabase client, generated public database types and account save repository.
- `src/infrastructure/persistence`: strict runtime save validation, explicit migration from versions 3–7 into version 8.
- `src/app`: authentication lifecycle, one game runtime per user ID, cloud sync scheduling and route selection.
- `src/ui`: the ocean scene, upgrades, compact equipment panels, account forms and read-only database browser.

Before saving, GameSession advances production to the captured time so a save cannot consume elapsed time without its corresponding output. Long foreground gaps compare both the monotonic and wall clocks, covering [platforms where the monotonic clock pauses during sleep](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now#ticking_during_sleep). The same four-hour offline cap and suspension timestamp prevent duplicate awards on resume or reload. Short pauses in the monotonic clock also use wall time when the difference exceeds one second; smaller sampling jitter continues to use monotonic time.

The existing bounded extraction → transport → processing → storage/sale engine is unchanged. Production stops at full buffers without losing cargo. Unselected running outposts continue producing; credits are shared. Automation and capped four-hour offline simulation use the same domain engine.

## Authentication

Supabase Auth owns passwords, verification, reset emails, sessions and token refresh. The SPA uses the provider's supported browser session flow; recovery redirects to `/reset-password`. The application never stores passwords in its database. Only a publishable key reaches the browser. PostgreSQL derives ownership from `auth.uid()`.

Authentication changes remount the game by user ID. An old runtime can write only its own local journal. The cloud write RPC also compares the requested account ID to the JWT subject, so a late request from an old runtime cannot upload its progress into a newly signed-in account.

## Saving and conflicts

The account repository implements `SaveRepository`. Each local journal is stored under `abyss-corp.account.<user-id>` with the save, acknowledged server revision and dirty marker. Domain saves keep version 8; account identity and server revision belong to the storage envelope.

Loading reads the server before enabling gameplay. An invalid device journal is retained under the account `.corrupt` key and can be replaced only by a valid cloud copy. A missing or unreachable cloud row also blocks loading when a previously acknowledged journal or a recovery backup exists. Only a genuine first-upload draft at revision zero can resume without a server row; existing progress is never silently replaced by a new game. A clean journal follows the cloud copy. A dirty journal resumes only when its base revision still matches the server; otherwise the rejected device journal is backed up and the canonical cloud copy loads automatically. Load failures never create or overwrite a fresh cloud save.

Game actions and the existing two-second autosave persist to the device immediately. Cloud requests are serialized and throttled to a 15-second cadence. The local journal stores the pending operation ID and payload before sending. Newer local edits stay separate while that upload is in flight. A retry acknowledges an already-applied operation without another write; reload can recognize that acknowledgement by the persisted operation ID. Unrelated remote changes use the canonical cloud copy automatically, with a local backup of the rejected journal. SQL performs the compare-and-swap atomically.

There is no manual conflict dialog. On HTTP 409 the repository backs up local progress, loads the current cloud revision and notifies GameSession to adopt it. The session recalculates capped offline production and resumes without reloading the page. It never adds two wallets together. Completed expeditions are preserved as permanent milestones from valid device, backup and cloud copies; their maximum count is retained without combining currencies or cargo. Concurrent/offline device changes can be superseded by another device's accepted cloud revision; the rejected copy remains under the account backup key for recovery.

Legacy device import has been removed. Account saves remain isolated by user ID. The obsolete SQLite archive was removed after the Supabase migration; there is no deployed dependency on a local filesystem, Node API process or guest cookie.

## UI and deployment

The game remains a viewport-sized ocean with a compact HUD, upgrade deck and bottom navigation. Secondary systems open in a non-modal side panel; narrow and short screens use fixed panels with independently scrolling content. Affordable actions use existing domain offers. Tutorial overlays, repeated explanatory hints, experimental events and usage sharing have been removed.

The account and admin routes scroll independently on short screens. Authenticated game and admin UI are loaded separately. Netlify serves the Vite `dist` bundle and rewrites application paths to `index.html`. Supabase supplies the shared managed backend. See [deployment](deployment.md).

`npm run check` validates strict TypeScript (including tests), ESLint, formatting and the regression suite. Tests use the stable Node.js test runner with `tsx` for TypeScript, fake clocks, device storage and a mocked transport. They cover seeded action sequences, elapsed-time partitioning, save validation, offline limits, interrupted writes, expedition conflicts, missing cloud rows, account journal isolation and Unicode names. They make no requests to player databases or email services. Netlify and the container build run these checks before publishing. SQL policies and real browser layout require separate integration verification.

## Styles and scene ownership

Styles are imported once, before rendering, in this order:

- `theme.css`: typography, shared controls, progress bars and accessibility.
- `game.css`: viewport layout, HUD, production, upgrades and bottom navigation.
- `panels.css`: drawers, research, missions, crew and base management.
- `account.css`: authentication, profile, standings and database tools.
- `analytics.css`: reports, charts, cookie preferences and privacy.
- `world.css`: ocean art, depth navigation and scene transitions.

Responsive rules live with their owning components. Preserve the import order;
shared selectors still participate in the CSS cascade. Avoid adding separate
visual override files when changing an existing component.

`DepthScene` owns transitions between established and locked depths.
`LockedDepthScene` presents the unlock gate without a second transition state.
`useSurfaceReady` handles the surface reveal delay for the HUD and panel controls.
Russo One is the preloaded interface font; Manrope is a fallback loaded on demand.

## Captain standings

`PlayerGateway` separates the game interface from `PlayerClient`. Opening Leaders synchronizes the current account before reading standings; the board then refreshes every 30 seconds. Only the latest request may update results, errors or loading state; delayed older responses and responses arriving after close are ignored. Names can be edited in Profile or Leaders. `ProfileGate` requires a chosen nickname before account gameplay; legacy generated names prompt once, existing chosen names are preserved, and email signup carries the player’s requested name in auth metadata. A metadata marker distinguishes an intentionally chosen default-looking name. The UI and player client share the database-compatible 3–24 Unicode code-point limit, while avatars display a complete initial grapheme. The public board shows only confirmed accounts, with legacy generated captain names until their owner next signs in and completes onboarding. Emails are never used as default nicknames.

`public.player_progress` is a bounded, sanitized projection maintained by database triggers on account confirmation and saved-game writes. Authenticated users can read it and update only their own `captain_name` column. The credits/depth/upgrade columns have no client write grant. `public.leaderboard` is a security-invoker view ranked by deepest outpost, infrastructure upgrades, research, automation, credits and a stable ID tie-break. The same projection supplies pagination and the current player's position.

This is an informational progress board, not a tamper-proof competition. The source simulation still runs in the client. A technical player can submit a modified valid save for their own account even though they cannot directly edit another account or the projected summary columns. Competitive rewards require server-authoritative commands and simulation before launch; no leaderboard rewards or verified-score claims are present here.

## Operator database browser

`AdminDatabaseGateway` exposes paged read-only queries. `/database` includes profiles, safe Auth account statuses, current saves, public progress, administrator assignments and pending invitations. Search is literal and server-side; table IDs come from a fixed allowlist. The detail inspector displays the complete selected application record without making the whole underlying database public.

The public RPC is a security-invoker wrapper around a private, restricted security-definer helper. It checks the operator-controlled administrator table, confirmed identity, ban status and an active, unexpired `auth.sessions` entry for the JWT's `session_id`. Neither user-editable metadata nor a claimed UI role can grant access. Password hashes, recovery tokens, session secrets and provider credentials are excluded. PostgreSQL system data and secrets remain in Supabase Studio, linked from the operator page.

## Redirects and API failures

Auth redirect allowlists govern where email flows return the browser; they are not a database permission boundary. The hosted project permits only exact `/` and `/reset-password` URLs on `https://abysscorp.us.ci`. There are no preview, localhost or globstar entries. `authReturnUrl` sends all email links to this primary domain; local password sign-in remains usable. An isolated development database can be configured separately when needed.

Business save conflicts use SQLSTATE `PT409` (HTTP 409). `40001` is reserved for actual serialization failures because PostgREST 14 can retry that SQLSTATE indefinitely. Idempotent operation IDs still acknowledge interrupted requests without replaying work. Account-scoped backup keys remain `abyss-corp.account.<id>.backup`.

## Smooth submarine movement

`useSubmarineMotion` updates one SVG transform through `requestAnimationFrame`, interpolating between authoritative economic snapshots. React and economy stay at their existing 10 Hz cadence; no per-frame global state is introduced. The render loop runs only while the submarine interpolates between different positions. It stops after arrival, during stationary production, in hidden tabs and for reduced motion, and cleans up on unmount. Position follows the same curve in both directions and clamps at the endpoints; visual frames never award production.

## Visitor analytics and consent

`VisitorAnalytics` sends allowlisted anonymous page events to PostHog EU only after affirmative consent, only on the primary domain and the reserve `abyss-corp.netlify.app` host. It never reads the Auth token, account ID, email or game save. URL fragments, query strings and referrers are omitted. No autocapture, recordings, forms or advertisements are enabled. Optional visitor/session cookies use Secure on HTTPS and SameSite=Lax; consent is stored separately and can be withdrawn through Settings or `/privacy`.

`/analytics` is admin-only. A Netlify Function validates the Supabase access token and checks active database administrator permission before querying PostHog with a server-only read key. Fixed 7/30/90-day reports cover production page views, unique visitors and visits in UTC. The function does not accept arbitrary SQL or expose raw provider responses or API keys. Admin authorization happens before the short-lived report cache. The dashboard counts consenting visits, not all network requests.

## Expeditions

Version 7 adds an explicit expedition state. Older saves migrate with zero completed expeditions and empty deliveries; their credits, levels and timers are unchanged. After all three outposts and research reach maximum level, with a pilot hired at every outpost, three sequential cargo expeditions become available in Missions. Opting in routes pilot shipments into capped per-resource goals before selling the remainder. Manual sales still earn credits normally. Completion is claimed once and adds five percentage points to base cargo prices, without a cash payout or progress reset. The same supply logic runs in foreground and capped offline simulation.

## Admin reports

Vite development and preview proxy `/.netlify/functions` to the production Netlify function; bearer-token authorization and PostHog credentials remain on that server. An HTML fallback is rejected before JSON parsing. The chart switches between daily unique visitors, visits and page views, fills missing dates with zero, and keeps totals deduplicated over the whole period. Charts support pointer and keyboard inspection.

`admin_overview` uses the same private administrator check as the database browser. It reports account creation dates, deepest unlocked outpost, and accounts with recent saves. Recent saves are explicitly labelled as saves, not live users or visits. No search or current table page changes these aggregate numbers.

## Quick play and social profiles

`GuestSaveRepository` stores validated versioned saves in `abyss-corp.guest.v1`, independently of account journals. Session storage remembers guest mode across reloads in the same tab. The same GameSession handles simulation, offline caps and device failures. Guest gameplay does not call account save or leaderboard endpoints.

When an account has neither cloud progress nor an account journal/backup, AccountSaveRepository may seed it from guest progress. The transfer snapshot is bound to the first user ID in `abyss-corp.guest.v1.transfer` before upload; retries use that snapshot, other users cannot claim it, and the source guest save is kept. Existing cloud progress always takes priority. Storage is origin-specific; transfer requires signing in on the same primary domain and browser as guest play. Clearing browser data removes guest progress.

Social buttons use the public Supabase Auth settings endpoint and appear only for enabled supported providers. The catalog includes Google, Discord, GitHub, Microsoft (azure), X (x), Twitch, LinkedIn OIDC, Telegram and Steam custom providers, plus the deferred Facebook option. Apple has been removed. Google stays prominent; other enabled providers appear in a native collapsible list with labelled local SVG icons. The deployment-reviewed public/auth-providers.json manifest supplements GoTrue settings for custom providers and X when absent from the settings response. It starts empty; adding a provider there does not configure or authenticate its backend. Telegram and Steam must not be exposed until their backend setup and email-less account onboarding are complete. OAuth returns to the primary domain; no provider secrets live in the frontend. A provider’s name and HTTPS avatar are shown in the private profile; missing/broken images use a grapheme initial. Provider identity names never become public nicknames automatically. Ordinary email sign-in does not supply a profile photo. Microsoft requests the required email scope; provider scopes avoid repository, message, channel management and bot permissions.

Account UI regressions mount React in JSDOM under the Node test runner; they exercise forms, onboarding and failed avatar loading without launching a browser or calling live auth. Development/test Node versions follow JSDOM requirements in package.json.

Research includes trade, storage, engineering (5% production upgrade discount per level), and surveying (4% depth unlock discount per level). Each path has five levels; later levels retain the 900 m and 1900 m requirements. Expedition eligibility continues to require only the original trade/storage paths, so existing expedition unlocks do not regress.

Each outpost can hire a quartermaster (+4 slots per level) and trade officer (+15% sale value per level), both capped at three levels. Their optional `specialists` state and optional new research keys extend v8 saves; missing keys behave as level zero. Bonuses feed the shared production configuration for manual, automatic, and offline simulation. The research leaderboard projection migration expands the total to 20.

Prestige now requires all five bases, 25,000 credits, max production and crew at every base, all four research paths, all shared facilities, all seven claimed missions and all three claimed expeditions. `getPrestigeOffer` exposes category counts for the Prestige checklist. The local `prestige_completion` SQL migration applies the same requirements to the persisted run before the existing atomic reset.

Ocean is a separate shortcut above depth navigation; the footer holds Research, Missions, Base and Leaders. Ocean contains only centered region cards. Guest Leaders uses its own invitation instead of reusing profile/reset controls.

Prestige's credit goal scales by (8/5)^rank, rounded up to the next 1,000 credits: 25k, 40k, 64k, 103k. Exact integer arithmetic avoids floating point rounding differences with Postgres numeric. The +20% sale bonus stays additive. Full completion is required on every run, and server epoch/revision checks still prevent duplicate resets.
