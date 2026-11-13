# Optional discount research — local change, 2026-10-29

Prestige now requires maxed Trade and Storage research (2/2), instead of all four
paths. Engineering and Surveying remain available at their existing prices and
with their existing effects, but do not block the next run. Production, crew,
network, mission, expedition, credit and depth requirements are unchanged.

These two paths discount purchases that can no longer exist at the prestige
boundary: all machines and all depths are already complete. Their research is
reset by prestige, so completing them solely to unlock prestige supplied no
benefit. They remain useful optional investments earlier in the run.

The Prestige screen identifies the two required paths; both discount-research
cards say “Optional for prestige”. A ready prestige takes priority over optional
spending hints. Once all production or depths are complete, hints stop proposing
the corresponding discount research. The checklist counter reads 2/2 when the
two required paths are maxed, regardless of optional-path levels or their omission
from older saves. Save version remains v8, and earned bonuses are retained until
the player chooses prestige.

## Verification

- Domain tests accept zero, partial and absent optional paths; reject either
  required path below level 5; and confirm progression to the next rank.
- Isolated PGlite integration applies the new migration and successfully performs
  authenticated prestige from a run with both discount paths at zero. It still
  rejects underlevel Trade/Storage, other incomplete categories, stale revisions
  and wrong-account requests. Idempotent replay and stale-tab fences remain.
- Hint tests cover ready prestige, remaining credits and incomplete crew while
  optional research is affordable but no longer useful.
- The unchanged 18-scenario policy matrix is in
  [prestige-research-audit.json](prestige-research-audit.json). Relative to the
  preceding local balance curve, rank-zero ROI prestige changes from 22:13 to
  about 21:55. Rank 24 remains about 50:23. Completion time is simulated; the
  final credit-only tail uses the existing ten-minute income estimate.
- The simulator may still voluntarily buy optional research under its fixed
  purchase-ranking policy. These timings do not assume every player avoids
  every obsolete purchase and do not measure human enjoyment.

The new `prestige_required_research` migration is local and unapplied remotely.
It must accompany the client on a future release. Previously published migration
files are unchanged; no push or deployment is part of this work.
