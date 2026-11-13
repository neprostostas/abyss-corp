# QA audit — 2026-10-28

## Method

Reproduce a failure before changing production code; retain a regression test for
it. Distinguish browser evidence, automated fixtures, and scenarios still requiring
a disposable account. Never reset or delete the owner's real game for testing.
README is intentionally unchanged.

## Bugs reproduced and fixed

- Connected sign-in methods did not refresh when the authenticated user changed.
  Refresh on user updates, commit provider/identity results together, and retain the
  visible list during background refresh. Canonical provider order is unchanged.
- A leaderboard request taking longer than the polling interval started additional
  synchronizations and fetches. Skip periodic polling while that effect's request
  is in flight; resume after success or failure. Stale/unmounted responses remain
  ignored. Manual refresh and page changes still start their own current request.

Both regression tests failed against the previous implementation.

## Automated evidence

`npm run check` and `npm run build` pass. Current suite: **112 tests**.

| Area                 | Coverage and limits                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gameplay             | Seeded action sequences, immutable state, partitioned time advancement, upgrade costs, locked depths, full buffers and wallet limits                  |
| Long offline session | Full four-hour cap with three max-level pilots and active expedition equals short intervals with save serialization/reloads                           |
| Missions             | Every reward is received once across reloads; full wallets cannot consume a claim or overflow                                                         |
| Expeditions          | All contracts with first-level pilots; claims/reloads cannot repeat completed contracts                                                               |
| Session lifecycle    | Hidden/resumed tabs, sleep, wall-clock changes, failed reads/writes, commands frozen during account changes                                           |
| Cloud persistence    | Offline edits, response loss, idempotent operation IDs, concurrent writes, conflict retry limit, corrupt cache retention, per-account cache isolation |
| Reset                | Epoch fences, old tabs/backups, response-loss retry, failure recovery; fixtures/PGlite only                                                           |
| Account deletion     | Authorization/revocation/storage/deletion ordering through service fixtures; no real account deleted                                                  |
| Auth/profile UI      | Registration validation, confirmation/password flows, provider linking contract, updated identity list, callback error messages; mocked transport     |
| Leaderboard          | Parent-render synchronization regression, manual refresh, periodic request overlap                                                                    |
| Touch/panels         | Completed click dismissal, cancelled gesture does not dismiss, depth selection, internal controls unmounting, no backdrop click-through               |

The suite includes **16 seeded gameplay scenarios with 250 action steps each**.
These checks do not emulate a real external email inbox or every device/browser.

## Browser evidence from this audit

- Local guest game: sell a full cargo for 60 credits, buy drill level 2 for 24,
  reload, verify level 2 and remaining 36 credits; unavailable next upgrade stays
  disabled. Only local guest progress was changed.
- Real OAuth sign-in completed to the game through **Google, GitHub, Discord,
  Microsoft, Twitch, Telegram and Steam** using the owner's existing connected
  provider sessions. Telegram required the owner's confirmation in Telegram.
- Telegram/Steam sign-ins returned to the existing main profile after the earlier
  identity transfer. No new account was created by this audit.
- Public Auth settings reachable; seven authorize endpoints returned provider
  redirects. Redirect checks alone were not counted as completed OAuth logins.
- Existing mobile viewport checks cover 320×568, 360×640, 390×844, 667×375 and
  844×390, independently scrolling panels and coarse-pointer CSS. These are
  browser checks, not physical iOS/Android certification.

OAuth was initiated from the local auth screen, with the configured callback to
production. This audits the shared provider/callback flow without signing out the
owner's production session. The resulting production game used normal save logic.

## Still to exercise with a disposable account / physical devices

- Real email signup + inbox confirmation, resend, password recovery, wrong/expired
  links, changing email, and verification on a second device.
- Full provider **linking** to a fresh account, already-owned-identity rejection,
  provider cancellation and account selection. Sign-in success is not linking proof.
- Actual photo upload/replacement, reset and deletion on a disposable account,
  including interruption/retry. Existing tests exercise service fixtures only.
- Physical iPhone/Safari and Android/Chrome: software keyboard, native file picker,
  pinch zoom, touch scroll cancellation, background suspension and install/PWA flows.
- Network throttling/disconnect and multi-tab/cloud conflict scenarios in the real
  browser. Current failure coverage is deterministic fake transport/PGlite.

Do not mark these remaining scenarios passed from the automated count alone.

## Follow-up: guest transfer and mobile lifecycle

Current automated suite: **117 tests**. Added regression coverage for a reset or
newer device save racing the asynchronous guest-claim preparation. Previously the
older snapshot could be archived for transfer after the device progress changed.
The claim now rejects that stale snapshot; a retry reads current progress.

Additional passing scenarios:

- Duplicate mobile visibility/page lifecycle transitions do not duplicate offline
  income. Background saves retain the suspension timestamp until resume.
- A slow device write followed by newer commands persists the latest world.
- Stale command handlers from a previously selected depth cannot buy, sell or
  toggle automation on the current depth.
- Browser mobile guest sale + reload preserved the observed balance (130 credits).
  Missions remained open while their contents scrolled.

At the owner's request, real email/signup/reset/delete testing is **cancelled**.
The earlier remaining-scenarios list records coverage gaps, not pending permission
or a commitment to run those destructive scenarios. No test account was created.

## Source audit and cleanup (no computer use)

- Reproduced a stale guest-transfer archive surviving a successful reset when
  `removeItem` failed. Transfer archives now carry the guest generation and cannot
  revive a previous generation. Tests cover the same and a different destination
  account, with the old archive deliberately retained.
- Removed the permanently hidden legacy depth-line element and its styles,
  superseded production-width CSS declarations, and an unused submarine motion
  state field. Import/reference scanning found no orphan TypeScript modules to
  delete. Kept deployment files, migrations, license files and used assets.
- Production dependency audit: zero reported vulnerabilities at audit time.
- No browser/device interactions were performed for this follow-up. Changes to
  CSS remove declarations already overridden by later rules; no visual redesign.

## Icon cleanup and avatar encoding follow-up (no computer use)

- Crew keeps its robot icon only in the panel heading. Research uses distinct
  trade-network and modular-storage glyphs plus a separate microscope for the
  section; removed the former decorative orbit markup.
- Removed unused robot portrait, orbit, duplicate trophy and ranking-rule styles.
  Import/reference scanning found no orphan source modules to delete.
- Fixed avatar upload metadata: canvas encoding can return PNG when WebP encoding
  is unavailable. Filename extension and upload MIME now follow the actual Blob
  type; unknown output types fail before upload. A regression test covers both
  supported encoded formats and rejects unknown formats.
- 122 automated tests, typecheck, lint, formatting and production build pass.
  Production dependency audit reports zero known vulnerabilities at audit time.
  No real photo upload, browser rendering or physical-device test was performed.

## Ocean campaign expansion (no computer use)

- Added two depths, three shared facilities, an interactive ocean map and
  confirmed prestige resets. Existing three-base expeditions keep their targets.
- Save v8 migrates v3–v7 without resetting existing accounts. Cloud prestige uses
  an authenticated, revision-checked RPC and advances the reset epoch. Local guest
  prestige advances the existing generation fence. Recovery milestones are scoped
  to prestige rank.
- Added scenarios for five-base offline production and partitioned reloads,
  infrastructure capacity settlement, duplicate taps, failed writes, lost replies,
  stale devices/backups, SQL permissions, idempotency and backgrounding while a
  prestige is pending. UI tests exercise map visits, facility upgrades and explicit
  prestige confirmation/cancellation through native clicks.
- The database migration expands leaderboard bounds and ranks prestige before
  depth. It does not rewrite or reset existing saves. Verified the live prestige
  column and authenticated-only RPC permissions after applying the migration.
- 137 automated tests pass with typecheck, lint and formatting. No real account
  prestige/reset, Computer Use or physical-device visual check was performed.

## Local cleanup and rendering optimization (2026-10-29)

- Consolidated 15 CSS files into six files organized by responsibility. Responsive
  rules are included with their components. Removed obsolete atlas, panel and
  decorative-passage styles, unused keyframes and 235 overwritten declarations.
- CSS source decreased from 8,935 to 7,938 lines. Production CSS decreased from
  140.01 kB to 125.80 kB; gzip decreased from 28.55 to 25.46 kB.
- Removed the unused Oxanium font and its preload. Preload now targets Russo One;
  Manrope remains an on-demand fallback with its license.
- All 87 source modules remain reachable from the application entry point. No
  component file was removed solely because of its age. Save migrations and
  account recovery behavior were preserved.
- Locked depth views now use the parent DepthScene transition instead of keeping
  a second transition state. Surface readiness shares one hook implementation.
- Stationary submarine rendering scheduled 60 animation frames per second before
  cleanup and zero afterward in a one-second Chromium fixture measurement. The
  motion regression test covers interpolation, completion, reduced motion,
  background/resume and unmount cleanup.
- Analytics and its chart are split out of the initial application chunk. The
  initial application JavaScript decreased from 412.23 to 407.62 kB.
- `npm run check` passes with 147 tests; production build passes. Browser overflow
  checks pass at 14 viewport sizes from 320×568 to 2560×1440, including landscape.
  Computed styles match the pre-cleanup baseline across 72 fixture views;
  71 screenshots are pixel-identical, and the remaining ocean-art compositing
  difference was visually reviewed. Fixtures use local saves and mocked
  account/report data; no physical-device
  testing or production deployment was performed.

### Extended local audit — 2026-10-29

- Full type, lint, format, test and production build checks passed (166 tests).
- Added a deterministic mixed-gameplay audit: 12 seeds × 200 steps, 12 command categories, save validation after each step and elapsed-time partition comparisons.
- Confirmed a LAN HTTP bug in WebKit: `crypto.randomUUID` is unavailable in this context. UUID v4 generation now falls back to `crypto.getRandomValues` for guest reset fencing, account write operations, analytics and avatar names. Tested 1,000 fallback UUIDs for format/uniqueness and stale-tab rejection after reset.
- Mobile browser matrix: Chrome and WebKit; 320×568, 390×844, 430×932 and 844×390; opening/closing all five drawers and tapping into a locked depth.
- Limits: browser emulation does not validate physical iOS/Android browser chrome, device gesture arbitration or real authenticated provider flows. Remote database migrations remain unapplied.

### Failure-path and recovery audit

- Added four persistent regression tests: failed guest reset under storage quota, blocked commands during account transition, credit saturation with retained unsold cargo, and reload without replaying the same offline reward.
- All 170 tests, type checking, lint, formatting and production build pass.
- Isolated Chrome/WebKit sessions over the Mac's LAN HTTP address passed reset confirmation, successful guest reset and persistence after reload. No real user save was reset.
- Collected Node test coverage to identify gaps. Coverage applies only to loaded modules; it is not a claim that all application screens or provider integrations were exercised.
- Remaining manual acceptance: physical iPhone/Android gestures and browser chrome, authenticated OAuth/email flows, real network interruptions and production schema rollout. These require devices/accounts or an approved staging deployment.

### React render optimization — 2026-10-29

Measured a 5-second foreground guest-game interval in development Chrome at 390×844, after initial load. Baseline: 56 commits, 280 registrations and 280 removals of global navigation listeners, 56 atmosphere renders and 224 upgrade-card renders reported by the React commit hook. After extraction, listener registrations/removals during the same interval are zero. Direct function-entry instrumentation confirms zero calls for the memoized HUD, atmosphere, brand, icons, depth navigation and upgrade cards during the steady interval; production components still update with simulation ticks. Strict Mode invokes active function bodies twice, so raw function-entry counts are not equated to commit counts. These are render/listener measurements, not a device FPS or battery benchmark.

Navigation moved into `useDepthNavigation`; effect events read current state without recreating listeners every production tick. HUD is isolated in `GameHud`. Memoized components and SVG models retain updates for credits, levels, research-adjusted costs, capacity, selection and palette changes. Regression tests cover affordability, max level and research-modified values.

### CSS cascade consolidation — 2026-10-29

- Changed only `game.css`, `panels.css`, `world.css` and this audit entry. Kept
  all pre-existing working-tree changes and React render optimizations intact.
- Removed overwritten declarations, empty rules and styles for the removed
  Ocean Dive action and locked-depth status. Joined compatible repeated rules
  without crossing conflicting viewport, container or accessibility conditions.
- Collected the final mobile viewport, HUD, upgrade row, dock and Sell rules into
  one 760px block. Sell retains equal columns, 12px outer margins, 10px padding
  and inset cargo outline. Width and short-height queries keep their separate
  roles so landscape behavior matches the baseline.
- The three files decreased from 6,315 to 6,034 lines (128,409 to 123,056 bytes),
  with 126 fewer declarations, 71 fewer rule blocks and 11 fewer media blocks.
- Captured baseline screenshots before editing, then completed comparison with
  the original CSS served in isolated fixture pages. Chrome and WebKit each
  cover 60 views at 320×568, 390×844, 430×932, 844×390 and 1440×900: game, five
  panels including Ocean, Base Network/Prestige, locked depth, and auxiliary
  auth/analytics/privacy screens. All element rectangles and computed properties
  match in the final comparison. Animation and transitions were disabled for
  these static comparisons; the simulation clock was fixed.
- 109 of 120 screenshots are pixel-identical. The remaining 11 differ by 1–18
  pixels per image; reviewed differences are raster/compositing noise without
  geometry changes. WebKit comparison caught a temporary 3px→5px upgrade-heading
  gap regression caused by moving a rule past a container query; corrected and
  reran both complete matrices before accepting the cleanup.
- Separate live-motion checks pass: five drawer open/close actions and locked
  depth taps in both engines at four mobile sizes; four CDP touch swipes;
  visible HUD below all five mobile drawers; inside/outside click, tab switching
  and Escape. In both engines Ocean opening/open/closing keeps the dock hidden
  with unchanged geometry.
- `npm run check` passes (177 tests, typecheck, lint, formatting); production
  build passes. Local artifacts and comparison scripts are in
  `/tmp/abyss-css-refactor/`. No physical iPhone check, deployment, push or remote
  database migration was performed. Browser emulation does not establish actual
  iOS browser-chrome or device gesture behavior.

### Physical iPhone acceptance — 2026-10-29

The user reports that the current game passes their iPhone check after CSS
consolidation. This is user-reported acceptance, separate from the automated
Chrome/WebKit checks above; the device model and iOS version were not recorded.
No deployment or remote migration was performed as part of this acceptance.

### Release preparation — 2026-10-29

Fresh full check passes with 177 tests, strict typecheck, lint and formatting;
production build passes. User-reported iPhone acceptance is recorded above.
The three research/prestige migrations were applied before publishing v0.3.0.
Release includes the existing mobile/Ocean cleanup and React render isolation.

### Local progression balance — 2026-10-29

Compared 18 fresh-run strategy/rank scenarios against v0.3.0; see
[balance audit](balance-audit.md) and its raw JSON. Pilot training now adds an
on-duty additive base-price bonus; prestige credit growth is 25% instead of 60%.
One new regression checks actual trained-pilot income, off-duty pricing and
continuous/chunked offline equivalence. Existing SQL integration tests run the new
migration in isolated PGlite and check the revised rank-one rejection boundary.
The migration is local and has not been applied to production. No push/deployment
was performed for these balance changes.

Chrome and WebKit checks at 320×568, 390×844 and 844×390 pass: training shows the
new bonus, switching the pilot off removes it, no page overflow or runtime errors.
Screenshots were captured after the drawer transition and visually inspected.

### First-run clarity review — 2026-10-29

See [first-run review](first-run-review.md) for the ranked findings and method.
Exercised the fresh zero-credit sell/upgrade/pilot flow through UI buttons in
Chrome and WebKit using accelerated browser time. Inspected five reachable ROI
checkpoints in both engines, across the scene and four panel views (50 captures).
Confirmed the stale 60% Prestige explanation and replaced it with the percentage
derived from the current cost-growth configuration; both browser views now show
25%. Full check passes with 178 tests; production build passes. The optional
`--walkthrough` flag in the balance script records reproducible purchases,
checkpoint saves and hint text. No push, deployment or remote migration occurred.

### Local end-of-run goals and checklist — 2026-10-29

Replaced the fully-upgraded-base dead end with remaining run-category/depth goals,
then remaining prestige credits, sell-to-qualify, readiness or maximum-rank status.
Urgent production, pickup and reward hints keep their precedence. Checklist labels
explicitly count maxed upgrades, roles, research paths and facilities. The existing
numeric fractions now resist wrapping at 320px; no completion rules were changed.

Three new hint regression cases cover other-depth production/crew, unaffordable
research/network goals, credit deficits at different ranks, sellable cargo,
readiness, maximum rank and paused-production priority. Chrome/WebKit each check
both 20:00 and 21:46 reachable states at 320×568, 390×844 and 844×390, including
screenshots and fit checks. No push, deployment or remote migration was performed.

Full check passes with 181 tests, typecheck, lint and formatting; production build
passes. Final mobile screenshots confirm unbroken numeric fractions at 320px.

### Local optional discount research — 2026-10-29

Prestige now requires only maxed Trade and Storage research. The four research
paths remain available; Engineering and Surveying are optional. UI labels and
hints reflect this distinction and avoid expired discount purchases. Added a new
local SQL migration without editing published migration history or touching the
remote database. Existing save version and other prestige gates are unchanged.

184 tests pass with typecheck, lint and formatting. Isolated PGlite tests accept
prestige with optional research at zero, reject either required path below max,
and retain checks for ownership, revisions and idempotent replay. Chrome/WebKit
at 320×568, 390×844 and 844×390 verify 2/2 research eligibility, optional-card labels,
ready hints, no checklist overflow and no runtime errors. In each engine an
isolated 390×844 guest test confirms prestige, rank increment and reset to one
base with optional research at zero. Mobile screenshots were visually inspected.
The 18-scenario simulation and results are documented in prestige-research-review.md.
No push, deployment or remote migration was performed.

### Local late-depth objectives — 2026-10-29

Added once-per-run missions for opening 900 m (+300 credits) and 1,900 m (+1,000),
plus appended contracts for 45 Titanium and then 24 Titanium/36 Lumens. Original
mission definitions and first-three contract indices, targets and cargo remain
unchanged. The maximum expedition run bonus is now +25%. Prestige requires nine
mission claims and five expeditions; its matching SQL migration is local only.

Old saves with completed count 3 retain that count and bonus, then wait for the
900 m source. New optional delivered keys validate target bounds and source
availability. Regression tests cover old active third-contract reload/completion,
new source routing and pilot readiness, offline partition/reload equivalence,
locked-source/cargo bounds, one-time rewards and late-mission visibility outside
collapsed claim history. PGlite checks the updated authenticated prestige gate,
including a missing new mission and unfinished fifth expedition.

191 tests, typecheck, lint, formatting and production build pass. Chrome/WebKit
checks cover five contract states at three mobile sizes (30 combinations), with
screenshots inspected at 320px. The same 18 strategy/rank scenarios finish; the
rank-zero ROI run ends around 23:40, and its final expedition ends at 21:37 after
opening 1,900 m at 19:28. See late-objectives.md for measurement limits. No push,
deployment or remote migration was performed.
