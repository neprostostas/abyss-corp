import { getCampaign } from './campaign';
import { INFRASTRUCTURE, PRESTIGE } from '../data/campaign';
import { EXPEDITION_TRADE_BONUS } from '../data/expeditions';
import {
  MISSION_IDS,
  MISSIONS,
  RESEARCH,
  RESEARCH_IDS,
} from '../data/progression';
import type { MissionId, ResearchId } from '../data/progression';
import { LAYERS, LAYER_IDS } from '../data/layers';
import type { LayerId, CoreLayerId, ProductionConfig } from '../data/layers';
import type { WorldState } from './world';

export interface ExpeditionState {
  readonly completed: number;
  readonly active: boolean;
  readonly delivered: Readonly<Record<CoreLayerId, number>>;
}
export function createExpedition(): ExpeditionState {
  return {
    completed: 0,
    active: false,
    delivered: { shallows: 0, 'golden-trench': 0, 'pearl-caverns': 0 },
  };
}
export interface ProgressionState {
  readonly expedition?: ExpeditionState;
  readonly claimedEvents?: readonly string[];
  readonly research: Readonly<Record<ResearchId, number>>;
  readonly claimedMissions: readonly MissionId[];
}
export function createProgression(): ProgressionState {
  return {
    research: { trade: 0, storage: 0 },
    claimedMissions: [],
    claimedEvents: [],
    expedition: createExpedition(),
  };
}
export function getProgression(world: WorldState): ProgressionState {
  return world.progression ?? createProgression();
}
export function getResearchOffer(world: WorldState, id: ResearchId) {
  const definition = RESEARCH[id];
  const level = getProgression(world).research[id];
  const cost = definition.costs[level] ?? null;
  return {
    level,
    cost,
    affordable: cost !== null && world.credits >= cost,
    bonus: level * definition.bonusPerLevel,
    nextBonus: cost === null ? null : (level + 1) * definition.bonusPerLevel,
  };
}

export function getLayerProduction(
  world: WorldState,
  id: LayerId = world.selectedLayerId,
): ProductionConfig {
  const base = LAYERS[id].production;
  const progression = getProgression(world);
  const research = progression.research;
  const campaign = getCampaign(world);
  return {
    ...base,
    storageBonus:
      research.storage * RESEARCH.storage.bonusPerLevel +
      campaign.infrastructure.depot * INFRASTRUCTURE.depot.bonusPerLevel,
    resource: {
      ...base.resource,
      refinedValue: Math.floor(
        (base.resource.refinedValue *
          (100 +
            campaign.rank * PRESTIGE.bonusPerRank +
            campaign.infrastructure.exchange *
              INFRASTRUCTURE.exchange.bonusPerLevel +
            research.trade * RESEARCH.trade.bonusPerLevel +
            (progression.expedition?.completed ?? 0) *
              EXPEDITION_TRADE_BONUS)) /
          100,
      ),
    },
  };
}

export function getMissionProgress(world: WorldState, id: MissionId) {
  const definition = MISSIONS[id];
  const progression = getProgression(world);
  const layers = LAYER_IDS.flatMap((layerId) => {
    const layer = world.layers[layerId];
    return layer ? [layer] : [];
  });
  const metrics = {
    layers: layers.length,
    modules: layers.filter((layer) => layer.automation !== undefined).length,
    upgrades: layers.reduce(
      (sum, layer) =>
        sum +
        Object.values(layer.levels).reduce(
          (total, level) => total + level - 1,
          0,
        ),
      0,
    ),
    research: RESEARCH_IDS.reduce(
      (sum, researchId) => sum + progression.research[researchId],
      0,
    ),
  };
  const current = Math.min(metrics[definition.metric], definition.target);
  const claimed = progression.claimedMissions.includes(id);
  const complete = current === definition.target;
  const rewardFits =
    world.credits <= Number.MAX_SAFE_INTEGER - definition.reward;
  return {
    current,
    target: definition.target,
    claimed,
    complete,
    rewardFits,
    canClaim: complete && !claimed && rewardFits,
  };
}

export function getReadyMissionCount(world: WorldState): number {
  return MISSION_IDS.filter((id) => getMissionProgress(world, id).canClaim)
    .length;
}
