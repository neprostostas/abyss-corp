import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceWorld,
  buyResearch,
  claimMission,
  createLayer,
  createWorld,
  selectLayer,
  sellLayer,
  toggleAutomation,
  unlockLayer,
  upgradeAutomation,
  upgradeLayer,
} from '../src/domain/world';
import type { WorldState } from '../src/domain/world';
import {
  claimExpedition,
  getExpeditionOffer,
  startExpedition,
} from '../src/domain/expeditions';
import { createProgression } from '../src/domain/progression';
import { UPGRADE_IDS } from '../src/data/balance';
import { LAYER_IDS } from '../src/data/layers';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { gameSave } from './fixtures';

const validate = (world: WorldState) => validateSave({ ...gameSave(), world });

for (let initialSeed = 1; initialSeed <= 16; initialSeed++) {
  void test(`gameplay seed ${String(initialSeed)}: actions, time partitioning, immutability and save validity`, () => {
    let seed = initialSeed;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    let world = { ...createWorld(), credits: Math.floor(random() * 2000) };
    for (let step = 0; step < 250; step++) {
      const id =
        LAYER_IDS[Math.floor(random() * LAYER_IDS.length)] ?? 'shallows';
      const upgrade =
        UPGRADE_IDS[Math.floor(random() * UPGRADE_IDS.length)] ?? 'mining';
      world = selectLayer(world, id);
      const actions = [
        () => upgradeLayer(world, upgrade),
        () => upgradeAutomation(world),
        () => sellLayer(world),
        () => buyResearch(world, random() < 0.5 ? 'trade' : 'storage'),
        () => unlockLayer(world, id),
        () => toggleAutomation(world),
        () => startExpedition(world),
        () => claimExpedition(world),
        () => claimMission(world, 'improve'),
      ];
      world = actions[Math.floor(random() * actions.length)]?.() ?? world;
      const before = structuredClone(world);
      const elapsed = Math.floor(random() * 60_000);
      const whole = advanceWorld(world, elapsed);
      let partitioned = world;
      for (let remaining = elapsed; remaining > 0;) {
        const delta = Math.min(1000, remaining);
        partitioned = advanceWorld(partitioned, delta);
        remaining -= delta;
      }
      assert.deepEqual(
        whole,
        partitioned,
        `seed ${String(initialSeed)}, step ${String(step)}`,
      );
      assert.deepEqual(world, before, 'simulation must not mutate the input');
      validate(whole);
      world = whole;
    }
  });
}

void test('locked, empty and unaffordable commands cannot spend or create resources', () => {
  const world = createWorld();
  for (const id of UPGRADE_IDS) assert.equal(upgradeLayer(world, id), world);
  assert.equal(unlockLayer(world, 'pearl-caverns'), world);
  assert.equal(sellLayer(world), world);
  assert.equal(buyResearch(world, 'trade'), world);
  assert.equal(startExpedition(world), world);
  for (const elapsed of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => advanceWorld(world, elapsed));
});

void test('full buffers do not bank free work and expanding storage releases completed work', () => {
  const world: WorldState = {
    ...createWorld(),
    credits: 1000,
    layers: {
      shallows: {
        ...createLayer(),
        raw: 6,
        refined: 6,
        processingElapsedMs: 6000,
        phase: 'delivering',
        phaseElapsedMs: 2500,
      },
    },
  };
  validate(world);
  assert.deepEqual(advanceWorld(world, 3_600_000), world);
  const expanded = upgradeLayer(world, 'storage');
  validate(expanded);
  assert((expanded.layers.shallows?.refined ?? 0) > 6);
});

void test('wallet limits retain unsold cargo and keep credits in the safe integer range', () => {
  const world: WorldState = {
    ...createWorld(),
    credits: Number.MAX_SAFE_INTEGER - 1,
    layers: {
      shallows: {
        ...createLayer(),
        refined: 6,
        automation: { level: 3, enabled: true, elapsedMs: 0 },
      },
    },
  };
  assert.equal(sellLayer(world).credits, world.credits);
  assert.equal(sellLayer(world).layers.shallows?.refined, 6);
  const advanced = advanceWorld(world, 4 * 3_600_000);
  assert(Number.isSafeInteger(advanced.credits));
  validate(advanced);
});

void test('all expeditions work with first-level pilots; claims and reloads cannot repeat rewards', () => {
  let world: WorldState = {
    ...createWorld(),
    progression: { ...createProgression(), research: { trade: 3, storage: 3 } },
    layers: Object.fromEntries(
      LAYER_IDS.map((id) => [
        id,
        {
          ...createLayer(),
          levels: { mining: 5, transport: 5, processing: 5, storage: 5 },
          automation: { level: 1, enabled: true, elapsedMs: 0 },
        },
      ]),
    ),
  };
  for (let completed = 1; completed <= 3; completed++) {
    assert(getExpeditionOffer(world).canStart);
    world = advanceWorld(startExpedition(world), 180_000);
    assert(getExpeditionOffer(world).ready);
    world = claimExpedition(world);
    assert.equal(claimExpedition(world), world);
    world = validateSave(JSON.parse(JSON.stringify(validate(world)))).world;
    assert.equal(world.progression?.expedition?.completed, completed);
  }
  assert.equal(getExpeditionOffer(world).canStart, false);
});
