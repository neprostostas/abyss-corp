import { completedWorld } from './fixtures';
import { PRESTIGE } from '../src/data/campaign';
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
    /180 m/,
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

void test('maxed local production points to unfinished production or crew on another depth', () => {
  const complete = { ...completedWorld(), credits: 0 };
  assert(complete.layers['golden-trench']);
  assert(complete.layers['midnight-rift']);
  const production: WorldState = {
    ...complete,
    layers: {
      ...complete.layers,
      'golden-trench': {
        ...complete.layers['golden-trench'],
        levels: { mining: 4, transport: 5, processing: 5, storage: 5 },
      },
    },
  };
  assert.equal(getProductionHint(production).text, 'Finish production · 180 m');
  const crew: WorldState = {
    ...complete,
    layers: {
      ...complete.layers,
      'midnight-rift': {
        ...complete.layers['midnight-rift'],
        specialists: { quartermaster: 2, broker: 3 },
      },
    },
  };
  assert.equal(getProductionHint(crew).text, 'Max crew · 1,900 m · Base');
});

void test('late research and network goals stay visible even when no purchase is affordable', () => {
  const complete = { ...completedWorld(), credits: 0 };
  const research = {
    ...complete,
    progression: {
      ...complete.progression,
      research: { ...complete.progression.research, trade: 4 },
    },
  };
  assert.equal(
    getProductionHint(research).text,
    'Max trade & storage · Research',
  );
  const network = {
    ...complete,
    campaign: {
      ...complete.campaign,
      infrastructure: { ...complete.campaign.infrastructure, sonar: 2 },
    },
  };
  assert.equal(
    getProductionHint(network).text,
    'Max network facilities · Base',
  );
});

void test('completed run hints distinguish remaining credits, sellable cargo, readiness and maximum rank', () => {
  const complete = { ...completedWorld(), credits: 1946 };
  assert(complete.layers.shallows);
  assert.equal(getProductionHint(complete).text, 'Prestige · 23,054 CR to go');
  assert.equal(
    getProductionHint({
      ...complete,
      campaign: { ...complete.campaign, rank: 1 },
    }).text,
    'Prestige · 30,054 CR to go',
  );
  assert.equal(
    getProductionHint({ ...complete, credits: 25000 }).text,
    'Prestige ready · Base',
  );
  const cargo = {
    ...complete,
    credits: 24999,
    layers: {
      ...complete.layers,
      shallows: { ...complete.layers.shallows, refined: 3 },
    },
  };
  assert.equal(getProductionHint(cargo).text, 'Sell cargo to reach prestige');
  const maximum = {
    ...complete,
    campaign: { ...complete.campaign, rank: PRESTIGE.maxRank },
  };
  assert.equal(
    getProductionHint(maximum).text,
    'Maximum prestige rank reached',
  );
  const paused = {
    ...complete,
    layers: {
      ...complete.layers,
      shallows: { ...complete.layers.shallows, running: false },
    },
  };
  assert.equal(getProductionHint(paused).text, 'Resume production');
});

void test('ready prestige takes priority over affordable optional research', () => {
  const complete = completedWorld();
  const world = {
    ...complete,
    progression: {
      ...complete.progression,
      research: { trade: 5, storage: 5, engineering: 0, surveying: 0 },
    },
  };
  assert.equal(getProductionHint(world).text, 'Prestige ready · Base');
  assert.equal(
    getProductionHint({ ...world, credits: 1946 }).text,
    'Prestige · 23,054 CR to go',
  );
});

void test('expired discount research does not hide the remaining crew goal', () => {
  const complete = completedWorld();
  assert(complete.layers['midnight-rift']);
  const world = {
    ...complete,
    credits: 300,
    progression: {
      ...complete.progression,
      research: { trade: 5, storage: 5, engineering: 0, surveying: 0 },
    },
    layers: {
      ...complete.layers,
      'midnight-rift': {
        ...complete.layers['midnight-rift'],
        specialists: { quartermaster: 2, broker: 3 },
      },
    },
  };
  assert.equal(getProductionHint(world).text, 'Max crew · 1,900 m · Base');
});
