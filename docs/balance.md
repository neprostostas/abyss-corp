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

Three optional expeditions follow maximum production and research development, with a cargo pilot hired at every outpost. Pilot upgrades are optional. With empty initial buffers and maximum active pilots, measured completion times are approximately 36, 62 and 84 seconds. Existing stock can shorten a delivery. Ships supply the accepted contract first and sell excess cargo; each claimed expedition adds five percentage points to base cargo prices. The campaign ends at the abyss beacon after three expeditions. This adds a concrete finish without artificial long timers or a forced prestige reset.

## Economy review, 27 October 2026

The opening benchmark still reaches the first upgrade at 15 seconds, the first pilot at 40 seconds, Golden trench at 95 seconds, and Pearl caverns at 185 seconds. Selling every 15–30 seconds moves the first upgrade to 15–30 seconds and the pilot to 45–60 seconds. Prices, cargo values, production timers, and expedition targets remain unchanged.

At maximum machine and warehouse levels, a 10-minute simulation without research produces the same sales at every pilot level:

| Outpost          | Pilot 1 | Pilot 2 | Pilot 3 |
| ---------------- | ------: | ------: | ------: |
| Crystal shallows |   6,420 |   6,420 |   6,420 |
| Golden trench    |  11,928 |  11,928 |  11,928 |
| Pearl caverns    |  20,352 |  20,352 |  20,352 |

A larger warehouse already holds everything produced between sales. Faster pilots help small warehouses clear stock, but do not speed up machines. Requiring maximum pilots for expeditions therefore forced 3,780 credits of purchases that did not improve sustained production at that stage. Expeditions now require a hired pilot at each depth instead; all production and research requirements still apply. Existing pilot upgrades continue working and are not refunded or downgraded.

An active policy that sells unstaffed cargo every five seconds, claims missions, opens depths, hires pilots, and prioritizes production payback completes the campaign in roughly 9–10 minutes. This is an automated pacing benchmark, not a measured human playthrough. The change removes a forced purchase rather than stretching the existing three-depth campaign with higher prices or longer waits. Expanding its duration meaningfully needs additional content and playtesting.
