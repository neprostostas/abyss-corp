# Progression balance audit — 2026-10-29

Run `node --import tsx scripts/balance-audit.mjs` from the repository root.
Raw baseline/current measurements are in [balance-audit.json](balance-audit.json).
The baseline is release v0.3.0; the changes below are local, not deployed.

## Method and limits

18 deterministic runs: ranks 0, 1, 5, 10, 20 and 24, each with three policies.
All start with a fresh world at that rank, zero credits, and one-second simulation
steps. No seeded money, instant completion or real player saves are used.

- `roi`: prioritizes hires, then income gain per credit using the production summary.
- `expansion`: prioritizes hires and affordable depth unlocks, then cheap purchases.
- `relaxed`: cheap purchases and hires, with manual selling every 30 seconds
  instead of five. It still checks purchases every second; this is not a human
  attention or offline-play model.

All policies claim rewards, start/claim eligible expeditions and buy the first
currently affordable ranked choice. ROI uses nominal machine output, not a
forecast of storage pressure, discounts or future unlocks. None is claimed optimal.
Completion is simulated with actual world commands. After every completion gate
is met, remaining credit-only time is estimated from ten minutes of unchanged
production. This tail is an estimate, not an event-by-event 11-day simulation.
Times exclude navigation, reading, mistakes and the four-hour offline cap.
Each rank is a separate fresh run, not cumulative time through all prior ranks.

## Measured result

ROI policy, time from fresh run to prestige eligibility:

| Transition | Before      | After    | After: credit-only tail |
| ---------- | ----------- | -------- | ----------------------- |
| 0 → 1      | 22.6 min    | 22.2 min | 0.5 min                 |
| 1 → 2      | 19.8 min    | 19.8 min | 0.5 min                 |
| 5 → 6      | 18.7 min    | 15.4 min | 1.1 min                 |
| 10 → 11    | 46.5 min    | 14.3 min | 2.8 min                 |
| 20 → 21    | 2747.6 min  | 28.3 min | 19.1 min                |
| 24 → 25    | 16047.8 min | 50.4 min | 41.9 min                |

Across all three policies, first prestige changes from 22.6–24.9 minutes to
22.2–23.9 minutes. The prior final-rank credit-only tail was roughly 11.1 days
of continuous production. The new final-rank run is about 50–52 minutes.
Actual elapsed calendar time can be longer because offline production is capped.

## Changes

- Prestige credit growth changes from ×1.6 to ×1.25 per rank. The initial 25,000
  requirement, +20% permanent income per rank, full-completion gates and maximum
  rank 25 stay the same. Costs use exact integer arithmetic with rounding up to
  the next thousand. The final eligible run requires about 5.294 million credits.
- Pilot levels 2/3 retain their faster pickups and add 10/20 percentage points
  of base sale value while enabled. This bonus adds to trade research, officers,
  network, expeditions and prestige; it does not multiply those bonuses. It
  applies to manual and automatic sales alike and disappears while off duty.
  Level 1 is unchanged. Existing trained pilots receive the benefit automatically.
- With maximum machines, no other bonuses and a ten-minute window, Crystal
  shallows now earn 6,420 / 7,062 / 7,704 credits at pilot levels 1/2/3. Previously
  all three earned 6,420. Integer sale-price rounding means the percentage gain
  varies slightly by resource. Maximum storage already handles 12-second pickups,
  so the benefit cannot rely solely on faster collection.

A new local migration updates the server prestige gate to ×1.25. It must be
applied before publishing this client. Save format remains v8; no reset is needed.
The audit establishes pacing and mechanical usefulness, not player enjoyment.
