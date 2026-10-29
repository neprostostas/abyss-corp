import { UPGRADE_IDS } from '../data/balance';
import { LAYERS, LAYER_IDS, CORE_LAYER_IDS } from '../data/layers';
import { RESEARCH, RESEARCH_IDS } from '../data/progression';
import { getSaleValue } from './game';
import { INFRASTRUCTURE_IDS } from '../data/campaign';
import {
  getLayerGame,
  getAutomationOffer,
  getSpecialistOffer,
  getUnlockOffer,
} from './world';
import type { WorldState } from './world';
import {
  getLayerProduction,
  getReadyMissionCount,
  getResearchOffer,
} from './progression';
import { getExpeditionOffer } from './expeditions';
import { getInfrastructureOffer, getPrestigeOffer } from './campaign';
import { getProductionSummary, getUpgradeOffer } from './game';
import type { UpgradeId } from './game';

const names: Record<UpgradeId, string> = {
  mining: 'drill',
  transport: 'submarine',
  processing: 'refinery',
  storage: 'storage',
};
export interface ProductionHint {
  text: string;
  upgrade: UpgradeId | null;
}
/** Recommendations are actionable, ranked by urgency, and never blame a maxed machine. */
export function getProductionHint(world: WorldState): ProductionHint {
  const game = getLayerGame(world);
  const config = getLayerProduction(world);
  const summary = getProductionSummary(game, config);
  const pilot = world.layers[world.selectedLayerId]?.automation;
  const hint = (
    text: string,
    upgrade: UpgradeId | null = null,
  ): ProductionHint => ({ text, upgrade });
  const expedition = getExpeditionOffer(world);
  if (expedition.ready) return hint('Claim expedition bonus');
  if (!game.running) return hint('Resume production');
  if (summary.storageFull) {
    if (!pilot) return hint('Storage full · sell cargo');
    if (!pilot.enabled) return hint('Storage full · enable pilot');
    const saleInterval = getAutomationOffer(world).intervalMs;
    if (
      getAutomationOffer(world).affordable &&
      saleInterval &&
      ((summary.creditsPerSecond / config.resource.refinedValue) *
        saleInterval) /
        1000 >=
        summary.capacity
    )
      return hint('Speed up cargo pickup');
    return hint(
      expedition.state.active
        ? 'Await expedition pickup'
        : 'Sell cargo or await pickup',
    );
  }
  if (pilot && !pilot.enabled) return hint('Enable cargo pilot');
  const rewards = getReadyMissionCount(world);
  if (rewards > 0)
    return hint(
      rewards === 1
        ? 'Claim mission reward'
        : `Claim ${String(rewards)} mission rewards`,
    );
  if (expedition.state.active && !expedition.pilotsReady) {
    const stopped = CORE_LAYER_IDS.find(
      (id) =>
        (!expedition.definition ||
          expedition.state.delivered[id] < expedition.definition.targets[id]) &&
        (!world.layers[id]?.running || !world.layers[id].automation?.enabled),
    );
    return hint(
      stopped
        ? `Resume ${String(LAYERS[stopped].depthMeters)} m crew`
        : 'Resume expedition pilots',
    );
  }
  if (expedition.canStart) return hint('Start an expedition');
  if (!pilot && getAutomationOffer(world).affordable)
    return hint('Hire an offline cargo pilot');
  const nextDepth = LAYER_IDS.find((id) => getUnlockOffer(world, id).canUnlock);
  if (nextDepth)
    return hint(`Explore ${String(LAYERS[nextDepth].depthMeters)} m`);
  // Compare whole production cycles: a faster single machine may not increase output.
  const upgrades = UPGRADE_IDS.filter((id) => id !== 'storage')
    .flatMap((id) => {
      const offer = getUpgradeOffer(game, id, config);
      if (!offer.next) return [];
      const next = getProductionSummary(
        { ...game, levels: { ...game.levels, [id]: game.levels[id] + 1 } },
        config,
      );
      const gain = next.creditsPerSecond / summary.creditsPerSecond - 1;
      return gain > 0.001
        ? [{ id, gain, cost: offer.next.cost, affordable: offer.affordable }]
        : [];
    })
    .sort((a, b) => b.gain / b.cost - a.gain / a.cost);
  const upgrade = upgrades.find((candidate) => candidate.affordable);
  if (upgrade)
    return hint(
      `Improve ${names[upgrade.id]} · +${String(Math.round(upgrade.gain * 100))}% output`,
      upgrade.id,
    );
  if (summary.dockBlocked) {
    const storage = getUpgradeOffer(game, 'storage', config);
    if (storage.affordable) return hint('Expand intake storage', 'storage');
    if (getSpecialistOffer(world, 'quartermaster').affordable)
      return hint('Expand storage with crew');
    return hint('Refinery clearing intake');
  }
  const storagePressure =
    game.raw >= summary.capacity * 0.75 ||
    game.refined >= summary.capacity * 0.75;
  if (storagePressure) {
    if (getResearchOffer(world, 'storage').affordable)
      return hint('Research larger warehouses');
    if (getInfrastructureOffer(world, 'depot').affordable)
      return hint('Expand the shared depot');
    const quartermaster = getSpecialistOffer(world, 'quartermaster');
    if (quartermaster.affordable)
      return hint(
        quartermaster.level ? 'Train quartermaster' : 'Hire quartermaster',
      );
  }
  const sale = getSaleValue(game, config);
  const fundedUpgrade = upgrades.find(
    (candidate) =>
      !candidate.affordable && candidate.cost <= world.credits + sale,
  );
  if (fundedUpgrade && !expedition.state.active)
    return hint(`Sell to fund ${names[fundedUpgrade.id]}`);
  const lockedDepth = LAYER_IDS.find(
    (id) => !world.layers[id] && getUnlockOffer(world, id).prerequisiteMet,
  );
  if (
    lockedDepth &&
    sale > 0 &&
    getUnlockOffer(world, lockedDepth).cost <= world.credits + sale &&
    !expedition.state.active
  )
    return hint(`Sell to unlock ${String(LAYERS[lockedDepth].depthMeters)} m`);
  if (
    game.refined >= config.resource.batchSize &&
    !pilot &&
    !expedition.state.active
  )
    return hint('Sell refined cargo');
  if (lockedDepth && getResearchOffer(world, 'surveying').affordable) {
    const research = getResearchOffer(world, 'surveying');
    const saving = Math.floor(
      (LAYERS[lockedDepth].unlockCost * RESEARCH.surveying.bonusPerLevel) / 100,
    );
    if (research.cost !== null && saving > research.cost)
      return hint('Research cheaper exploration');
  }
  if (getResearchOffer(world, 'engineering').affordable && upgrades.length >= 2)
    return hint('Research cheaper upgrades');
  const incomeOptions = [
    {
      offer: getResearchOffer(world, 'trade'),
      text: 'Research better sale prices',
    },
    {
      offer: getInfrastructureOffer(world, 'exchange'),
      text: 'Upgrade the trade hub',
    },
    {
      offer: getSpecialistOffer(world, 'broker'),
      text: getSpecialistOffer(world, 'broker').level
        ? 'Train trade officer'
        : 'Hire trade officer',
    },
  ]
    .filter(({ offer }) => offer.affordable && offer.cost !== null)
    .sort((a, b) => (a.offer.cost ?? Infinity) - (b.offer.cost ?? Infinity));
  if (incomeOptions[0]) return hint(incomeOptions[0].text);
  if (lockedDepth && getInfrastructureOffer(world, 'sonar').affordable)
    return hint('Upgrade sonar for exploration');
  const researchNames = {
    trade: 'trade',
    storage: 'storage',
    engineering: 'engineering',
    surveying: 'surveying',
  };
  const research = RESEARCH_IDS.find(
    (id) => getResearchOffer(world, id).affordable,
  );
  if (research) return hint(`Research ${researchNames[research]}`);
  const facilityNames = {
    depot: 'shared depot',
    exchange: 'trade hub',
    sonar: 'sonar',
  };
  const facility = INFRASTRUCTURE_IDS.find(
    (id) => getInfrastructureOffer(world, id).affordable,
  );
  if (facility) return hint(`Upgrade ${facilityNames[facility]}`);
  if (getPrestigeOffer(world).canPrestige) return hint('Prestige ready');
  if (upgrades[0])
    return hint(
      `Next: ${names[upgrades[0].id]} · ${upgrades[0].cost.toLocaleString('en-US')} CR`,
    );
  if (expedition.state.active && expedition.definition) {
    const targets = expedition.definition.targets;
    const source = (Object.keys(targets) as (keyof typeof targets)[]).find(
      (id) => expedition.state.delivered[id] < targets[id],
    );
    if (source)
      return hint(
        `Contract needs ${String(LAYERS[source].depthMeters)} m cargo`,
      );
  }
  if (summary.fullyUpgraded) return hint('Base fully upgraded');
  if (pilot?.enabled) return hint('Offline sales active');
  if (game.processingElapsedMs !== null) return hint('Refining cargo');
  return hint('Production running');
}
