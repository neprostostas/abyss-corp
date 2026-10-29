import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GuestSaveRepository } from '../src/infrastructure/persistence/GuestSaveRepository';
import { GameSession } from '../src/application/GameSession';
import {
  createWorld,
  createLayer,
  sellLayer,
  advanceWorld,
} from '../src/domain/world';
import { getLayerProduction } from '../src/domain/progression';
import { MemoryStorage, gameSave, FakeClock, DeviceSave } from './fixtures';

void test('failed guest reset preserves the original save and allows retry', async () => {
  const storage = new MemoryStorage();
  const repository = new GuestSaveRepository(() => storage);
  await repository.save(gameSave(1234));
  const original = storage.getItem(repository.key);
  const write = storage.setItem.bind(storage);
  storage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  await assert.rejects(repository.reset(gameSave()), /Quota/);
  assert.equal(storage.getItem(repository.key), original);
  storage.setItem = write;
  await repository.save(gameSave(1500));
  assert.equal((await repository.load())?.world.credits, 1500);
});
void test('locked account transition rejects gameplay commands and saves until unlocked', async () => {
  const clock = new FakeClock();
  const storage = new DeviceSave(gameSave(10000));
  const session = new GameSession(storage, clock);
  session.setActive(true);
  await session.initialize();
  await session.lock();
  const before = session.getSnapshot().world;
  const writes = storage.writes.length;
  clock.advance(10000);
  session.upgrade('mining');
  session.research('trade');
  session.upgradeAutomation();
  session.upgradeSpecialist('broker');
  session.unlock('golden-trench');
  session.claimMission('discover');
  await session.save(true);
  assert.equal(session.getSnapshot().world, before);
  assert.equal(storage.writes.length, writes);
  session.unlockAfterAccountChange();
  session.setActive(true);
  session.upgrade('mining');
  assert.equal(session.getSnapshot().world.layers.shallows?.levels.mining, 2);
});
void test('wallet saturation preserves unsold cargo and prevents unsafe credit arithmetic', () => {
  const seed = createWorld();
  const world = {
    ...seed,
    credits: Number.MAX_SAFE_INTEGER - 15,
    layers: { shallows: { ...createLayer(), refined: 6, running: false } },
  };
  const price = getLayerProduction(world).resource.refinedValue;
  const sold = sellLayer(world);
  assert.equal(sold.credits, world.credits + price);
  assert.equal(sold.layers.shallows?.refined, 5);
  assert.equal(sellLayer(sold).credits, sold.credits);
  const full = {
    ...world,
    credits: Number.MAX_SAFE_INTEGER,
    layers: {
      shallows: {
        ...world.layers.shallows,
        automation: { level: 3, enabled: true, elapsedMs: 0 },
        running: true,
      },
    },
  };
  const after = advanceWorld(full, 3600000);
  assert.equal(after.credits, Number.MAX_SAFE_INTEGER);
  assert(Number.isSafeInteger(after.layers.shallows?.refined));
});
void test('reloading a local save consumes absence once even if the offline toast is not dismissed', async () => {
  const clock = new FakeClock();
  const initial = {
    ...gameSave(),
    world: {
      ...createWorld(),
      layers: {
        shallows: {
          ...createLayer(),
          automation: { level: 3, enabled: true, elapsedMs: 0 },
        },
      },
    },
  };
  const repository = new DeviceSave(initial);
  clock.advance(120000);
  const first = new GameSession(repository, clock);
  first.setActive(true);
  await first.initialize();
  assert((first.getSnapshot().offlineReport?.credits ?? 0) > 0);
  const second = new GameSession(repository, clock);
  second.setActive(true);
  await second.initialize();
  assert.deepEqual(second.getSnapshot().world, first.getSnapshot().world);
  assert.equal(second.getSnapshot().offlineReport, null);
});
