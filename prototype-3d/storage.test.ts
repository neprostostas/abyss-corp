import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { isolateStorage } from './storage';
import { GuestSaveRepository } from '../src/infrastructure/persistence/GuestSaveRepository';
import { createWorld } from '../src/domain/world';
test('3D playtest save and reset cannot overwrite existing 2D guest progress', async () => {
  const storage = new JSDOM('', { url: 'https://localhost' }).window
    .localStorage;
  const legacy = new GuestSaveRepository(() => storage);
  const isolated = isolateStorage(storage, 'abyss-corp.prototype3d.');
  const prototype = new GuestSaveRepository(() => isolated);
  await legacy.save({
    version: 8,
    savedAt: 1000,
    world: { ...createWorld(), credits: 500 },
  });
  assert.equal(await prototype.load(), null);
  await prototype.save({ version: 8, savedAt: 1000, world: createWorld() });
  assert.equal((await legacy.load())?.world.credits, 500);
  await prototype.reset({ version: 8, savedAt: 2000, world: createWorld() });
  assert.equal((await legacy.load())?.world.credits, 500);
  isolated.clear();
  assert.equal(isolated.length, 0);
  assert.equal((await legacy.load())?.world.credits, 500);
});
