import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { cloudFixture, gameSave } from './fixtures';

const credits = (value: unknown) => validateSave(value).world.credits;

void test('edits during an upload stay on device and are sent in the following serialized write', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(10));
  const gate = h.holdNextWrite();
  const first = repository.flush();
  assert.equal(repository.flush(), first);
  await repository.save(gameSave(40));
  gate.resolve();
  await first;
  assert.equal(credits(h.remote?.save), 10);
  assert.equal(repository.getSnapshot().status, 'pending');
  assert.equal(
    credits(
      (JSON.parse(h.storage.getItem(repository.key) ?? '') as { save: unknown })
        .save,
    ),
    40,
  );
  await repository.flush();
  assert.equal(credits(h.remote?.save), 40);
  assert.equal(h.requests, 2);
});

void test('retrying a lost server response acknowledges the same operation without replaying it', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(10));
  h.loseNextResponse();
  await repository.flush();
  assert.equal(repository.getSnapshot().status, 'error');
  await repository.save(gameSave(40));
  await repository.flush();
  assert.equal(h.commits, 1);
  await repository.flush();
  assert.equal(h.commits, 2);
  assert.equal(credits(h.remote?.save), 40);
});

void test('offline edits survive reload and reconnect', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(99));
  h.offline(true);
  await repository.flush();
  assert.equal(repository.getSnapshot().status, 'error');
  const journal = h.storage.getItem(repository.key);
  await assert.rejects(h.repository().load());
  assert.equal(h.storage.getItem(repository.key), journal);
  h.offline(false);
  const next = h.repository();
  assert.equal((await next.load())?.world.credits, 99);
  await next.flush();
  assert.equal(credits(h.remote?.save), 99);
});

void test('completed expeditions survive conflicts without adding two wallets', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(100, 2));
  assert(h.remote);
  h.remote = {
    ...h.remote,
    revision: 2,
    save: z.json().parse(gameSave(999, 1)),
  };
  await repository.flush();
  assert.equal(credits(h.remote.save), 999);
  assert.equal(
    validateSave(h.remote.save).world.progression?.expedition?.completed,
    2,
  );
  assert.equal(
    (await h.repository().load())?.world.progression?.expedition?.completed,
    2,
  );
});

void test('repeated cloud conflicts stop after three attempts and retain completed milestones', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  assert(h.remote);
  h.remote = { ...h.remote, save: z.json().parse(gameSave(0, 1)) };
  await repository.load();
  await repository.save(gameSave(100, 2));
  h.conflictNext(10);
  await repository.flush();
  assert.equal(h.requests, 3);
  assert.equal(repository.getSnapshot().status, 'error');
  const journal: unknown = JSON.parse(h.storage.getItem(repository.key) ?? '');
  assert.equal(
    validateSave(z.object({ save: z.unknown() }).parse(journal).save).world
      .progression?.expedition?.completed,
    2,
  );
});

void test('a corrupt device journal is retained before recovery from a valid cloud copy', async (context) => {
  context.mock.method(console, 'warn', () => undefined);
  const h = cloudFixture(),
    repository = h.repository();
  h.storage.setItem(repository.key, '{broken');
  assert.equal((await repository.load())?.world.credits, 0);
  assert.equal(h.storage.getItem(`${repository.key}.corrupt`), '{broken');
  assert.equal(h.requests, 0);
});

void test('a corrupt journal and missing cloud copy never create a replacement world', async (context) => {
  context.mock.method(console, 'warn', () => undefined);
  const h = cloudFixture(),
    repository = h.repository();
  h.remote = null;
  h.storage.setItem(repository.key, '{broken');
  await assert.rejects(repository.load());
  assert.equal(h.storage.getItem(repository.key), '{broken');
  assert.equal(repository.getSnapshot().status, 'error');
  assert.equal(h.requests, 0);
});

void test('account journals do not overwrite another account on the same device', async () => {
  const h = cloudFixture(),
    first = h.repository('one'),
    second = h.repository('two');
  await first.load();
  await second.load();
  await first.save(gameSave(12));
  await second.save(gameSave(34));
  assert.notEqual(first.key, second.key);
  for (const [repository, expected] of [
    [first, 12],
    [second, 34],
  ] as const) {
    const journal: unknown = JSON.parse(
      h.storage.getItem(repository.key) ?? '',
    );
    assert.equal(
      credits(z.object({ save: z.unknown() }).parse(journal).save),
      expected,
    );
  }
});

void test('a previously acknowledged device save is never erased when its cloud row is missing', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(140));
  await repository.flush();
  const previous = h.storage.getItem(repository.key);
  h.remote = null;
  const reopened = h.repository();
  await assert.rejects(reopened.load());
  assert.equal(h.storage.getItem(repository.key), previous);
});

void test('a first device-only draft can resume before its first cloud upload', async () => {
  const h = cloudFixture();
  h.remote = null;
  const repository = h.repository();
  assert.equal(await repository.load(), null);
  await repository.save(gameSave(70));
  const reopened = h.repository();
  assert.equal((await reopened.load())?.world.credits, 70);
  await reopened.flush();
  assert.equal(reopened.getSnapshot().status, 'saved');
  assert.equal((await h.repository().load())?.world.credits, 70);
});

void test('a recovery backup prevents silently starting a new game when the cloud row is missing', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  h.remote = null;
  const backup = JSON.stringify(gameSave(300));
  h.storage.setItem(`${repository.key}.backup`, backup);
  await assert.rejects(repository.load());
  assert.equal(h.storage.getItem(`${repository.key}.backup`), backup);
  assert.equal(h.requests, 0);
});

void test('reset epoch discards old device expeditions and legacy recovery backups on reload', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(900, 2));
  await repository.backup(gameSave(800, 1));
  assert(h.remote);
  h.remote = {
    ...h.remote,
    epoch: 1,
    revision: 5,
    save: z.json().parse(gameSave()),
  };
  const fresh = h.repository();
  const save = await fresh.load();
  assert.equal(save?.world.credits, 0);
  assert.equal(save.world.progression?.expedition?.completed, 0);
  assert.equal(h.storage.getItem(`${repository.key}.backup`), null);
});
void test('an already running old tab adopts a reset without restoring completed expeditions', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(999, 3));
  assert(h.remote);
  h.remote = {
    ...h.remote,
    epoch: 1,
    revision: 5,
    save: z.json().parse(gameSave()),
  };
  await repository.flush();
  assert.equal(
    repository.takeRemoteUpdate()?.world.progression?.expedition?.completed,
    0,
  );
  assert.equal(credits(h.remote.save), 0);
  assert.equal(h.commits, 0);
});
void test('a legacy tab backup cannot revive milestones after a reset in a current cache', async () => {
  const h = cloudFixture();
  assert(h.remote);
  h.remote = { ...h.remote, epoch: 1, revision: 5 };
  const first = h.repository();
  await first.load();
  h.storage.setItem(`${first.key}.backup`, JSON.stringify(gameSave(1000, 3)));
  const next = h.repository();
  assert.equal(
    (await next.load())?.world.progression?.expedition?.completed,
    0,
  );
});

void test('reset waits for in-flight uploads and replaces milestones, without deleting another account cache', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(200, 2));
  h.storage.setItem('abyss-corp.account.other', 'keep');
  const gate = h.holdNextWrite();
  const upload = repository.flush();
  const reset = repository.reset(gameSave());
  assert.equal(h.requests, 1);
  gate.resolve();
  await upload;
  await reset;
  assert.equal(h.remote?.epoch, 1);
  assert.equal(credits(h.remote.save), 0);
  assert.equal(
    repository.takeRemoteUpdate()?.world.progression?.expedition?.completed,
    0,
  );
  assert.equal(h.storage.getItem('abyss-corp.account.other'), 'keep');
});
void test('a lost reset response retries the same operation without advancing the epoch twice', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  h.loseNextResponse();
  await repository.reset(gameSave());
  assert.equal(h.remote?.epoch, 1);
  assert.equal(h.commits, 1);
  assert.equal(repository.getSnapshot().status, 'saved');
});
void test('a failed offline reset preserves progress and resumes ordinary saving', async () => {
  const h = cloudFixture(),
    repository = h.repository();
  await repository.load();
  await repository.save(gameSave(200, 2));
  h.offline(true);
  await assert.rejects(repository.reset(gameSave()), /Could not reset/);
  h.offline(false);
  await repository.save(gameSave(300, 2));
  await repository.flush();
  assert.equal(credits(h.remote?.save), 300);
});
