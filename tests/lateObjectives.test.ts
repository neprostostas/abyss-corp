import type { WorldState } from '../src/domain/world';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CORE_LAYER_IDS } from '../src/data/layers';
import { EXPEDITIONS } from '../src/data/expeditions';
import { MISSION_IDS } from '../src/data/progression';
import { createExpedition } from '../src/domain/progression';
import { getMissionProgress } from '../src/domain/progression';
import {
  getExpeditionOffer,
  startExpedition,
  claimExpedition,
  supplyExpedition,
} from '../src/domain/expeditions';
import { advanceWorld, claimMission, getLayerGame } from '../src/domain/world';
import { getLayerProduction } from '../src/domain/progression';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { completedWorld, gameSave } from './fixtures';

function awaitingFourth() {
  const full = completedWorld();
  return {
    ...full,
    credits: 0,
    progression: {
      ...full.progression,
      expedition: { ...createExpedition(), completed: 3 },
    },
  };
}

void test('legacy three-contract saves retain progress and wait for the 900 m outpost', () => {
  const full = awaitingFourth();
  const legacy = {
    ...full,
    progression: {
      ...full.progression,
      claimedMissions: full.progression.claimedMissions.filter(
        (id) => id !== 'vents' && id !== 'rift',
      ),
      research: { trade: 3, storage: 3 },
    },
    layers: Object.fromEntries(
      CORE_LAYER_IDS.map((id) => [id, full.layers[id]]),
    ),
  };
  const loaded = validateSave({ ...gameSave(), world: legacy }).world;
  assert.equal(loaded.progression?.expedition?.completed, 3);
  assert.equal(loaded.progression.claimedMissions.length, 7);
  assert.equal(getMissionProgress(loaded, 'vents').canClaim, false);
  const offer = getExpeditionOffer(loaded);
  assert.equal(offer.definition?.name, 'Stabilize the thermal station');
  assert.deepEqual(offer.sourceIds, ['thermal-vents']);
  assert.equal(offer.canStart, false);
  assert.equal(startExpedition(loaded), loaded);
  assert.equal(claimExpedition(loaded), loaded);
});

void test('late contracts consume only listed sources and require their undelivered pilots', () => {
  const full = awaitingFourth();
  assert(full.layers.shallows && full.layers['thermal-vents']);
  const pausedCore = {
    ...full,
    layers: {
      ...full.layers,
      shallows: { ...full.layers.shallows, running: false },
    },
  };
  assert(getExpeditionOffer(pausedCore).canStart);
  const offDuty = {
    ...pausedCore,
    layers: {
      ...pausedCore.layers,
      'thermal-vents': {
        ...full.layers['thermal-vents'],
        automation: { level: 3, enabled: false, elapsedMs: 0 },
      },
    },
  };
  assert.equal(getExpeditionOffer(offDuty).canStart, false);
  const active = startExpedition(pausedCore);
  assert.equal(getExpeditionOffer(active).ready, false);
  const game = { ...getLayerGame(active, 'shallows'), refined: 30 };
  const untouched = supplyExpedition(
    active,
    'shallows',
    game,
    getLayerProduction(active, 'shallows'),
  );
  assert.equal(untouched.world, active);
  assert.equal(untouched.game, game);
  const source = { ...getLayerGame(active, 'thermal-vents'), refined: 48 };
  const shipment = supplyExpedition(
    active,
    'thermal-vents',
    source,
    getLayerProduction(active, 'thermal-vents'),
  );
  assert.equal(
    shipment.world.progression?.expedition?.delivered['thermal-vents'],
    45,
  );
  assert.equal(shipment.game.refined, 3);
  assert(getExpeditionOffer(shipment.world).ready);
  const next = claimExpedition(shipment.world);
  assert.equal(next.progression?.expedition?.completed, 4);
  assert.equal(claimExpedition(next), next);
  assert.deepEqual(getExpeditionOffer(next).sourceIds, [
    'thermal-vents',
    'midnight-rift',
  ]);
  assert.equal(getExpeditionOffer(startExpedition(next)).ready, false);
});

void test('both late contracts complete through production and preserve offline/reload equivalence', () => {
  let world: WorldState = awaitingFourth();
  for (const completed of [4, 5]) {
    const active = startExpedition(world);
    assert(getExpeditionOffer(active).state.active);
    const whole = advanceWorld(active, 180000);
    let chunked: WorldState = active;
    for (let i = 0; i < 180; i++) chunked = advanceWorld(chunked, 1000);
    assert.deepEqual(chunked, whole);
    assert(getExpeditionOffer(whole).ready);
    const loaded = validateSave(
      JSON.parse(JSON.stringify({ ...gameSave(), world: whole })),
    ).world;
    world = claimExpedition(loaded);
    assert.equal(world.progression?.expedition?.completed, completed);
    assert.equal(claimExpedition(world), world);
  }
  assert.equal(world.progression?.expedition?.completed, EXPEDITIONS.length);
});

void test('late cargo and completed contracts cannot refer to locked sources or exceed targets', () => {
  const world = awaitingFourth();
  const active = startExpedition(world);
  assert.throws(
    () =>
      validateSave({
        ...gameSave(),
        world: {
          ...active,
          progression: {
            ...active.progression,
            expedition: {
              ...getExpeditionOffer(active).state,
              delivered: {
                ...createExpedition().delivered,
                'thermal-vents': 46,
              },
            },
          },
        },
      }),
    /Invalid expedition cargo/,
  );
  const legacy = {
    ...world,
    layers: Object.fromEntries(
      CORE_LAYER_IDS.map((id) => [id, world.layers[id]]),
    ),
    progression: {
      ...world.progression,
      expedition: { ...createExpedition(), completed: 4 },
    },
  };
  assert.throws(
    () => validateSave({ ...gameSave(), world: legacy }),
    /source outpost/,
  );
});

void test('900 m and 1900 m missions are earned at their own depth and claimed once', () => {
  const full = completedWorld();
  const world = {
    ...full,
    credits: 0,
    progression: { ...full.progression, claimedMissions: [] },
  };
  const shallow = {
    ...world,
    layers: Object.fromEntries(
      CORE_LAYER_IDS.map((id) => [id, world.layers[id]]),
    ),
  };
  assert.equal(getMissionProgress(shallow, 'vents').canClaim, false);
  assert.equal(getMissionProgress(shallow, 'rift').canClaim, false);
  assert(world.layers['thermal-vents']);
  const vent = {
    ...world,
    layers: {
      ...shallow.layers,
      'thermal-vents': world.layers['thermal-vents'],
    },
  };
  assert(getMissionProgress(vent, 'vents').canClaim);
  assert.equal(getMissionProgress(vent, 'rift').canClaim, false);
  const claimed = claimMission(claimMission(world, 'vents'), 'rift');
  assert.equal(claimed.credits, 1300);
  const loaded = validateSave(
    JSON.parse(JSON.stringify({ ...gameSave(), world: claimed })),
  ).world;
  assert.equal(claimMission(loaded, 'vents'), loaded);
  assert.equal(claimMission(loaded, 'rift'), loaded);
  assert.equal(MISSION_IDS.length, 9);
});

void test('a legacy active third contract keeps its cargo and can finish before unlocking 900 m', () => {
  const full = awaitingFourth();
  const world = {
    ...full,
    layers: Object.fromEntries(
      CORE_LAYER_IDS.map((id) => [id, full.layers[id]]),
    ),
    progression: {
      ...full.progression,
      expedition: {
        completed: 2,
        active: true,
        delivered: { shallows: 30, 'golden-trench': 15, 'pearl-caverns': 9 },
      },
    },
  };
  const loaded = validateSave(
    JSON.parse(JSON.stringify({ ...gameSave(), world })),
  ).world;
  assert.deepEqual(
    loaded.progression?.expedition,
    world.progression.expedition,
  );
  assert.deepEqual(getExpeditionOffer(loaded).sourceIds, [...CORE_LAYER_IDS]);
  const ready = advanceWorld(loaded, 180000);
  assert(getExpeditionOffer(ready).ready);
  const claimed = claimExpedition(ready);
  assert.equal(claimed.progression?.expedition?.completed, 3);
  assert.equal(getExpeditionOffer(claimed).canStart, false);
  assert.equal(claimExpedition(claimed), claimed);
});
