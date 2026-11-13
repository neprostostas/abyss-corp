import { EXPEDITIONS } from '../src/data/expeditions.ts';
// Run: node --import tsx scripts/balance-audit.mjs
// Deterministic fresh-run policies, not predictions of player behavior.
import * as W from '../src/domain/world.ts';
import * as P from '../src/domain/progression.ts';
import * as E from '../src/domain/expeditions.ts';
import * as C from '../src/domain/campaign.ts';
import { getProductionHint } from '../src/domain/hints.ts';
import { getUpgradeOffer, getProductionSummary } from '../src/domain/game.ts';
import { LAYER_IDS } from '../src/data/layers.ts';
import { UPGRADE_IDS } from '../src/data/balance.ts';
import { RESEARCH_IDS, MISSION_IDS } from '../src/data/progression.ts';
import { SPECIALIST_IDS } from '../src/data/automation.ts';
import { INFRASTRUCTURE_IDS } from '../src/data/campaign.ts';

const income = (w) =>
  LAYER_IDS.reduce(
    (sum, id) =>
      sum +
      (w.layers[id]
        ? getProductionSummary(
            W.getLayerGame(w, id),
            P.getLayerProduction(w, id),
          ).creditsPerSecond
        : 0),
    0,
  );
function candidates(w) {
  const list = [];
  const add = (kind, cost, apply) => {
    if (cost === null || cost === undefined) return;
    const next = apply({ ...w, credits: 1e12 });
    if (next === w) return;
    const gain = income(next) - income(w);
    list.push({ kind, cost, apply, roi: gain > 0 ? cost / gain : 1e9 + cost });
  };
  for (const id of LAYER_IDS) {
    const unlock = W.getUnlockOffer(w, id);
    if (!w.layers[id] && unlock.prerequisiteMet)
      add('depth', unlock.cost, (x) => W.unlockLayer(x, id));
    if (!w.layers[id]) continue;
    const selected = W.selectLayer(w, id);
    for (const kind of UPGRADE_IDS)
      add(
        'machine',
        getUpgradeOffer(
          W.getLayerGame(selected),
          kind,
          P.getLayerProduction(selected),
        ).next?.cost,
        (x) => W.upgradeLayer(W.selectLayer(x, id), kind),
      );
    add(
      w.layers[id].automation ? 'pilot' : 'hire',
      W.getAutomationOffer(selected).cost,
      (x) => W.upgradeAutomation(W.selectLayer(x, id)),
    );
    for (const kind of SPECIALIST_IDS)
      add('specialist', W.getSpecialistOffer(selected, kind).cost, (x) =>
        W.upgradeSpecialist(W.selectLayer(x, id), kind),
      );
  }
  for (const id of RESEARCH_IDS) {
    const offer = P.getResearchOffer(w, id);
    if (offer.unlocked)
      add('research', offer.cost, (x) => W.buyResearch(x, id));
  }
  for (const id of INFRASTRUCTURE_IDS) {
    const offer = C.getInfrastructureOffer(w, id);
    if (offer.unlocked)
      add('network', offer.cost, (x) => W.buyInfrastructure(x, id));
  }
  return list;
}
function simulate(policy, rank) {
  const walkthrough =
    process.argv.includes('--walkthrough') && policy === 'roi' && rank === 0;
  const purchases = [];
  const checkpoints = [];
  let w = { ...W.createWorld(), campaign: C.createCampaign(rank) },
    marks = {},
    lastAction = 0,
    maxGap = 0;
  for (let second = 1; second <= 14400; second++) {
    w = W.advanceWorld(w, 1000);
    if (second % (policy === 'relaxed' ? 30 : 5) === 0)
      for (const id of LAYER_IDS)
        if (w.layers[id] && !w.layers[id].automation)
          w = W.sellLayer(W.selectLayer(w, id));
    let changed = false;
    const act = (n) => {
      if (n !== w) {
        w = n;
        changed = true;
      }
    };
    for (const id of MISSION_IDS) act(W.claimMission(w, id));
    if (E.getExpeditionOffer(w).ready) {
      const completed = E.getExpeditionOffer(w).state.completed + 1;
      act(E.claimExpedition(w));
      marks[`expedition${String(completed)}`] = second;
    }
    if (E.getExpeditionOffer(w).canStart) act(E.startExpedition(w));
    const options = candidates(w);
    options.sort((a, b) => {
      if (a.kind === 'hire' || b.kind === 'hire') {
        if (a.kind !== b.kind) return a.kind === 'hire' ? -1 : 1;
      }
      if (
        policy === 'expansion' &&
        (a.kind === 'depth' || b.kind === 'depth') &&
        a.kind !== b.kind
      )
        return a.kind === 'depth' ? -1 : 1;
      return policy === 'roi' ? a.roi - b.roi : a.cost - b.cost;
    });
    // Buy the first affordable choice; do not stall behind an unavailable option.
    const chosen = options.find((o) => o.cost <= w.credits);
    if (chosen) {
      const before = w;
      act(chosen.apply(w));
      if (walkthrough)
        purchases.push({
          second,
          kind: chosen.kind,
          cost: chosen.cost,
          depth: w.selectedLayerId,
          hintBefore: getProductionHint(before).text,
          hintAfter: getProductionHint(w).text,
        });
    }
    if (
      walkthrough &&
      [30, 60, 70, 120, 300, 600, 741, 900, 1200, 1264, 1306].includes(second)
    ) {
      checkpoints.push({ second, world: w, hint: getProductionHint(w).text });
    }
    for (const id of LAYER_IDS) if (w.layers[id]) marks[id] ??= second;
    if (P.getProgression(w).expedition.completed === EXPEDITIONS.length)
      marks.expeditions ??= second;
    if (changed) {
      maxGap = Math.max(maxGap, second - lastAction);
      lastAction = second;
    }
    const offer = C.getPrestigeOffer(w);
    if (offer.completionReady) {
      const sample = W.advanceWorld(w, 600000);
      const rate = (sample.credits - w.credits) / 600;
      const tail = Math.max(
        0,
        Math.ceil((offer.requiredCredits - w.credits) / rate),
      );
      return {
        policy,
        rank,
        marks,
        completionSeconds: second,
        prestigeSeconds: second + tail,
        tailEstimateSeconds: tail,
        maxActionGap: maxGap,
        creditsPerSecond: Math.round(rate * 100) / 100,
        requiredCredits: offer.requiredCredits,
        ...(walkthrough ? { purchases, checkpoints } : {}),
      };
    }
  }
  return { policy, rank, marks, incomplete: true };
}
const runs = [];
for (const rank of [0, 1, 5, 10, 20, 24])
  for (const policy of ['roi', 'expansion', 'relaxed'])
    runs.push(simulate(policy, rank));
const pilots = [];
for (const id of LAYER_IDS)
  for (const level of [1, 2, 3]) {
    const w = {
      ...W.createWorld(),
      credits: 0,
      selectedLayerId: id,
      layers: {
        [id]: {
          ...W.createLayer(),
          levels: { mining: 5, transport: 5, processing: 5, storage: 5 },
          automation: { level, enabled: true, elapsedMs: 0 },
        },
      },
    };
    pilots.push({
      depth: id,
      level,
      creditsInTenMinutes: W.advanceWorld(w, 600000).credits,
    });
  }
console.log(JSON.stringify({ runs, pilots }, null, 2));
