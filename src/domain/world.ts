import {
  createCampaign,
  getCampaign,
  getInfrastructureOffer,
  getPrestigeOffer,
} from './campaign';
import type { CampaignState } from './campaign';
import type { InfrastructureId } from '../data/campaign';
import { INFRASTRUCTURE, PRESTIGE } from '../data/campaign';
import { supplyExpedition } from './expeditions';
import {
  createProgression,
  getProgression,
  getResearchOffer,
  getMissionProgress,
  getLayerProduction,
} from './progression';
import type { ProgressionState } from './progression';
import { MISSIONS } from '../data/progression';
import type { ResearchId, MissionId } from '../data/progression';
import { AUTOMATION_LEVELS } from '../data/automation';
import { LAYERS, LAYER_IDS } from '../data/layers';
import type { LayerId } from '../data/layers';
import {
  advanceGame,
  buyUpgrade,
  createGame,
  sellRefined,
  settleProduction,
} from './game';
import type { GameState, UpgradeId } from './game';

export interface AutomationState {
  readonly level: number;
  readonly enabled: boolean;
  readonly elapsedMs: number;
}
export type LayerState = Omit<GameState, 'credits'> & {
  readonly automation?: AutomationState;
};
export interface WorldState {
  readonly campaign?: CampaignState;
  readonly progression?: ProgressionState;
  readonly credits: number;
  readonly selectedLayerId: LayerId;
  readonly layers: Readonly<Partial<Record<LayerId, LayerState>>>;
}

export function createLayer(): LayerState {
  const {
    levels,
    phase,
    phaseElapsedMs,
    running,
    raw,
    refined,
    processingElapsedMs,
  } = createGame();
  return {
    levels,
    phase,
    phaseElapsedMs,
    running,
    raw,
    refined,
    processingElapsedMs,
  };
}
export function createWorld(): WorldState {
  return {
    campaign: createCampaign(),
    progression: createProgression(),
    credits: 0,
    selectedLayerId: 'shallows',
    layers: { shallows: createLayer() },
  };
}

export function getLayerGame(
  world: WorldState,
  id: LayerId = world.selectedLayerId,
): GameState {
  const layer = world.layers[id];
  if (!layer) throw new Error(`Layer is locked: ${id}`);
  return { ...layer, credits: world.credits };
}

function replaceLayer(
  world: WorldState,
  id: LayerId,
  game: GameState,
): WorldState {
  const { credits, ...layer } = game;
  return {
    ...world,
    credits,
    layers: { ...world.layers, [id]: { ...world.layers[id], ...layer } },
  };
}

/** Resume existing outposts on entry; paused legacy saves keep their historical offline rules. */
export function resumeProduction(world: WorldState): WorldState {
  let layers = world.layers;
  for (const id of LAYER_IDS) {
    const layer = layers[id];
    if (layer && !layer.running)
      layers = { ...layers, [id]: { ...layer, running: true } };
  }
  return layers === world.layers ? world : { ...world, layers };
}

export function advanceWorld(world: WorldState, elapsedMs: number): WorldState {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0)
    throw new Error('Elapsed time must be a non-negative safe integer.');
  if (elapsedMs === 0) return world;
  let next = world;
  for (const id of LAYER_IDS) {
    if (!world.layers[id]) continue;
    const layer = next.layers[id];
    if (!layer?.running) continue;
    const config = getLayerProduction(next, id);
    let game = getLayerGame(next, id);
    const automation = layer.automation;
    const module = automation?.enabled
      ? AUTOMATION_LEVELS[automation.level - 1]
      : undefined;
    if (!module || !automation) {
      const advanced = advanceGame(game, elapsedMs, config);
      if (advanced !== game) next = replaceLayer(next, id, advanced);
      continue;
    }
    let remaining = elapsedMs;
    let elapsed = automation.elapsedMs;
    while (remaining > 0) {
      const step = Math.min(remaining, module.intervalMs - elapsed);
      game = advanceGame(game, step, config);
      elapsed += step;
      remaining -= step;
      if (elapsed === module.intervalMs) {
        const shipment = supplyExpedition(next, id, game, config);
        next = shipment.world;
        game = sellRefined(shipment.game, config);
        elapsed = 0;
      }
    }
    next = replaceLayer(next, id, game);
    next = {
      ...next,
      layers: {
        ...next.layers,
        [id]: {
          ...(next.layers[id] ?? layer),
          automation: { ...automation, elapsedMs: elapsed },
        },
      },
    };
  }
  return next;
}

export function getUnlockOffer(world: WorldState, id: LayerId) {
  const index = LAYER_IDS.indexOf(id);
  const previous = index > 0 ? LAYER_IDS[index - 1] : undefined;
  const unlocked = world.layers[id] !== undefined;
  const prerequisiteMet =
    previous === undefined || world.layers[previous] !== undefined;
  const discount =
    getCampaign(world).infrastructure.sonar *
    INFRASTRUCTURE.sonar.bonusPerLevel;
  const cost = Math.floor((LAYERS[id].unlockCost * (100 - discount)) / 100);
  return {
    cost,
    unlocked,
    prerequisiteMet,
    affordable: world.credits >= cost,
    canUnlock: !unlocked && prerequisiteMet && world.credits >= cost,
  };
}

export function unlockLayer(world: WorldState, id: LayerId): WorldState {
  const offer = getUnlockOffer(world, id);
  if (!offer.canUnlock) return world;
  return {
    ...world,
    credits: world.credits - offer.cost,
    selectedLayerId: id,
    layers: { ...world.layers, [id]: createLayer() },
  };
}
export function selectLayer(world: WorldState, id: LayerId): WorldState {
  return !world.layers[id] || id === world.selectedLayerId
    ? world
    : { ...world, selectedLayerId: id };
}
export function upgradeLayer(world: WorldState, id: UpgradeId): WorldState {
  const game = getLayerGame(world);
  const upgraded = buyUpgrade(game, id, getLayerProduction(world));
  return upgraded === game
    ? world
    : replaceLayer(world, world.selectedLayerId, upgraded);
}
export function sellLayer(world: WorldState): WorldState {
  const game = getLayerGame(world);
  const sold = sellRefined(game, getLayerProduction(world));
  return sold === game
    ? world
    : replaceLayer(world, world.selectedLayerId, sold);
}

export function getAutomationOffer(world: WorldState) {
  const layer = world.layers[world.selectedLayerId];
  const level = layer?.automation?.level ?? 0;
  const definition = AUTOMATION_LEVELS[level];
  const cost = definition
    ? definition.cost *
      LAYERS[world.selectedLayerId].production.upgradeCostMultiplier
    : null;
  return {
    level,
    cost,
    affordable: cost !== null && world.credits >= cost,
    intervalMs: AUTOMATION_LEVELS[level - 1]?.intervalMs ?? null,
    nextIntervalMs: definition?.intervalMs ?? null,
  };
}

export function upgradeAutomation(world: WorldState): WorldState {
  const offer = getAutomationOffer(world);
  const id = world.selectedLayerId;
  const layer = world.layers[id];
  if (!layer || !offer.affordable || offer.cost === null) return world;
  const old = layer.automation;
  return {
    ...world,
    credits: world.credits - offer.cost,
    layers: {
      ...world.layers,
      [id]: {
        ...layer,
        automation: {
          level: offer.level + 1,
          enabled: old?.enabled ?? true,
          elapsedMs:
            old && offer.intervalMs && offer.nextIntervalMs
              ? Math.floor(
                  (old.elapsedMs * offer.nextIntervalMs) / offer.intervalMs,
                )
              : 0,
        },
      },
    },
  };
}

export function toggleAutomation(world: WorldState): WorldState {
  const id = world.selectedLayerId;
  const layer = world.layers[id];
  if (!layer?.automation) return world;
  return {
    ...world,
    layers: {
      ...world.layers,
      [id]: {
        ...layer,
        automation: { ...layer.automation, enabled: !layer.automation.enabled },
      },
    },
  };
}

export function buyResearch(world: WorldState, id: ResearchId): WorldState {
  const offer = getResearchOffer(world, id);
  if (offer.cost === null || !offer.affordable) return world;
  const progression = getProgression(world);
  let next: WorldState = {
    ...world,
    credits: world.credits - offer.cost,
    progression: {
      ...progression,
      research: { ...progression.research, [id]: offer.level + 1 },
    },
  };
  // Capacity research releases already-completed work without granting elapsed time.
  if (id === 'storage')
    for (const layerId of LAYER_IDS) {
      if (!next.layers[layerId]) continue;
      next = replaceLayer(
        next,
        layerId,
        settleProduction(
          getLayerGame(next, layerId),
          getLayerProduction(next, layerId),
        ),
      );
    }
  return next;
}

export function claimMission(world: WorldState, id: MissionId): WorldState {
  if (!getMissionProgress(world, id).canClaim) return world;
  const progression = getProgression(world);
  return {
    ...world,
    credits: world.credits + MISSIONS[id].reward,
    progression: {
      ...progression,
      claimedMissions: [...progression.claimedMissions, id],
    },
  };
}

/** Shared facilities belong to this run. Buying capacity settles blocked work without advancing time. */
export function buyInfrastructure(
  world: WorldState,
  id: InfrastructureId,
): WorldState {
  const offer = getInfrastructureOffer(world, id);
  if (!offer.affordable || offer.cost === null) return world;
  const campaign = getCampaign(world);
  let next: WorldState = {
    ...world,
    credits: world.credits - offer.cost,
    campaign: {
      ...campaign,
      infrastructure: { ...campaign.infrastructure, [id]: offer.level + 1 },
    },
  };
  if (id === 'depot')
    for (const layerId of LAYER_IDS) {
      if (!next.layers[layerId]) continue;
      next = replaceLayer(
        next,
        layerId,
        settleProduction(
          getLayerGame(next, layerId),
          getLayerProduction(next, layerId),
        ),
      );
    }
  return next;
}
/** Pure reset policy. Persistence must fence other devices before adopting this world. */
export function prestigeWorld(world: WorldState): WorldState {
  const offer = getPrestigeOffer(world);
  if (!offer.canPrestige || offer.rank >= PRESTIGE.maxRank) return world;
  return { ...createWorld(), campaign: createCampaign(offer.rank + 1) };
}
