# Ocean campaign

## First expansion

Five sequential depths: Crystal shallows (50 m), Golden trench (180 m), Pearl caverns (420 m), Thermal vents (900 m, titanium), Midnight rift (1,900 m, lumens). Existing resources, costs and timings for the first three depths are unchanged.

Ocean contains Map, Network and Prestige. The map visits or establishes bases. The in-game rail shows three nearby depths to keep production controls clear. The mobile dock has five equal columns and native click targets; no pointer-down purchases.

## Rules and boundaries

- Content and balance live in `src/data/layers.ts`, `resources.ts` and `campaign.ts`.
- `domain/campaign.ts` provides typed campaign state and eligibility. Pure mutations live in `domain/world.ts`. React dispatches session commands; it does not change wallets directly.
- Facilities unlock at the trench and affect every current and future outpost. Cargo depot adds eight slots per level, Trade hub adds 10% sale value per level, Sonar array reduces future depth costs by 10% per level. Each has three levels. Capacity changes settle already-completed work without advancing simulation time.
- Prestige requires the Midnight rift and 25,000 unspent credits. A confirmed prestige resets credits, depths, machines, crew, research, missions, expedition rewards and facilities. It retains the profile and grants one prestige rank, worth +20 percentage points of sale value. Rank is capped at 25. Bonuses are additive with trade research, the hub and expedition bonuses, then rounded down to whole credits.
- First-three-base expeditions remain a separate campaign. New depths do not change accepted contracts or contribute unrelated cargo. Their sale bonus lasts for the current prestige run.
- Leaders sort by prestige first, then existing depth/upgrade criteria. Prestige appears as P1, P2, etc. Names and sign-in methods are unchanged.

## Persistence and rollout

Save v8 adds `world.campaign`. Versions 3–7 migrate to rank zero with no facilities, preserving existing production, credits, research and expedition state. Legacy envelopes cannot carry new campaign content. New saves validate facility levels, prestige rank, sequential unlocks and production bounds.

Apply `20261028000100_ocean_campaign.sql` before deploying the frontend. It accepts v6/v7/v8 envelopes during rollout, expands bounded leaderboard projection to five bases and adds the prestige RPC. No account saves are rewritten by the migration.

`GameSession.prestige` freezes commands, saves the current run and invokes the repository's prestige operation. Account repositories upload the eligible run, then the RPC locks its row and checks owner, active session, epoch, revision, rank and eligibility before atomically advancing the reset epoch. Retries reuse the operation ID. Stale devices cannot restore the old run; expedition recovery only merges milestones within the same prestige rank. Guest prestige advances the existing local generation fence.

An already-open pre-v8 client cannot read v8 saves and must reload. This protects new progress from an older parser. Profile Start a new game remains a complete reset, including prestige.

## Verification

Automated coverage includes sequential unlocks, bounded purchases, capacity settlement, five-base time partitioning and offline production, old-save migration, prestige eligibility and reset policy, double clicks, persistence failures, lost responses, stale backups, cross-device revision/epoch conflicts, native UI actions, and SQL permissions/idempotency through local PostgreSQL (PGlite).

No real player's run is reset for testing. No Computer Use or physical-device visual verification is performed in this pass. Narrow layouts use explicit grid constraints, wrapping text, scrolling panel content and controls of at least 44 px.
