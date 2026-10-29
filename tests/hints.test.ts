import { getProgression } from '../src/domain/progression';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getProductionHint } from '../src/domain/hints';
import { createWorld, createLayer } from '../src/domain/world';
import type { WorldState } from '../src/domain/world';
import { MISSION_IDS } from '../src/data/progression';
const base = (): WorldState => ({
  ...createWorld(),
  progression: {
    research: { trade: 0, storage: 0 },
    claimedMissions: [...MISSION_IDS],
  },
});
void test('maxed submarine is never recommended or described as slow', () => {
  const world = base();
  const hint = getProductionHint({
    ...world,
    layers: {
      shallows: {
        ...createLayer(),
        levels: { mining: 1, transport: 5, processing: 1, storage: 1 },
      },
    },
  });
  assert.notEqual(hint.upgrade, 'transport');
  assert(!hint.text.includes('submarine'));
  assert(!hint.text.includes('Slowest'));
});
void test('storage pressure and paused pilots take priority over spending', () => {
  const world = base();
  const full = { ...createLayer(), refined: 6 };
  assert.match(
    getProductionHint({ ...world, credits: 10000, layers: { shallows: full } })
      .text,
    /sell cargo/,
  );
  assert.match(
    getProductionHint({
      ...world,
      layers: {
        shallows: {
          ...full,
          automation: { level: 1, enabled: false, elapsedMs: 0 },
        },
      },
    }).text,
    /enable pilot/,
  );
  assert.match(
    getProductionHint({
      ...world,
      layers: { shallows: { ...full, running: false } },
    }).text,
    /Resume/,
  );
});
void test('upgrade recommendations offer a real throughput gain and affordable purchase', () => {
  const world = { ...base(), credits: 50 };
  const hint = getProductionHint(world);
  assert.equal(hint.upgrade, 'transport');
  assert.match(hint.text, /\+\d+% output/);
  assert.equal(getProductionHint({ ...world, credits: 0 }).upgrade, null);
});
void test('hints distinguish rewards, automation, expansion and completed machinery', () => {
  assert.match(
    getProductionHint({ ...base(), credits: 100 }).text,
    /cargo pilot/,
  );
  const layer = {
    ...createLayer(),
    automation: { level: 3, enabled: true, elapsedMs: 0 },
  };
  assert.match(
    getProductionHint({ ...base(), credits: 1000, layers: { shallows: layer } })
      .text,
    /180 m/,
  );
  assert.match(
    getProductionHint({
      ...createWorld(),
      progression: { research: { trade: 1, storage: 0 }, claimedMissions: [] },
    }).text,
    /mission reward/,
  );
  assert.match(
    getProductionHint({
      ...base(),
      layers: {
        shallows: {
          ...layer,
          levels: { mining: 5, transport: 5, processing: 5, storage: 5 },
        },
      },
    }).text,
    /fully upgraded/,
  );
});

void test('selling suggestions account for affordable upgrades without interrupting contracts', () => {
  const world: WorldState = {
    ...base(),
    credits: 0,
    layers: {
      shallows: {
        ...createLayer(),
        refined: 3,
        automation: { level: 3, enabled: true, elapsedMs: 0 },
      },
    },
  };
  assert.match(getProductionHint(world).text, /Sell to fund submarine/);
  const active = {
    ...world,
    progression: {
      ...getProgression(base()),
      expedition: {
        completed: 0,
        active: true,
        delivered: { shallows: 0, 'golden-trench': 0, 'pearl-caverns': 0 },
      },
    },
  };
  assert(!getProductionHint(active).text.startsWith('Sell to fund'));
});
void test('full storage does not recommend faster pickup when the pilot can keep up', () => {
  const world: WorldState = {
    ...base(),
    credits: 190,
    layers: {
      shallows: {
        ...createLayer(),
        refined: 6,
        automation: { level: 1, enabled: true, elapsedMs: 0 },
      },
    },
  };
  assert.equal(getProductionHint(world).text, 'Sell cargo or await pickup');
  assert(world.layers.shallows);
  const fast = {
    ...world,
    layers: {
      shallows: {
        ...world.layers.shallows,
        levels: { mining: 5, transport: 5, processing: 5, storage: 1 },
      },
    },
  };
  assert.equal(getProductionHint(fast).text, 'Speed up cargo pickup');
});

void test('completed expedition reward is not hidden by a paused base or full warehouse', () => {
  const world: WorldState = {
    ...base(),
    layers: { shallows: { ...createLayer(), refined: 6, running: false } },
    progression: {
      ...getProgression(base()),
      expedition: {
        completed: 0,
        active: true,
        delivered: { shallows: 30, 'golden-trench': 24, 'pearl-caverns': 18 },
      },
    },
  };
  assert.equal(getProductionHint(world).text, 'Claim expedition bonus');
});
