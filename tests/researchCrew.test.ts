import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWorld,
  createLayer,
  buyResearch,
  upgradeSpecialist,
  getSpecialistOffer,
  getUnlockOffer,
  upgradeLayer,
  advanceWorld,
} from '../src/domain/world';
import type { WorldState } from '../src/domain/world';
import {
  getLayerProduction,
  getProgression,
  getResearchOffer,
} from '../src/domain/progression';
import { getUpgradeLevel } from '../src/domain/game';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { gameSave } from './fixtures';

void test('engineering discounts actual purchases with integer prices; surveying stacks with sonar', () => {
  let world: WorldState = { ...createWorld(), credits: 10000 };
  world = buyResearch(world, 'engineering');
  const price = getUpgradeLevel('mining', 2, getLayerProduction(world)).cost;
  assert.equal(price, 23);
  assert.equal(upgradeLayer(world, 'mining').credits, world.credits - price);
  world = buyResearch(world, 'surveying');
  world = {
    ...world,
    campaign: { rank: 0, infrastructure: { depot: 0, exchange: 0, sonar: 1 } },
  };
  assert.equal(getUnlockOffer(world, 'golden-trench').cost, 172);
  world = {
    ...world,
    progression: {
      ...getProgression(world),
      research: { ...getProgression(world).research, engineering: 3 },
    },
  };
  assert.equal(
    getResearchOffer(world, 'engineering').requiredDepth,
    'thermal-vents',
  );
  assert.equal(buyResearch(world, 'engineering'), world);
});
void test('specialists are local, capped and survive save validation with their expanded cargo', () => {
  let world: WorldState = {
    ...createWorld(),
    credits: 10000,
    layers: { shallows: createLayer(), 'golden-trench': createLayer() },
  };
  for (let i = 0; i < 3; i++)
    world = upgradeSpecialist(
      upgradeSpecialist(world, 'quartermaster'),
      'broker',
    );
  assert.equal(getSpecialistOffer(world, 'broker').cost, null);
  assert.equal(upgradeSpecialist(world, 'broker'), world);
  assert.equal(getLayerProduction(world).storageBonus, 12);
  assert.equal(getLayerProduction(world, 'golden-trench').storageBonus, 0);
  world = {
    ...world,
    layers: {
      ...world.layers,
      shallows: { ...createLayer(), ...world.layers.shallows, refined: 18 },
    },
  };
  const saved = validateSave(
    JSON.parse(JSON.stringify({ ...gameSave(), world })),
  );
  assert.deepEqual(saved.world.layers.shallows?.specialists, {
    quartermaster: 3,
    broker: 3,
  });
  assert.equal(saved.world.layers.shallows.refined, 18);
  assert.equal(
    getProgression(validateSave(gameSave()).world).research.engineering,
    0,
  );
  assert.throws(() =>
    validateSave({
      ...gameSave(),
      world: {
        ...world,
        progression: {
          ...getProgression(world),
          research: { trade: 0, storage: 0, surveying: 6 },
        },
      },
    }),
  );
  assert.equal(upgradeSpecialist(createWorld(), 'broker').credits, 0);
});
void test('trade officer boosts pilot sales equally across continuous and chunked offline simulation', () => {
  const seed: WorldState = {
    ...createWorld(),
    credits: 10000,
    layers: {
      shallows: {
        ...createLayer(),
        automation: { level: 1, enabled: true, elapsedMs: 0 },
      },
    },
  };
  const trained = upgradeSpecialist(
    upgradeSpecialist(seed, 'broker'),
    'broker',
  );
  const start = { ...trained, credits: 0 };
  const offline = advanceWorld(start, 120000);
  let chunked = start;
  for (let i = 0; i < 120; i++) chunked = advanceWorld(chunked, 1000);
  assert.deepEqual(chunked, offline);
  assert(
    offline.credits > advanceWorld({ ...seed, credits: 0 }, 120000).credits,
  );
});
