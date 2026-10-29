import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceWorld,
  buyResearch,
  buyInfrastructure,
  claimMission,
  createWorld,
  selectLayer,
  sellLayer,
  toggleAutomation,
  unlockLayer,
  upgradeAutomation,
  upgradeLayer,
  upgradeSpecialist,
} from '../src/domain/world';
import type { WorldState } from '../src/domain/world';
import { startExpedition, claimExpedition } from '../src/domain/expeditions';
import { LAYER_IDS } from '../src/data/layers';
import { RESEARCH_IDS, MISSION_IDS } from '../src/data/progression';
import { UPGRADE_IDS } from '../src/data/balance';
import { INFRASTRUCTURE_IDS } from '../src/data/campaign';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';

void test('seeded mixed gameplay preserves valid saves and elapsed-time partition invariance', () => {
  const coverage = new Set<number>();
  for (let seed = 1; seed <= 12; seed++) {
    let state = seed;
    const random = (limit: number) => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return Math.floor((state / 0x100000000) * limit);
    };
    let world: WorldState = { ...createWorld(), credits: 1000000 };
    for (let step = 0; step < 200; step++) {
      const elapsed = random(60000);
      const split = random(elapsed + 1);
      assert.deepEqual(
        advanceWorld(world, elapsed),
        advanceWorld(advanceWorld(world, split), elapsed - split),
        `seed ${String(seed)}, step ${String(step)}`,
      );
      const operation = random(12);
      coverage.add(operation);
      switch (operation) {
        case 0:
          world = upgradeLayer(
            world,
            UPGRADE_IDS[random(UPGRADE_IDS.length)] ?? 'mining',
          );
          break;
        case 1:
          world = upgradeAutomation(world);
          break;
        case 2:
          world = upgradeSpecialist(
            world,
            random(2) ? 'broker' : 'quartermaster',
          );
          break;
        case 3:
          world = buyResearch(
            world,
            RESEARCH_IDS[random(RESEARCH_IDS.length)] ?? 'trade',
          );
          break;
        case 4:
          world = unlockLayer(
            world,
            LAYER_IDS[random(LAYER_IDS.length)] ?? 'shallows',
          );
          break;
        case 5:
          world = selectLayer(
            world,
            LAYER_IDS[random(LAYER_IDS.length)] ?? 'shallows',
          );
          break;
        case 6:
          world = buyInfrastructure(
            world,
            INFRASTRUCTURE_IDS[random(INFRASTRUCTURE_IDS.length)] ?? 'depot',
          );
          break;
        case 7:
          world = claimMission(
            world,
            MISSION_IDS[random(MISSION_IDS.length)] ?? 'research',
          );
          break;
        case 8:
          world = sellLayer(world);
          break;
        case 9:
          world = toggleAutomation(world);
          break;
        case 10:
          world = startExpedition(world);
          break;
        case 11:
          world = claimExpedition(world);
          break;
      }
      world = advanceWorld(world, elapsed);
      const restored = validateSave(
        JSON.parse(JSON.stringify({ version: 8, savedAt: 1000000, world })),
      );
      assert(Number.isSafeInteger(restored.world.credits));
      assert(restored.world.credits >= 0);
      world = restored.world;
    }
  }
  assert.equal(coverage.size, 12, 'every command category must be exercised');
});
