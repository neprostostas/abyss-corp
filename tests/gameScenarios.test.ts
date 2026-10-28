import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LAYER_IDS } from '../src/data/layers';
import { MISSIONS, MISSION_IDS } from '../src/data/progression';
import { OFFLINE_LIMIT_MS } from '../src/data/automation';
import {
  advanceWorld,
  claimMission,
  createLayer,
  createWorld,
} from '../src/domain/world';
import type { WorldState } from '../src/domain/world';
import { createProgression } from '../src/domain/progression';
import { startExpedition } from '../src/domain/expeditions';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { gameSave } from './fixtures';

function matureWorld(): WorldState {
  return {
    ...createWorld(),
    progression: { ...createProgression(), research: { trade: 3, storage: 3 } },
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
}
const roundtrip = (world: WorldState) =>
  validateSave(JSON.parse(JSON.stringify({ ...gameSave(), world }))).world;
void test('a full offline window with all pilots and an active expedition matches repeated reloads', () => {
  const initial = startExpedition(matureWorld());
  const whole = advanceWorld(initial, OFFLINE_LIMIT_MS);
  let reloaded = initial;
  for (let elapsed = 0; elapsed < OFFLINE_LIMIT_MS; elapsed += 240000) {
    reloaded = roundtrip(advanceWorld(reloaded, 240000));
  }
  assert.deepEqual(reloaded, whole);
  assert(whole.credits > 0);
  for (const id of LAYER_IDS)
    assert((whole.progression?.expedition?.delivered[id] ?? 0) > 0);
});
void test('every mission rewards once across reloads and never overflows the wallet', () => {
  let world = matureWorld();
  let total = 0;
  for (const id of MISSION_IDS) {
    const saturated = { ...world, credits: Number.MAX_SAFE_INTEGER };
    assert.equal(claimMission(saturated, id), saturated);
    world = claimMission(world, id);
    total += MISSIONS[id].reward;
    assert.equal(world.credits, total);
    world = roundtrip(world);
    assert.equal(claimMission(world, id), world);
  }
});
