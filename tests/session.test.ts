import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameSession } from '../src/application/GameSession';
import { advanceWorld, createLayer, createWorld } from '../src/domain/world';
import { OFFLINE_LIMIT_MS } from '../src/data/automation';
import { DeviceSave, FakeClock, gameSave, deferred } from './fixtures';

async function sessionFixture(away = 0) {
  const clock = new FakeClock();
  const world = {
    ...createWorld(),
    layers: {
      shallows: {
        ...createLayer(),
        automation: { level: 1, enabled: true, elapsedMs: 0 },
      },
    },
  };
  const repository = new DeviceSave({
    ...gameSave(),
    savedAt: clock.timestamp() - away,
    world,
  });
  const session = new GameSession(repository, clock);
  session.setActive(true);
  await session.initialize();
  await session.save();
  return { clock, world, repository, session };
}

void test('a save between ticks includes the elapsed production before dating the save', async () => {
  const h = await sessionFixture();
  h.clock.advance(60_000);
  await h.session.save(true);
  assert.deepEqual(h.repository.saved?.world, advanceWorld(h.world, 60_000));
  assert.equal(h.repository.saved.savedAt, h.clock.timestamp());
});

for (const sleep of [10_000, 600_000, 6 * 3_600_000]) {
  void test(`device sleep of ${String(sleep)}ms works when the monotonic clock pauses`, async () => {
    const h = await sessionFixture();
    h.clock.advance(100, sleep);
    await h.session.save(true);
    const expected = advanceWorld(h.world, Math.min(sleep, OFFLINE_LIMIT_MS));
    assert.deepEqual(h.session.getSnapshot().world, expected);
    await h.session.save(true);
    assert.deepEqual(
      h.repository.saved?.world,
      expected,
      'must not award the same absence twice',
    );
  });
}

void test('hidden-tab progress is capped and resuming twice does not duplicate it', async () => {
  const h = await sessionFixture();
  h.session.setActive(false);
  const since = h.clock.timestamp();
  h.clock.advance(6 * 3_600_000);
  await h.session.save(true);
  assert.equal(h.repository.saved?.savedAt, since);
  h.session.setActive(true);
  const expected = advanceWorld(h.world, OFFLINE_LIMIT_MS);
  assert.deepEqual(h.session.getSnapshot().world, expected);
  assert.equal(h.session.getSnapshot().offlineReport?.capped, true);
  h.session.setActive(true);
  h.session.tick();
  assert.deepEqual(h.session.getSnapshot().world, expected);
});

void test('a backward wall-clock change does not stop foreground production', async () => {
  const h = await sessionFixture();
  h.clock.advance(15_000, -60_000);
  h.session.tick();
  assert.deepEqual(
    h.session.getSnapshot().world,
    advanceWorld(h.world, 15_000),
  );
});

void test('small wall-clock jitter does not accumulate extra foreground production', async () => {
  const h = await sessionFixture();
  for (let i = 0; i < 600; i++) {
    h.clock.advance(100, i % 2 ? 99 : 101);
    h.session.tick();
  }
  assert.deepEqual(
    h.session.getSnapshot().world,
    advanceWorld(h.world, 60_000),
  );
});

void test('loading after a long absence consumes it before the next reload', async () => {
  const h = await sessionFixture(8 * 3_600_000);
  assert.deepEqual(
    h.repository.saved?.world,
    advanceWorld(h.world, OFFLINE_LIMIT_MS),
  );
  assert.equal(h.repository.saved.savedAt, h.clock.timestamp());
});

void test('failed device writes retain newer commands until an explicit retry succeeds', async (context) => {
  context.mock.method(console, 'error', () => undefined);
  const clock = new FakeClock();
  const repository = new DeviceSave(gameSave(1000));
  const session = new GameSession(repository, clock);
  session.setActive(true);
  await session.initialize();
  repository.fail = true;
  session.upgrade('mining');
  await session.save(true);
  assert.equal(session.getSnapshot().saveStatus, 'error');
  session.upgrade('transport');
  const latest = session.getSnapshot().world;
  repository.fail = false;
  await session.save(true);
  assert.deepEqual(repository.saved?.world, latest);
  assert.equal(session.getSnapshot().saveStatus, 'saved');
});

void test('a failed initial load never saves a replacement new game', async (context) => {
  context.mock.method(console, 'error', () => undefined);
  const repository = new DeviceSave(null);
  repository.load = () => Promise.reject(new Error('offline'));
  const session = new GameSession(repository, new FakeClock());
  session.setActive(true);
  await session.initialize();
  session.upgrade('mining');
  session.sell();
  await session.save(true);
  assert.equal(session.getSnapshot().status, 'load-error');
  assert.equal(repository.writes.length, 0);
});

void test('account changes freeze commands, timer saves and visibility resumes until unlocked', async () => {
  const h = await sessionFixture();
  await h.session.lock();
  const before = h.session.getSnapshot().world;
  const writes = h.repository.writes.length;
  h.clock.advance(60_000);
  h.session.upgrade('mining');
  h.session.setActive(true);
  h.session.tick();
  await h.session.save(true);
  assert.deepEqual(h.session.getSnapshot().world, before);
  assert.equal(h.repository.writes.length, writes);
  h.session.unlockAfterAccountChange();
  h.session.setActive(true);
  await h.session.save(true);
  assert(h.repository.writes.length > writes);
});

void test('mobile background saves and duplicate page lifecycle events consume offline time once', async () => {
  const h = await sessionFixture();
  h.clock.advance(1250);
  h.session.tick();
  h.session.setActive(false);
  await h.session.save();
  const suspended = h.session.getSnapshot().world;
  const suspendedAt = h.repository.saved?.savedAt;
  h.clock.advance(60000);
  await h.session.save();
  h.session.setActive(false);
  assert.equal(h.repository.saved?.savedAt, suspendedAt);
  h.session.setActive(true);
  h.session.setActive(true);
  await h.session.save();
  assert.deepEqual(
    h.session.getSnapshot().world,
    advanceWorld(suspended, 60000),
  );
  const reload = new GameSession(h.repository, h.clock);
  reload.setActive(true);
  await reload.initialize();
  assert.deepEqual(reload.getSnapshot().world, h.session.getSnapshot().world);
});
void test('commands during a slow device write persist the latest world', async () => {
  const clock = new FakeClock();
  const repository = new DeviceSave(gameSave(1000));
  const session = new GameSession(repository, clock);
  session.setActive(true);
  await session.initialize();
  const gate = deferred();
  const write = repository.save.bind(repository);
  let first = true;
  repository.save = async (save) => {
    if (first) {
      first = false;
      await gate.promise;
    }
    await write(save);
  };
  session.upgrade('mining');
  session.upgrade('transport');
  clock.advance(1000);
  const pending = session.save();
  const latest = session.getSnapshot().world;
  gate.resolve();
  await pending;
  assert.deepEqual(repository.saved?.world, latest);
  assert.equal(session.getSnapshot().saveStatus, 'saved');
});
void test('old layer command handlers cannot spend or sell on the newly selected depth', async () => {
  const repository = new DeviceSave(gameSave(1000));
  const session = new GameSession(repository, new FakeClock());
  session.setActive(true);
  await session.initialize();
  session.unlock('golden-trench');
  await session.save();
  const before = session.getSnapshot().world;
  session.upgrade('mining', 'shallows');
  session.upgradeAutomation('shallows');
  session.toggleAutomation('shallows');
  assert.equal(session.sell('shallows'), 0);
  assert.deepEqual(session.getSnapshot().world, before);
});

void test('concurrent initialization reads once and a failed load can be retried without losing the saved game', async (context) => {
  context.mock.method(console, 'error', () => undefined);
  const repository = new DeviceSave(gameSave(777));
  const clock = new FakeClock();
  const session = new GameSession(repository, clock);
  session.setActive(true);
  const gate = deferred();
  let reads = 0;
  repository.load = async () => {
    reads++;
    await gate.promise;
    throw new Error('Temporary read failure');
  };
  const first = session.initialize();
  const concurrent = session.initialize();
  assert.equal(first, concurrent);
  assert.equal(reads, 1);
  session.upgrade('mining');
  gate.resolve();
  await first;
  assert.equal(session.getSnapshot().status, 'load-error');
  assert.equal(repository.writes.length, 0);
  repository.load = () => {
    reads++;
    return Promise.resolve(repository.saved);
  };
  await session.initialize();
  assert.equal(reads, 2);
  assert.equal(session.getSnapshot().status, 'ready');
  assert.equal(session.getSnapshot().world.credits, 777);
  await session.initialize();
  assert.equal(
    reads,
    2,
    'ready session does not reload and replay offline progress',
  );
});
void test('stale specialist actions cannot purchase on a newly selected base', async () => {
  const repository = new DeviceSave(gameSave(10000));
  const session = new GameSession(repository, new FakeClock());
  session.setActive(true);
  await session.initialize();
  session.unlock('golden-trench');
  const before = session.getSnapshot().world;
  session.upgradeSpecialist('quartermaster', 'shallows');
  session.upgradeSpecialist('broker', 'shallows');
  assert.equal(session.getSnapshot().world, before);
});
