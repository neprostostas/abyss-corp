# Architecture · Milestone 1

Read [the project specification](../ABYSS_CORP_PROJECT_SPEC.md) completely before changing the project. It remains the persistent product and engineering source of truth.

## Current boundaries

- `src/data/balance.ts`: one resource/layer, cargo value, explicit upgrade prices and durations, session cadence.
- `src/domain/game.ts`: immutable game state, elapsed-time production, purchases and derived production summaries. No React, browser, clock, or storage dependencies.
- `src/application`: one `GameSession` coordinates actions, simulation and serialized saves. `ports.ts` defines the clock and asynchronous save repository contract.
- `src/infrastructure`: monotonic browser clock and a localStorage save adapter with Zod validation.
- `src/app`: dependency composition and the browser lifecycle hook. React observes the session through `useSyncExternalStore`; no global mutable store.
- `src/ui`: existing theme and SVG scene extended into the playable screen, with reusable progress and upgrade components. Visuals reflect domain state and never award resources.

## Simulation

One submarine repeats extraction → loaded delivery → empty return. This deliberately serial cycle proves visible production without introducing parallel stages, storage capacity, or queues from Milestone 2. Cargo contains three crystals, worth five credits each. Credits arrive only when delivery finishes.

Simulation receives integer elapsed milliseconds at 10 Hz. Whole cycles are calculated arithmetically, with at most three remaining phase transitions, rather than replaying every frame. Upgrade prices/durations are table-driven; buying an upgrade preserves the fraction of completed work, rounded down to an integer millisecond. Credits are integers capped at the largest safe JavaScript integer. Display rounding never changes stored values.

Start/pause controls the basic repeating operation. Managers and unlockable automation are not implemented. Browser visibility/page lifecycle events suspend simulation and request a save. Returning to a hidden or closed session grants no offline earnings. `Clock.timestamp()` is used only as save metadata; elapsed production uses the monotonic `Clock.now()`.

## Persistence and failures

The `abyss-corp.save` localStorage key contains `{ version: 1, savedAt, game }`. No derived rates, costs, or cargo count are saved. The adapter validates both reads and writes, including level bounds and phase progress. There was no persisted schema in Milestone 0; version 1 is the first. Unknown versions are rejected, not guessed or silently migrated.

Loading failures block gameplay and all writes, leaving original data untouched. The player can retry after restoring a valid save or enabling browser storage. Write failures retain in-memory progress, show a visible error, and require an explicit retry. No automatic destructive reset exists.

Saves occur every two seconds, on successful actions, and on hide/exit. Writes are serialized with the latest pending snapshot coalesced so a slower adapter cannot overwrite a newer save with an older request. The local adapter writes synchronously inside its Promise executor for page-exit reliability. A browser crash can lose the last autosave interval. Cloud saving will need its own lifecycle and conflict policies; the current implementation supports one active game tab, with no cross-tab synchronization.

## Verification and scope

Vitest covers phase boundaries, partition invariance, long elapsed spans, integer caps, purchases, mid-cycle upgrade effects, invalid saves, serialization, hidden time, recovery, and ordered asynchronous writes. `npm run check` includes those tests, strict TypeScript, ESLint, and Prettier.

Milestone 1 includes only one resource/depth and two upgrades (five levels each). Processing, capacity constraints, depth unlocks, managers, offline income, and backend systems remain postponed. The next milestone is multi-stage production, per the specification.
