# Architecture · Milestone 7

Read [the project specification](../ABYSS_CORP_PROJECT_SPEC.md) completely before changes. It remains the product and engineering source of truth.

## Boundaries

- `src/data/balance.ts`: upgrade tables and session cadence. Upgrade values are machine durations in milliseconds or storage slots.
- `src/data/resources.ts` and `src/data/layers.ts`: three resource definitions, depth order, unlock prices, production multipliers and visual metadata.
- `src/domain/world.ts`: shared wallet, independent layer state, sequential unlocks, selection and simulation of all unlocked outposts. The existing production engine accepts a layer configuration.
- `src/data/progression.ts`: research definitions, costs, bonuses, mission requirements and rewards.
- `src/domain/progression.ts`: initial progression, research offers, effective production configuration and mission progress queries. It imports world types only, avoiding runtime cycles.
- `src/domain/game.ts`: immutable state, elapsed-time simulation, upgrades, sales and derived production summaries. No React, browser, storage or clock dependencies.
- `src/application`: `GameSession` coordinates commands and serialized saves; `ports.ts` defines the clock and save repository contract.
- `src/infrastructure`: monotonic browser clock, localStorage adapter, runtime save validation and explicit migration.
- `src/app`: composition and lifecycle. React observes the session through `useSyncExternalStore`.
- `src/ui`: reusable progress/upgrade panels, production status and the extended SVG scene. Animation never awards resources.

## Production

The existing submarine still performs extraction → loaded delivery → empty return. Delivery now deposits three raw crystals instead of earning money. The independent refinery consumes three raw crystals at the start of a batch, spends time refining them, and deposits three refined crystals into storage. The base price is eight credits per crystal, increased by corporate trade research.

Raw intake and refined storage each have the configured capacity. An active refinery batch and submarine cargo occupy their own fixed three-crystal slots. When the warehouse cannot accept a complete batch, the refinery retains its finished batch. Raw intake then fills, and a loaded submarine waits at the dock until its complete cargo fits. Nothing is discarded. Sale or storage expansion releases completed work immediately; no blocked time becomes free production.

All four systems have five explicit levels. Storage upgrades expand both buffers; machine upgrades preserve the fraction of current work, rounded down to a millisecond. The bottleneck indicator identifies full output storage first, otherwise compares refinery capacity against the serial extraction/transport supply rate. Displayed income is potential throughput **with regular sales**; a sales module turns ready stock into credits on its own timer.

## Time and determinism

The application samples elapsed integer milliseconds at 10 Hz. Domain simulation jumps between machine completion events instead of replaying frames. Simultaneous events resolve in a fixed order: refinery output, dock unloading, extraction/return completion, then refinery input. With no sales during an elapsed-time call, finite buffers eventually block both stages, bounding long-duration computation. Automation partitions elapsed time at sale boundaries and delegates machine progress to this same engine.

All started outposts advance, including unselected depths. The monotonic clock drives foreground simulation. Persisted wall time drives capped offline simulation on loading or resuming a hidden tab. Negative elapsed time becomes zero; each absence is capped at four hours. Foreground timer gaps over 30 seconds also use this cap to handle device sleep. Paused outposts do not advance. Values remain integers; selling near the safe-integer credit limit leaves unsellable crystals in storage rather than discarding them.

## Save version 6

The `abyss-corp.save` key contains `{ version: 6, savedAt, world }`. The world stores one corporate credit balance, the selected layer and independent production state for each unlocked layer. Layer state omits credits to prevent duplicate wallets. Optional automation state stores a purchased module level, enabled flag and elapsed sale timer; absence means no module. Corporate progression stores two research levels, unique claimed mission IDs and unique timed-event claim IDs. Derived rates, capacity, prices and cargo counts are not persisted.

Version 1 and 2 saves migrate explicitly into Crystal shallows, preserving the existing wallet and production. Version 3 keeps its entire world and starts without modules. Version 4 preserves installed modules. Version 5 preserves research and missions. All loaded saves normalize to version 6 with missing progression fields initialized for older versions; the repository contract accepts versions 3 and 4 for migration compatibility. Versions 5 and 6 require explicit progression state; version 6 also requires event claim history. Version 1 adds empty processing/storage state; returning cargo was already paid and receives no duplicate reward. Runtime validation requires sequential unlocks, an unlocked selected depth, valid machine progress and bounded stock using each layer's configuration.

Reading does not overwrite the original. Before the first version 6 write replaces an older save, the adapter stores the original under `abyss-corp.save.v1-backup`, `abyss-corp.save.v2-backup`, `abyss-corp.save.v3-backup`, `abyss-corp.save.v4-backup` or `abyss-corp.save.v5-backup`. Backup failure prevents replacement. Invalid or unknown saves prevent loading and writes.

Autosave runs every two seconds, on actions and on hide/exit. Writes are serialized/coalesced. Write failures retain in-memory state and expose retry. The local adapter writes synchronously inside a Promise for page-exit reliability. A crash can lose the latest unsaved interval. One active tab is supported.

## Depth progression

Crystal shallows (50 m) starts unlocked. Golden trench (180 m) costs 250 credits; Pearl caverns (420 m) costs 900 credits and requires Golden trench. Unlocking spends shared credits, selects the new outpost and creates paused level-one production. Each depth retains its own pause state, stock and upgrade levels.

Gold and pearls use the same bounded production engine with distinct values, duration and upgrade cost multipliers. Navigation shows running/paused state, full storage, saleable inventory, unlock requirements and credit progress. Scene colors, formations and resource glyphs follow the selected depth.

## Automation and offline production

`src/data/automation.ts` owns three sale intervals (12s, 6s, 2s), purchase costs (120, 240, 480 credits before the depth multiplier) and the four-hour offline cap. World commands buy/upgrade a module with shared credits and toggle it without changing its timer. Upgrade scales timer progress proportionally. Module timers only advance when both the outpost and module are enabled.

For each automated layer, world simulation advances production to the next sale boundary, sells ready stock through the existing safe-integer sale rules, then continues. Production completion resolves before a sale at the same instant. Empty sales reset the timer without creating credits. Manual sales remain available. All sales release blocked batches through the normal production engine. Without automation, bounded production stops at full storage as before.

`GameSession` applies the same world simulation to offline elapsed time. Loading/resuming immediately saves the resulting world and consumed timestamp, independent of dismissing the offline report. Hiding records one suspension timestamp; repeated hide/exit events preserve it. The report shows applied time, whether the cap was reached and automatic sales earnings. Unsold inventory remains in layer storage. Local wall time is not server-authoritative; multi-tab synchronization remains outside scope.

## Corporate research and missions

Progression is optional on the domain world for legacy callers; `getProgression` supplies zero research and no claims. New worlds and version 5 saves store it explicitly. Research commands spend the shared wallet and increase one bounded level. Trade research adds 25 percentage points to base sale values per level, rounding down once per unit. Storage research adds three slots per level to each buffer. The effective configuration comes from `getLayerProduction`; foreground simulation, automation, offline simulation, upgrades, save capacity validation and all displayed rates/prices use it. Newly unlocked depths inherit research automatically.

Storage research settles completed batches and blocked deliveries immediately through `settleProduction`, without awarding elapsed production time. It never changes machine durations or current timer fractions.

Missions derive progress from monotonically increasing state: production upgrade levels above one, installed modules, unlocked outposts and completed research levels. Migrated progress therefore counts without invented lifetime statistics. Claims require a completed requirement, an unclaimed ID and enough safe-integer headroom for the full reward. The command adds credits and records the claim atomically, then the session saves through the existing command path. Repeated clicks cannot pay twice. Duplicate or unknown claim IDs and out-of-range research levels are rejected at the save boundary.

## Development preference and next scope

Do not add or run tests or invoke `npm run check`, per the user's current instruction. Existing tests remain in the repository. `npm run build` compiles TypeScript and bundles the app without running tests.

Milestone 5 adds two corporate research branches with permanent network-wide bonuses and seven one-time reward missions. Prestige/reset is outside this milestone. Milestone 6 adds a local server backup boundary, guest sessions, SQLite persistence and explicit revision conflicts. See [backend design](backend.md) for API contracts, authentication design and deployment limits. Milestone 7 adds the live bulletin, timed events, opt-in analytics and a presentation experiment; payments and push delivery remain outside scope.

## Server boundary

The local save repository remains responsible for autosave and legacy migrations. Optional `backup` supports safe server restore. `CloudSaveGateway` is a separate application port; its HTTP adapter communicates through the frontend's same-origin `/api` proxy. `SaveSync` exposes backup status independently of game session/save status, so network errors do not stop play. Application and domain code do not import the concrete API client.

The server uses the same save schema, validates player ownership through opaque guest sessions and atomically compares revisions before replacing a snapshot in SQLite. Server revision, identity and update timestamps belong to the API envelope, independent of the current game save version. Snapshot history and a local pre-restore backup preserve recovery paths. No state merge or last-write-wins behavior is implemented.

## Live game boundary

`src/data/liveOps.ts` owns strict shared configuration and telemetry schemas. `src/domain/liveEvents.ts` owns timed grant eligibility and immutable claims. `LiveOpsGateway` defines config loading and consented batch delivery; its HTTP adapter has no access to the save repository. The `LiveOps` service owns server time anchoring, refresh state, consent, bounded telemetry queues and stable presentation cohorts. GameSession observes successful commands through an optional callback, keeping telemetry out of production simulation and the domain.

The server reads validated operator config and ingests only allowlisted telemetry into SQLite schema version 2. Event rewards are save version 6 claim markers and retain the same client-trust limitations as the rest of the economy. See [live-ops design](live-ops.md) for consent, retention, scheduling and operator controls.

## Game-first visual pass

`GameScreen` is a viewport-sized board with four UI rows: HUD, ocean, upgrade deck and menu dock. Its local state owns only the open dialog, selected upgrade and temporary sale feedback. Economy and all progression commands remain in GameSession. `GameDialog` uses the native modal dialog lifecycle, including Escape/focus behavior and a guard against StrictMode's effect replay close event.

`WorldModels.tsx` provides reusable vector machinery and reef components. `OutpostIllustration` composes the biome, interactive machinery, mineral deposits and animated submarine from current production state. Stock indicators, machine levels and progress remain derived from the existing domain. No raster downloads, rendering engine or save migration are required for the art pass. Secondary panels use concise labels and values; privacy and conflict explanations remain available in Settings.
