import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomId } from '../src/infrastructure/identity/randomId';
import { GuestSaveRepository } from '../src/infrastructure/persistence/GuestSaveRepository';
import { MemoryStorage, gameSave } from './fixtures';
void test('LAN HTTP UUID fallback preserves v4 format, entropy and guest reset fencing', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const source = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues: source.getRandomValues.bind(source) },
  });
  try {
    const ids = Array.from({ length: 1000 }, randomId);
    assert.equal(new Set(ids).size, 1000);
    for (const id of ids)
      assert.match(
        id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    const storage = new MemoryStorage();
    const first = new GuestSaveRepository(() => storage);
    await first.save(gameSave(100));
    const stale = new GuestSaveRepository(() => storage);
    await stale.load();
    await first.reset(gameSave());
    assert.equal((await first.load())?.world.credits, 0);
    await assert.rejects(stale.save(gameSave(200)), /restarted/);
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
  }
});
