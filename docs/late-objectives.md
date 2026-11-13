# Late-depth goals — local implementation, 2026-10-29

The run now contains nine missions and five expeditions. The first seven mission
IDs, rewards and conditions and the first three expedition names, indices and
cargo targets are unchanged.

## New goals

| Content                                   | Requirement                                             | Reward                                  |
| ----------------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| Below the volcanic shelf                  | Open the 900 m outpost                                  | 300 credits, once per run               |
| Edge of the known ocean                   | Open the 1,900 m outpost                                | 1,000 credits, once per run             |
| Stabilize the thermal station, contract 4 | Supply 45 Titanium from 900 m                           | +5 percentage points of base sale value |
| Chart the midnight rift, contract 5       | Supply 24 Titanium and 36 Lumens from 900 m and 1,900 m | +5 percentage points of base sale value |

Late contracts require their source outposts and pilots, plus the existing
first-three-base production and Trade/Storage level-3 prerequisites. Their pilots
must be on duty and production running while cargo remains undelivered. Paused
or absent pilots at unrelated bases do not block these contracts. Cargo from
unlisted sources continues selling normally. A listed base that has delivered
its whole target may pause without blocking other participants.

The Missions panel shows only the applicable cargo rows. Locked late contracts
show the next depth or pilot requirement. Completed missions move into the
existing collapsed history even while new missions remain unfinished, so seven
old claims no longer push the new goals to the bottom. The final card reports
five completed expeditions and a +25% run cargo bonus.

Prestige requires all nine mission claims and all five expeditions. Other local
prestige gates, including optional Engineering/Surveying, retain their behavior.
A new local SQL migration updates the authenticated server gate to match.

## Save compatibility

The new client reads old v8 saves. Existing active first/second/third contracts
keep their original targets and delivered cargo. Existing completed count 3 stays
3 and preserves its +15% bonus; it exposes contract 4 rather than granting new
rewards automatically. A run without 900 m waits for that depth. New delivered
fields are optional on old saves and start at zero; inactive cargo must still be
zero. Validation rejects excess/irrelevant cargo and completed or active contracts
whose source outposts do not exist.

Save version remains v8. This is forward loading compatibility, not support for
old clients reading new mission IDs or late cargo fields. A future release must
apply the local migrations and refresh old tabs before they continue writing.
No remote migration, push or deployment was performed during this work.

## Pacing measurement

Re-ran the same 18 fresh-run policy/rank scenarios. Raw output is in
[late-objectives-audit.json](late-objectives-audit.json); policy limitations remain
those of the existing balance audit. Completion gates are simulated; the final
credit-only wait is estimated from ten minutes of stable production.

Rank-zero ROI policy:

| Milestone                    | Time  |
| ---------------------------- | ----- |
| Third expedition complete    | 12:21 |
| 900 m open                   | 14:35 |
| Fourth expedition complete   | 16:40 |
| 1,900 m open                 | 19:28 |
| Fifth expedition complete    | 21:37 |
| Prestige eligible, estimated | 23:40 |

Across the three rank-zero policies, the first run takes about 23.7–25.3 minutes,
versus 21.9–23.6 minutes before this content slice. The rank-24 ROI run takes
about 51.8 minutes. These are automated strategy results, not human play times.
No currency is injected by the simulator. The two late contracts now occupy the
last two depths instead of ending the expedition sequence before 900 m.

## Verification

Domain regressions cover locked late sources, unrelated pilots/cargo, routing
caps, both contract completions, save reload, one-time claims, offline partition
equivalence and the two depth-specific mission rewards. A legacy active third
contract can finish and retain cargo without opening 900 m. SQL integration
requires the fifth contract and both new mission IDs while retaining ownership,
revision and idempotency checks.

Chrome and WebKit cover five contract states at 320×568, 390×844 and 844×390:
legacy count 3 with 900 m locked, start fourth, start fifth, claim fifth and final
completion. Screenshots were captured after opening the panel and checked for
layout; contexts and saves are isolated from real users.

Full check passes with 191 tests, typecheck, lint and formatting; production
build passes.
