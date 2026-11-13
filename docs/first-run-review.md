# First-run walkthrough — 2026-10-29

Local only. Existing balance edits remain unpublished. No production save,
account, database migration, push or deployment was used in this review.

## Evidence and method

- Fresh zero-credit guest flow exercised through real UI buttons in Chrome and
  WebKit at 390×844: wait for cargo, sell, upgrade submarine, hire first pilot.
  Browser time was accelerated; this was not 75 seconds of human play.
- Reachable middle/end states come from the rank-zero ROI policy of
  `node --import tsx scripts/balance-audit.mjs --walkthrough`. It starts with zero
  credits and uses real domain commands; no money or completed systems are injected.
  The optional output records purchases, hints and checkpoint saves.
- Five states (fresh, 1:10, 10:00, 20:00, 21:46) opened in isolated guest contexts
  in both browser engines. Inspected scene, Research, Missions, Crew and Prestige;
  captured 50 screenshots. Browser snapshots advance slightly while panels open,
  so displayed credits are not identical to the saved checkpoint.
- Screenshots and browser logs are under `/tmp/walkthrough-*` and
  `/tmp/abyss-start-flow.cjs`. They are temporary artifacts. This is an expert UI
  review plus automated gameplay, not a human enjoyment or real-iPhone study.

## First-run timeline

| Time   | Event in the ROI policy                                    |
| ------ | ---------------------------------------------------------- |
| 1:10   | First cargo pilot hired                                    |
| 3:46   | 180 m unlocked                                             |
| 7:14   | 420 m unlocked                                             |
| 10:00  | All seven missions already claimed; expedition 2 is active |
| 12:21  | All three expeditions completed                            |
| 14:35  | 900 m unlocked                                             |
| 18:43  | 1,900 m unlocked                                           |
| 21:46  | Every prestige completion gate satisfied                   |
| ~22:13 | Estimated 25,000-credit prestige threshold                 |

Timing depends on automated purchases every second. It does not include reading,
scrolling, choosing tabs or mistakes. See the balance audit for policy limits.

## Prioritized findings

### P1 — Completion demands purchases whose usefulness has expired

At 21:04 the policy buys the last surveying level for 14,000 credits, after
all depths have been open since 18:43. There are no remaining unlocks to discount.
At 21:46 it buys the last engineering level for 18,000 credits, after every
machine is maxed. Prestige resets both research lines, so neither purchase helps
the next run. These are completion taxes rather than useful choices.

Next decision: keep the full-completion fantasy and give those research lines a
useful end-of-run effect, or let prestige require meaningful milestones instead
of every purchase. Do not silently change the gate during this UI audit: client
and server currently agree on full completion.

### P1 — End-of-run hints stop giving a next goal

At 20:00 the scene says “Base fully upgraded”, while Crew is 13/15, Research is
0/4 maxed paths and Network is 2/3. At 21:46 all completion gates are satisfied,
but the hint still says “Base fully upgraded” with only 1,946 credits available.
It gives neither the prestige goal nor the remaining credit target.

Next implementation: after local production is maxed, point to the first
unfinished run category, then to remaining prestige credits. Local completion
must not imply the whole run is done. Add targeted tests for those two states.

### P2 — The mission structure ends before the final two depths

All seven missions are claimed by 10:00; expeditions end at 12:21, before 900 m
opens at 14:35 and 1,900 m at 18:43. The later part has depth targets and the
prestige checklist, but no new missions. The existing expedition system only
uses the original three bases.

Next design pass: distribute existing/new milestones over the last two depths
before adding a separate gameplay system. Reward sizes need a new balance run.

### P2 — Cargo diversion creates a quiet purchasing interval

The trace has no purchases from 9:56 to 12:26 (150 seconds), while the three
contracts consume cargo before selling the remainder. There are contract claims
in this interval, so it is not 150 seconds with no actions. The UI explains the
routing, but the income slowdown can make the player feel stalled.

Next check: show contract progress and the payoff clearly before Start. Tune
contract targets only if a human playtest also finds this interval dull.

### P2 — Prestige progress uses an easily misread denominator

At 20:00 Research reads 0/4 despite levels 4/5 in every research path. The number
means fully completed paths, not purchased research levels. “Research paths
maxed 0/4” would explain it. Crew 13/15 similarly counts fully trained roles,
not total training levels.

Next implementation: clarify these labels without changing the requirements.

### P2 — Expeditions have no visible unlock checklist before discovery

The expedition component renders nothing until its production/research gates
are met. A new player cannot see the requirements or plan for expeditions from
the Missions screen. This is verified in the fresh guest view and component logic.

Next implementation: a compact locked preview listing only unmet prerequisites,
with the eventual reward visible. Preserve the compact mobile layout.

## Fixed during this review

The Prestige screen still said credit requirements grow by 60% after the local
balance change to 25%. It now derives the percentage from `PRESTIGE.costGrowth`,
so its explanation follows the actual configuration. No economy rules were
changed during this walkthrough.

## Recommended next slice

Fix end-of-run hints and clarify the prestige checklist first. They address
verified confusion without changing pacing or save structure. Then decide how
to remove the expired-research completion tax; only after that rebalance later
missions and expeditions. Keep publishing paused until these local changes have
been reviewed together.

## Follow-up: end-of-run guidance implemented locally

The local hint fallback now points to unfinished production/crew at the relevant
depth, research paths, network facilities, remaining missions/contracts, or the
remaining prestige credit amount. Affordable actions and urgent resume/pickup/
reward hints retain priority. Sellable cargo can prompt a sale to reach the
prestige threshold; eligible runs point to Base, and rank 25 does not advertise
another prestige. A maxed early base points toward the next depth instead of
claiming completion of the run.

The checklist labels now say “Production upgrades maxed”, “Crew roles maxed”,
“Research paths maxed”, “Network facilities maxed” and “Expeditions completed”.
Counts and eligibility are unchanged. Numeric fractions stay on one line on
320px screens. The expired-research requirement and mission pacing remain open.

## Follow-up: expired discount-research gate removed locally

Engineering and Surveying no longer block prestige. Trade and Storage remain
required at level 5, shown as 2/2. Optional paths retain their existing purchases
and effects, and hints no longer recommend discounts after the corresponding
purchases are exhausted. See [research requirement review](prestige-research-review.md)
for client/server verification and updated pacing measurements. The local SQL
migration has not been applied remotely. The later-mission/expedition findings
remain open; network and crew gates were not changed in this slice.

## Follow-up: goals now extend through both late depths

Two appended missions and contracts add goals at 900 m and 1,900 m, preserving the
original seven mission definitions and three contract indices/targets. Finished
missions collapse into history while pending late goals remain visible. The
last contract now completes after opening the rift. See [late-depth objectives](late-objectives.md)
for new targets, save compatibility, measured pacing and verification. These
changes and their server-gate migration remain local.
