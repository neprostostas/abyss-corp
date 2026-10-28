import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GuestSaveRepository } from '../src/infrastructure/persistence/GuestSaveRepository';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { cloudFixture, gameSave, MemoryStorage } from './fixtures';

void test('guest progress survives a new repository without any account', async () => {
  const storage = new MemoryStorage();
  const guest = new GuestSaveRepository(() => storage);
  assert.equal(await guest.load(), null);
  await guest.save(gameSave(123));
  assert.equal(
    (await new GuestSaveRepository(() => storage).load())?.world.credits,
    123,
  );
});
void test('invalid guest progress is preserved and never replaced by a new game', async () => {
  const storage = new MemoryStorage();
  const guest = new GuestSaveRepository(() => storage);
  storage.setItem(guest.key, '{broken');
  await assert.rejects(guest.load());
  await assert.rejects(guest.claim('captain'));
  assert.equal(storage.getItem(guest.key), '{broken');
});
void test('new accounts import guest progress once and survive a lost upload reply', async () => {
  const h = cloudFixture();
  const readRemote = () => h.remote;
  h.remote = null;
  const guest = new GuestSaveRepository(() => h.storage);
  await guest.save(gameSave(456));
  const repository = h.repository('captain', () => guest.claim('captain'));
  assert.equal((await repository.load())?.world.credits, 456);
  h.loseNextResponse();
  await repository.flush();
  const reload = h.repository('captain', () => guest.claim('captain'));
  assert.equal((await reload.load())?.world.credits, 456);
  await reload.flush();
  assert.equal(h.commits, 1);
  assert.equal(validateSave(readRemote()?.save).world.credits, 456);
  assert.equal((await guest.load())?.world.credits, 456);
});
void test('existing cloud progress always wins without claiming or deleting the guest save', async () => {
  const h = cloudFixture();
  const guest = new GuestSaveRepository(() => h.storage);
  await guest.save(gameSave(999));
  let called = false;
  const repository = h.repository('captain', () => {
    called = true;
    return guest.claim('captain');
  });
  assert.equal((await repository.load())?.world.credits, 0);
  assert.equal(called, false);
  assert.equal((await guest.load())?.world.credits, 999);
});
void test('failed cloud reads never claim guest progress', async () => {
  const h = cloudFixture();
  h.offline(true);
  let called = false;
  await assert.rejects(
    h
      .repository('captain', () => {
        called = true;
        return Promise.resolve(gameSave());
      })
      .load(),
  );
  assert.equal(called, false);
});
void test('transfer is bound to one account and retry uses the original snapshot', async () => {
  const storage = new MemoryStorage();
  const guest = new GuestSaveRepository(() => storage);
  await guest.save(gameSave(77));
  assert.equal((await guest.claim('first'))?.world.credits, 77);
  await guest.save(gameSave(88));
  assert.equal(await guest.claim('second'), null);
  assert.equal((await guest.claim('first'))?.world.credits, 77);
  assert.equal((await guest.load())?.world.credits, 88);
});
void test('blocked device storage reports failure instead of pretending to save or transfer', async () => {
  const guest = new GuestSaveRepository(() => {
    throw new Error('Storage blocked');
  });
  await assert.rejects(guest.load(), /Storage blocked/);
  await assert.rejects(guest.save(gameSave()), /Storage blocked/);
  await assert.rejects(guest.claim('captain'), /Storage blocked/);
});

void test('simultaneous claims cannot attach the same guest snapshot to two accounts', async () => {
  const storage = new MemoryStorage();
  const guest = new GuestSaveRepository(() => storage);
  await guest.save(gameSave(55));
  const [first, second] = await Promise.all([
    guest.claim('first'),
    guest.claim('second'),
  ]);
  assert.equal(first?.world.credits, 55);
  assert.equal(second, null);
});
void test('edits after an unacknowledged transfer survive reload and sync', async () => {
  const h = cloudFixture();
  const readRemote = () => h.remote;
  h.remote = null;
  const guest = new GuestSaveRepository(() => h.storage);
  await guest.save(gameSave(456));
  const repository = h.repository('captain', () => guest.claim('captain'));
  await repository.load();
  h.loseNextResponse();
  await repository.flush();
  await repository.save(gameSave(789));
  const reload = h.repository('captain', () => guest.claim('captain'));
  assert.equal((await reload.load())?.world.credits, 789);
  await reload.flush();
  assert.equal(validateSave(readRemote()?.save).world.credits, 789);
  assert.equal(h.commits, 2);
});

void test('guest restart replaces progress, clears its transfer and fences other open tabs', async () => {
  const storage = new MemoryStorage();
  const current = new GuestSaveRepository(() => storage);
  await current.save(gameSave(100, 2));
  const other = new GuestSaveRepository(() => storage);
  await other.load();
  await current.claim('old-account');
  storage.setItem('abyss-corp.account.another', 'untouched');
  await current.reset(gameSave());
  assert.equal((await current.load())?.world.credits, 0);
  assert.equal(storage.getItem(`${current.key}.transfer`), null);
  await assert.rejects(
    other.save(gameSave(999, 3)),
    /restarted in another tab/,
  );
  assert.equal(storage.getItem('abyss-corp.account.another'), 'untouched');
  assert.equal(
    (await other.load())?.world.progression?.expedition?.completed,
    0,
  );
});

void test('a guest transfer cannot archive progress reset while its load is awaiting', async () => {
  const storage = new MemoryStorage();
  const guest = new GuestSaveRepository(() => storage);
  await guest.save(gameSave(999));
  const pending = guest.claim('captain');
  await guest.reset(gameSave());
  await assert.rejects(pending, /restarted/);
  assert.equal(storage.getItem(`${guest.key}.transfer`), null);
  assert.equal((await guest.load())?.world.credits, 0);
});

void test('guest transfer refuses an older snapshot when a newer device save appears', async () => {
  const storage = new MemoryStorage();
  const guest = new GuestSaveRepository(() => storage);
  await guest.save(gameSave(10));
  const transfer = guest.claim('captain');
  await guest.save(gameSave(50));
  await assert.rejects(transfer, /changed/);
  assert.equal(storage.getItem(`${guest.key}.transfer`), null);
  assert.equal((await guest.claim('captain'))?.world.credits, 50);
});
