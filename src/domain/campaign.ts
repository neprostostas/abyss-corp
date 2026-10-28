import { INFRASTRUCTURE, PRESTIGE } from '../data/campaign';
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
  const depthReady = !!world.layers[PRESTIGE.requiredLayer];
  return {
    rank,
    bonus: rank * PRESTIGE.bonusPerRank,
    nextBonus: (rank + 1) * PRESTIGE.bonusPerRank,
    depthReady,
    canPrestige:
      depthReady &&
      rank < PRESTIGE.maxRank &&
      world.credits >= PRESTIGE.requiredCredits,
  };
}
