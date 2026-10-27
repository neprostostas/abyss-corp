# Early-game balance

Prices and output live in `src/data/`: `balance.ts`, `resources.ts`, `layers.ts`, and `automation.ts`.

| Milestone         | Target in an active session |
| ----------------- | --------------------------- |
| First upgrade     | 15 seconds                  |
| First cargo pilot | 40 seconds                  |
| Golden trench     | 1-2 minutes                 |
| Pearl caverns     | 3-4 minutes                 |

Measured with the domain simulation: sell every five seconds, buy one submarine upgrade, hire a pilot at each of the first two bases, then save for the next depth. No mission rewards or research bonuses are assumed. Other spending and less frequent collection extend these times. These are pacing benchmarks, not guaranteed unlock times.

- Credits and research belong to the corporation. Machines, cargo, and pilots belong to each depth.
- Deeper cargo earns more per second even before upgrades; deeper equipment costs more.
- All unlocked bases continue producing when another depth is selected. Without a pilot, cargo waits for manual sale and storage eventually fills.
- This balance pass changes prices and sale values only. Existing balances, levels, capacities, and in-progress timers remain valid. Past purchases are not refunded.
- Three depths are an early playable slice; longer progression needs more content and playtesting rather than longer waits.

## Mission rewards and endgame

Mission rewards total 480 credits (previously 2,070). Opening three depths and staffing them now grants 260 credits rather than the previous 990-credit burst. Existing claimed rewards and wallets are not reduced.

Three optional expeditions follow maximum development. With empty initial buffers and maximum active pilots, measured completion times are approximately 36, 62 and 84 seconds. Existing stock can shorten a delivery. Ships supply the accepted contract first and sell excess cargo; each claimed expedition adds five percentage points to base cargo prices. The campaign ends at the abyss beacon after three expeditions. This adds a concrete finish without artificial long timers or a forced prestige reset.
