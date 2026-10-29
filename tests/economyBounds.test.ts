import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completedWorld, gameSave } from './fixtures';
import { LAYER_IDS } from '../src/data/layers';
import { PRESTIGE } from '../src/data/campaign';
import { getLayerProduction } from '../src/domain/progression';
import { getSaleValue } from '../src/domain/game';
import {
  selectLayer,
  sellLayer,
  claimMission,
  prestigeWorld,
  getLayerGame,
  advanceWorld,
} from '../src/domain/world';
import { claimExpedition } from '../src/domain/expeditions';
import { MISSION_IDS } from '../src/data/progression';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';

void test('all prestige ranks and depths preserve exact integer sale value and cargo', () => {
  for (let rank = 0; rank <= PRESTIGE.maxRank; rank++) {
    for (const id of LAYER_IDS) {
      const initial = completedWorld();
      const world = selectLayer(
        {
          ...initial,
          credits: 0,
          campaign: { ...initial.campaign, rank },
          layers: {
            ...initial.layers,
            [id]: { ...initial.layers[id], refined: 33, running: false },
          },
        },
        id,
      );
      const price = getLayerProduction(world).resource.refinedValue;
      assert.equal(
        getSaleValue(getLayerGame(world), getLayerProduction(world)),
        33 * price,
      );
      const sold = sellLayer(world);
      assert.equal(sold.credits, 33 * price);
      assert.equal(sold.layers[id]?.refined, 0);
      assert.equal(sellLayer(sold).credits, sold.credits);
      validateSave({ ...gameSave(), world: sold });
    }
  }
});
void test('repeated claims and capped prestige cannot mint credits or extra ranks', () => {
  const world = completedWorld();
  for (const id of MISSION_IDS) assert.equal(claimMission(world, id), world);
  assert.equal(claimExpedition(world), world);
  const capped = {
    ...world,
    campaign: { ...world.campaign, rank: PRESTIGE.maxRank },
  };
  assert.equal(prestigeWorld(capped), capped);
  assert.deepEqual(
    advanceWorld(capped, 100000),
    advanceWorld(advanceWorld(capped, 49999), 50001),
  );
});
