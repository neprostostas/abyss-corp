import { EXPEDITIONS } from '../data/expeditions';
import { CORE_LAYER_IDS } from '../data/layers';
import type { LayerId, ProductionConfig } from '../data/layers';
import { UPGRADE_IDS, UPGRADES } from '../data/balance';
import type { WorldState } from './world';
import type { GameState } from './game';
import { settleProduction } from './game';
import { createExpedition, getProgression } from './progression';
export { createExpedition } from './progression';
export function getExpeditionOffer(world: WorldState) {
  const progression = getProgression(world);
  const state = progression.expedition ?? createExpedition();
  const definition = EXPEDITIONS[state.completed];
  const unlocked =
    CORE_LAYER_IDS.every((id) => {
      const layer = world.layers[id];
      return (
        layer &&
        UPGRADE_IDS.every(
          (kind) => layer.levels[kind] === UPGRADES[kind].levels.length,
        ) &&
        layer.automation !== undefined
      );
    }) &&
    (['trade', 'storage'] as const).every(
      (id) => progression.research[id] >= 3,
    );
  const pilotsReady = CORE_LAYER_IDS.every(
    (id) =>
      (state.active &&
        definition !== undefined &&
        state.delivered[id] >= definition.targets[id]) ||
      (world.layers[id]?.running && world.layers[id].automation?.enabled),
  );
  const ready =
    !!definition &&
    state.active &&
    CORE_LAYER_IDS.every((id) => state.delivered[id] >= definition.targets[id]);
  return {
    state,
    definition,
    unlocked,
    pilotsReady,
    ready,
    canStart: unlocked && pilotsReady && !!definition && !state.active,
  };
}
export function startExpedition(world: WorldState): WorldState {
  if (!getExpeditionOffer(world).canStart) return world;
  const progression = getProgression(world);
  return {
    ...world,
    progression: {
      ...progression,
      expedition: {
        ...(progression.expedition ?? createExpedition()),
        active: true,
      },
    },
  };
}
export function claimExpedition(world: WorldState): WorldState {
  const offer = getExpeditionOffer(world);
  if (!offer.ready) return world;
  return {
    ...world,
    progression: {
      ...getProgression(world),
      expedition: {
        ...createExpedition(),
        completed: offer.state.completed + 1,
      },
    },
  };
}
/** Route each pilot's cargo into the accepted contract before selling the remainder. */
export function supplyExpedition(
  world: WorldState,
  id: LayerId,
  game: GameState,
  config: ProductionConfig,
) {
  const progression = getProgression(world);
  const state = progression.expedition;
  const definition = state?.active ? EXPEDITIONS[state.completed] : undefined;
  if (!state || !definition || !CORE_LAYER_IDS.some((core) => core === id))
    return { world, game };
  const coreId = id as (typeof CORE_LAYER_IDS)[number];
  const amount = Math.min(
    game.refined,
    definition.targets[coreId] - state.delivered[coreId],
  );
  if (amount <= 0) return { world, game };
  return {
    world: {
      ...world,
      progression: {
        ...progression,
        expedition: {
          ...state,
          delivered: {
            ...state.delivered,
            [coreId]: state.delivered[coreId] + amount,
          },
        },
      },
    },
    game: settleProduction({ ...game, refined: game.refined - amount }, config),
  };
}
