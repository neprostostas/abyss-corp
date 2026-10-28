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
