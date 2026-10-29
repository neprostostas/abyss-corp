import { LAYER_IDS } from '../data/layers';
import { UPGRADE_IDS, UPGRADES } from '../data/balance';
import {
  AUTOMATION_LEVELS,
  SPECIALIST_IDS,
  SPECIALISTS,
} from '../data/automation';
import { MISSION_IDS, RESEARCH_IDS, RESEARCH } from '../data/progression';
import { EXPEDITIONS } from '../data/expeditions';
import { INFRASTRUCTURE_IDS } from '../data/campaign';
import { INFRASTRUCTURE, PRESTIGE, getPrestigeCost } from '../data/campaign';
import type { InfrastructureId } from '../data/campaign';
import type { WorldState } from './world';

export interface CampaignState {
  readonly rank: number;
  readonly infrastructure: Readonly<Record<InfrastructureId, number>>;
}
export function createCampaign(rank = 0): CampaignState {
  return { rank, infrastructure: { depot: 0, exchange: 0, sonar: 0 } };
}
export function getCampaign(world: WorldState): CampaignState {
  return world.campaign ?? createCampaign();
}
export function getInfrastructureOffer(
  world: WorldState,
  id: InfrastructureId,
) {
  const definition = INFRASTRUCTURE[id];
  const level = getCampaign(world).infrastructure[id];
  const cost = definition.costs[level] ?? null;
  const unlocked = !!world.layers['golden-trench'];
  return {
    level,
    cost,
    unlocked,
    affordable: unlocked && cost !== null && world.credits >= cost,
    bonus: level * definition.bonusPerLevel,
  };
}
export function getPrestigeOffer(world: WorldState) {
  const { rank } = getCampaign(world);
  const requiredCredits = getPrestigeCost(rank);
  const depthReady = !!world.layers[PRESTIGE.requiredLayer];
  const requirements = [
    {
      id: 'production',
      label: 'Production',
      current: LAYER_IDS.reduce(
        (sum, id) =>
          sum +
          UPGRADE_IDS.filter(
            (kind) =>
              world.layers[id]?.levels[kind] === UPGRADES[kind].levels.length,
          ).length,
        0,
      ),
      total: LAYER_IDS.length * UPGRADE_IDS.length,
    },
    {
      id: 'crew',
      label: 'Crew',
      current: LAYER_IDS.reduce(
        (sum, id) =>
          sum +
          (world.layers[id]?.automation?.level === AUTOMATION_LEVELS.length
            ? 1
            : 0) +
          SPECIALIST_IDS.filter(
            (kind) =>
              world.layers[id]?.specialists?.[kind] ===
              SPECIALISTS[kind].costs.length,
          ).length,
        0,
      ),
      total: LAYER_IDS.length * (SPECIALIST_IDS.length + 1),
    },
    {
      id: 'research',
      label: 'Research',
      current: RESEARCH_IDS.filter(
        (id) => world.progression?.research[id] === RESEARCH[id].costs.length,
      ).length,
      total: RESEARCH_IDS.length,
    },
    {
      id: 'network',
      label: 'Network',
      current: INFRASTRUCTURE_IDS.filter(
        (id) =>
          getCampaign(world).infrastructure[id] ===
          INFRASTRUCTURE[id].costs.length,
      ).length,
      total: INFRASTRUCTURE_IDS.length,
    },
    {
      id: 'missions',
      label: 'Missions claimed',
      current: MISSION_IDS.filter((id) =>
        world.progression?.claimedMissions.includes(id),
      ).length,
      total: MISSION_IDS.length,
    },
    {
      id: 'expeditions',
      label: 'Expeditions',
      current: world.progression?.expedition?.completed ?? 0,
      total: EXPEDITIONS.length,
    },
  ];
  const completionReady = requirements.every(
    ({ current, total }) => current === total,
  );
  return {
    requiredCredits,
    requirements,
    completionReady,
    rank,
    bonus: rank * PRESTIGE.bonusPerRank,
    nextBonus: (rank + 1) * PRESTIGE.bonusPerRank,
    depthReady,
    canPrestige:
      depthReady &&
      completionReady &&
      rank < PRESTIGE.maxRank &&
      world.credits >= requiredCredits,
  };
}
