import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  INFRASTRUCTURE_IDS,
  INFRASTRUCTURE,
  PRESTIGE,
} from '../src/data/campaign';
import { LAYER_IDS, CORE_LAYER_IDS } from '../src/data/layers';
import {
  getCampaign,
  getInfrastructureOffer,
  getPrestigeOffer,
  createCampaign,
} from '../src/domain/campaign';
import {
  advanceWorld,
  buyInfrastructure,
  createLayer,
  createWorld,
  getUnlockOffer,
  prestigeWorld,
  selectLayer,
  unlockLayer,
} from '../src/domain/world';
import type { WorldState } from '../src/domain/world';
import {
  getLayerProduction,
  createProgression,
} from '../src/domain/progression';
import { GameSession } from '../src/application/GameSession';
import { GuestSaveRepository } from '../src/infrastructure/persistence/GuestSaveRepository';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { FakeClock, MemoryStorage, gameSave, deferred } from './fixtures';
import { startExpedition, getExpeditionOffer } from '../src/domain/expeditions';

function frontier(): WorldState {
  let world: WorldState = { ...createWorld(), credits: 100000 };
  for (const id of LAYER_IDS) world = unlockLayer(world, id);
  return world;
}
const roundtrip = (world: WorldState) =>
  validateSave(JSON.parse(JSON.stringify({ ...gameSave(), world }))).world;

void test('five depths open sequentially, spend once and survive serialization', () => {
  let world: WorldState = { ...createWorld(), credits: 100000 };
  assert.equal(unlockLayer(world, 'thermal-vents'), world);
  for (const id of LAYER_IDS) {
    const before = world;
    const offer = getUnlockOffer(world, id);
    world = unlockLayer(world, id);
    assert.equal(
      world.credits,
      before.credits - (offer.unlocked ? 0 : offer.cost),
    );
    assert.equal(unlockLayer(world, id), world);
    world = roundtrip(world);
  }
  assert.equal(world.selectedLayerId, 'midnight-rift');
  assert.equal(
    selectLayer(createWorld(), 'midnight-rift').selectedLayerId,
    'shallows',
  );
  assert.equal(getLayerProduction(world).resource.refinedValue, 360);
});
void test('shared facilities enforce prerequisites, safe integer costs and bounded levels', () => {
  const locked = { ...createWorld(), credits: 100000 };
  for (const id of INFRASTRUCTURE_IDS)
    assert.equal(buyInfrastructure(locked, id), locked);
  let world = frontier();
  for (const id of INFRASTRUCTURE_IDS) {
    for (const cost of INFRASTRUCTURE[id].costs) {
      const before = world.credits;
      world = buyInfrastructure(world, id);
      assert.equal(world.credits, before - cost);
      assert.equal(buyInfrastructure({ ...world, credits: 0 }, id).credits, 0);
      world = roundtrip(world);
    }
    assert.equal(getInfrastructureOffer(world, id).cost, null);
    assert.equal(buyInfrastructure(world, id), world);
  }
  for (const id of LAYER_IDS) {
    const config = getLayerProduction(world, id);
    assert.equal(config.storageBonus, 24);
    assert(Number.isSafeInteger(config.resource.refinedValue));
  }
});
void test('sonar discounts only future unlocks and a depot releases blocked production without time', () => {
  let world: WorldState = { ...createWorld(), credits: 10000 };
  world = unlockLayer(world, 'golden-trench');
  world = buyInfrastructure(world, 'sonar');
  assert.equal(getUnlockOffer(world, 'thermal-vents').cost, 4320);
  world = {
    ...world,
    layers: {
      ...world.layers,
      shallows: {
        ...createLayer(),
        phase: 'delivering',
        phaseElapsedMs: 2500,
        raw: 6,
        refined: 6,
        processingElapsedMs: 6000,
      },
    },
  };
  const next = roundtrip(buyInfrastructure(world, 'depot'));
  assert.equal(next.layers.shallows?.phase, 'returning');
  assert.equal(next.layers.shallows.phaseElapsedMs, 0);
  assert.equal(next.layers.shallows.refined, 9);
});
void test('prestige checks eligibility, resets the complete run and retains only its permanent rank', () => {
  const empty = createWorld();
  assert.equal(prestigeWorld(empty), empty);
  let world = frontier();
  world = buyInfrastructure(world, 'exchange');
  const tooPoor = { ...world, credits: PRESTIGE.requiredCredits - 1 };
  assert.equal(prestigeWorld(tooPoor), tooPoor);
  const next = roundtrip(prestigeWorld(world));
  assert.deepEqual(next, { ...createWorld(), campaign: createCampaign(1) });
  assert.equal(getLayerProduction(next).resource.refinedValue, 12);
  assert.equal(getPrestigeOffer(next).canPrestige, false);
  assert.equal(prestigeWorld(next), next);
  const maxed = { ...world, campaign: createCampaign(PRESTIGE.maxRank) };
  assert.equal(prestigeWorld(maxed), maxed);
});
void test('new depths do not raise old expedition requirements or consume unrelated cargo', () => {
  const layers = Object.fromEntries(
    CORE_LAYER_IDS.map((id) => [
      id,
      {
        ...createLayer(),
        levels: { mining: 5, transport: 5, processing: 5, storage: 5 },
        automation: { level: 3, enabled: true, elapsedMs: 0 },
      },
    ]),
  );
  const old: WorldState = {
    ...createWorld(),
    layers,
    progression: { ...createProgression(), research: { trade: 3, storage: 3 } },
  };
  assert(getExpeditionOffer(old).canStart);
  const world: WorldState = {
    ...old,
    layers: {
      ...layers,
      'thermal-vents': {
        ...createLayer(),
        automation: { level: 3, enabled: true, elapsedMs: 0 },
      },
    },
  };
  const next = roundtrip(advanceWorld(startExpedition(world), 180000));
  assert(getExpeditionOffer(next).ready);
  assert(next.credits > 0);
  assert.equal(next.progression?.expedition?.delivered.shallows, 30);
});
void test('five automated depths with infrastructure and prestige are time-partition invariant', () => {
  let world: WorldState = {
    ...frontier(),
    campaign: { rank: 4, infrastructure: { depot: 3, exchange: 3, sonar: 3 } },
  };
  world = {
    ...world,
    layers: Object.fromEntries(
      LAYER_IDS.map((id) => [
        id,
        {
          ...createLayer(),
          levels: { mining: 5, transport: 5, processing: 5, storage: 5 },
          automation: { level: 3, enabled: true, elapsedMs: 0 },
        },
      ]),
    ),
  };
  const whole = advanceWorld(world, 4 * 60 * 60 * 1000);
  let split = world;
  for (let index = 0; index < 48; index++)
    split = roundtrip(advanceWorld(split, 300000));
  assert.deepEqual(split, whole);
});
void test('guest prestige fences stale tabs, double taps and reloads without repeating rank rewards', async () => {
  const storage = new MemoryStorage();
  const repository = new GuestSaveRepository(() => storage);
  const clock = new FakeClock();
  await repository.save({ ...gameSave(), world: frontier() });
  const stale = new GuestSaveRepository(() => storage);
  await stale.load();
  const session = new GameSession(repository, clock);
  await session.initialize();
  session.setActive(true);
  const first = session.prestige(0);
  await assert.rejects(session.prestige(0), /busy/);
  await first;
  await session.save(true);
  assert.equal(getCampaign(session.getSnapshot().world).rank, 1);
  assert.equal(session.getSnapshot().world.credits, 0);
  await assert.rejects(stale.save(gameSave(99999)), /restarted/);
  await assert.rejects(session.prestige(0), /changed/);
  const saved = await repository.load();
  assert(saved);
  assert.equal(getCampaign(saved.world).rank, 1);
});
void test('failed prestige persistence leaves the original run intact and unlocks commands', async () => {
  const initial = { ...gameSave(), world: frontier() };
  const session = new GameSession(
    {
      load: () => Promise.resolve(initial),
      save: () => Promise.resolve(),
      prestige: () => Promise.reject(new Error('Offline')),
    },
    new FakeClock(),
  );
  await session.initialize();
  const before = session.getSnapshot().world;
  await assert.rejects(session.prestige(0), /Offline/);
  assert.equal(session.getSnapshot().world, before);
  session.select('shallows');
  assert.equal(session.getSnapshot().world.selectedLayerId, 'shallows');
});
void test('campaign validation rejects impossible content, malformed ranks and legacy envelopes', () => {
  const save = gameSave();
  for (const rank of [-1, 0.5, PRESTIGE.maxRank + 1])
    assert.throws(() =>
      validateSave({
        ...save,
        world: { ...save.world, campaign: createCampaign(rank) },
      }),
    );
  assert.throws(() => validateSave({ ...save, version: 7 }));
  assert.throws(() =>
    validateSave({
      ...save,
      world: {
        ...save.world,
        campaign: {
          rank: 0,
          infrastructure: { depot: 1, exchange: 0, sonar: 0 },
        },
      },
    }),
  );
  assert.throws(() =>
    validateSave({
      ...save,
      world: {
        ...save.world,
        layers: { ...save.world.layers, 'midnight-rift': createLayer() },
      },
    }),
  );
});

void test('backgrounding during a pending prestige keeps the resumed session inactive', async () => {
  const gate = deferred();
  const clock = new FakeClock();
  const session = new GameSession(
    {
      load: () => Promise.resolve({ ...gameSave(), world: frontier() }),
      save: () => Promise.resolve(),
      prestige: () => gate.promise,
    },
    clock,
  );
  await session.initialize();
  session.setActive(true);
  const resetting = session.prestige(0);
  await Promise.resolve();
  session.setActive(false);
  gate.resolve();
  await resetting;
  clock.advance(1000);
  session.tick();
  assert.equal(session.getSnapshot().world.layers.shallows?.phaseElapsedMs, 0);
  session.setActive(true);
  assert.equal(
    session.getSnapshot().world.layers.shallows?.phaseElapsedMs,
    1000,
  );
});
