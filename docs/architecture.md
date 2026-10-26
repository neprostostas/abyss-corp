# Architecture · Milestone 2

Read [the project specification](../ABYSS_CORP_PROJECT_SPEC.md) completely before changes. It remains the product and engineering source of truth.

## Boundaries

- `src/data/balance.ts`: one crystal resource/layer, batch size, refined value, upgrade tables and session cadence. Upgrade values are durations in milliseconds, except storage values, which are slots in each buffer.
- `src/domain/game.ts`: immutable state, elapsed-time simulation, upgrades, sales and derived production summaries. No React, browser, storage or clock dependencies.
- `src/application`: `GameSession` coordinates commands and serialized saves; `ports.ts` defines the clock and save repository contract.
- `src/infrastructure`: monotonic browser clock, localStorage adapter, runtime save validation and explicit migration.
- `src/app`: composition and lifecycle. React observes the session through `useSyncExternalStore`.
- `src/ui`: reusable progress/upgrade panels, production status and the extended SVG scene. Animation never awards resources.

## Production

The existing submarine still performs extraction → loaded delivery → empty return. Delivery now deposits three raw crystals instead of earning money. The independent refinery consumes three raw crystals at the start of a batch, spends time refining them, and deposits three refined crystals into storage. A player-triggered sale exchanges refined crystals for eight credits each.

Raw intake and refined storage each have the configured capacity. An active refinery batch and submarine cargo occupy their own fixed three-crystal slots. When the warehouse cannot accept a complete batch, the refinery retains its finished batch. Raw intake then fills, and a loaded submarine waits at the dock until its complete cargo fits. Nothing is discarded. Sale or storage expansion releases completed work immediately; no blocked time becomes free production.

All four systems have five explicit levels. Storage upgrades expand both buffers; machine upgrades preserve the fraction of current work, rounded down to a millisecond. The bottleneck indicator identifies full output storage first, otherwise compares refinery capacity against the serial extraction/transport supply rate. Displayed income is potential throughput **with regular manual sales**, not passive credit income.

## Time and determinism

The application samples elapsed integer milliseconds at 10 Hz. Domain simulation jumps between machine completion events instead of replaying frames. Simultaneous events resolve in a fixed order: refinery output, dock unloading, extraction/return completion, then refinery input. With no sales during an elapsed-time call, finite buffers eventually block both stages, bounding long-duration computation. Tests compare large elapsed calls against partitioned ticks.

Start/pause and hidden-tab suspension remain unchanged. No offline income is granted. The monotonic clock drives simulation; wall time is save metadata only. Values remain integers; selling near the safe-integer credit limit leaves unsellable crystals in storage rather than discarding them.

## Save version 2

The `abyss-corp.save` key contains `{ version: 2, savedAt, game }`, including raw/refined counts, nullable refinery progress, and four upgrade levels. Derived rates, capacity, prices and cargo counts are not persisted.

Version 1 migrates explicitly: credits, existing levels, running state and submarine phase/progress are preserved; refinery and storage start at level one with empty buffers. A delivering submarine retains its cargo. A returning submarine was already paid in version 1 and receives no duplicate cargo or credits. Legacy duration validation is frozen to the version 1 balance.

Reading does not overwrite the original. Before the first version 2 write replaces version 1, the adapter saves the original under `abyss-corp.save.v1-backup`. If that backup fails, the original remains intact and the write fails visibly. Unknown versions, invalid state and capacity overflow are rejected. No reset/delete action exists.

Autosave remains every two seconds, on actions, and on hide/exit. Loading failures prevent writes; write failures retain in-memory state and expose retry. Writes are serialized/coalesced. The local adapter writes synchronously inside a Promise for page-exit reliability. A crash can lose the latest unsaved interval. One active tab is supported; cloud/cross-tab synchronization is not implemented.

## Verification and next scope

`npm run check` runs strict TypeScript, ESLint, Vitest and formatting. Tests cover the production chain, conservation of material, bounded buffers, exact completion events, blocking/recovery, purchases, sales, precision limits, save migration/backup failures, hidden time and ordered writes.

Milestone 2 stops at one resource and depth with a parallel refinery, storage, manual sale, and visible bottlenecks. The next milestone is **Milestone 3 — Depth progression**. Managers, offline income and backend remain postponed.
