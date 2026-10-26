import { describe, expect, it } from 'vitest';
import { LAYERS, LAYER_IDS } from '../data/layers';
import {
  advanceGame,
  getProductionSummary,
  getSaleValue,
  getUpgradeOffer,
} from './game';
import {
  advanceWorld,
  createLayer,
  createWorld,
  getLayerGame,
  getUnlockOffer,
  selectLayer,
  sellLayer,
  toggleLayer,
  unlockLayer,
  upgradeLayer,
} from './world';
import type { WorldState } from './world';

function twoOutposts(): WorldState {
  return {
    ...createWorld(),
    layers: {
      shallows: { ...createLayer(), running: true },
      'golden-trench': { ...createLayer(), running: true },
    },
  };
}

describe('depth progression', () => {
  it('starts with only the existing shallow outpost', () => {
    const world = createWorld();
    expect(world.selectedLayerId).toBe('shallows');
    expect(Object.keys(world.layers)).toEqual(['shallows']);
    expect(getUnlockOffer(world, 'golden-trench').cost).toBe(250);
  });
  it('requires enough credits and the preceding depth', () => {
    const poor = { ...createWorld(), credits: 249 };
    expect(unlockLayer(poor, 'golden-trench')).toBe(poor);
    const rich = { ...createWorld(), credits: 10000 };
    expect(unlockLayer(rich, 'pearl-caverns')).toBe(rich);
    expect(getUnlockOffer(rich, 'pearl-caverns').prerequisiteMet).toBe(false);
  });
  it('charges the exact unlock price once and starts the new layer paused', () => {
    const world = { ...createWorld(), credits: 250 };
    const unlocked = unlockLayer(world, 'golden-trench');
    expect(unlocked.credits).toBe(0);
    expect(unlocked.selectedLayerId).toBe('golden-trench');
    expect(unlocked.layers['golden-trench']).toEqual(createLayer());
    expect(unlockLayer(unlocked, 'golden-trench')).toBe(unlocked);
    expect(world.layers['golden-trench']).toBeUndefined();
  });
  it('opens the final depth in sequence and cannot select locked depths', () => {
    const world = { ...createWorld(), credits: 1150 };
    expect(selectLayer(world, 'pearl-caverns')).toBe(world);
    const opened = unlockLayer(
      unlockLayer(world, 'golden-trench'),
      'pearl-caverns',
    );
    expect(opened.credits).toBe(0);
    expect(Object.keys(opened.layers)).toHaveLength(3);
  });
  it('navigation preserves cargo, progress, upgrades and the shared wallet', () => {
    const world = advanceWorld(twoOutposts(), 17000);
    const switched = selectLayer(world, 'golden-trench');
    expect(switched.layers).toBe(world.layers);
    expect(switched.credits).toBe(world.credits);
    expect(selectLayer(switched, 'shallows')).toEqual(world);
  });
  it('advances unselected running outposts with their own timings', () => {
    const world = twoOutposts();
    const advanced = advanceWorld(world, 20000);
    expect(advanced.layers.shallows?.refined).toBe(3);
    expect(advanced.layers['golden-trench']?.refined).toBe(3);
    expect(advanced.layers['pearl-caverns']).toBeUndefined();
    expect(advanced.credits).toBe(0);
    for (const id of ['shallows', 'golden-trench'] as const) {
      expect(getLayerGame(advanced, id)).toEqual(
        advanceGame(getLayerGame(world, id), 20000, LAYERS[id].production),
      );
    }
  });
  it('sells only the selected inventory into one wallet at its resource price', () => {
    const ready = selectLayer(
      advanceWorld(twoOutposts(), 20000),
      'golden-trench',
    );
    const sold = sellLayer(ready);
    expect(sold.credits).toBe(60);
    expect(sold.layers['golden-trench']?.refined).toBe(0);
    expect(sold.layers.shallows).toBe(ready.layers.shallows);
    expect(sellLayer(sold)).toBe(sold);
    const bothSold = sellLayer(selectLayer(sold, 'shallows'));
    expect(bothSold.credits).toBe(84);
  });
  it('charges layer-specific upgrade prices without changing another outpost', () => {
    const world = {
      ...selectLayer(twoOutposts(), 'golden-trench'),
      credits: 60,
    };
    const upgraded = upgradeLayer(world, 'mining');
    expect(upgraded.credits).toBe(0);
    expect(upgraded.layers['golden-trench']?.levels.mining).toBe(2);
    expect(upgraded.layers.shallows).toBe(world.layers.shallows);
    expect(
      getUpgradeOffer(
        getLayerGame(world),
        'mining',
        LAYERS['golden-trench'].production,
      ).next?.cost,
    ).toBe(60);
  });
  it('pausing one outpost lets other running outposts continue', () => {
    const paused = toggleLayer(twoOutposts());
    const advanced = advanceWorld(paused, 20000);
    expect(advanced.layers.shallows).toBe(paused.layers.shallows);
    expect(advanced.layers['golden-trench']?.refined).toBe(3);
  });
  it('is invariant to tick partition with all three outposts running', () => {
    let initial = { ...createWorld(), credits: 1150 };
    initial = unlockLayer(
      unlockLayer(initial, 'golden-trench'),
      'pearl-caverns',
    );
    for (const id of LAYER_IDS) initial = toggleLayer(selectLayer(initial, id));
    let sliced = initial;
    for (let i = 0; i < 600; i++) sliced = advanceWorld(sliced, 137);
    expect(advanceWorld(initial, 82200)).toEqual(sliced);
  });
  it.each(LAYER_IDS)(
    'uses consistent pricing, capacity and bounds for %s',
    (id) => {
      const config = LAYERS[id].production;
      const state = advanceGame(
        { ...getLayerGame(createWorld()), running: true },
        1000000000,
        config,
      );
      const summary = getProductionSummary(state, config);
      expect(state.refined).toBe(summary.capacity);
      expect(state.raw).toBe(summary.capacity);
      expect(summary.dockBlocked).toBe(true);
      expect(getSaleValue(state, config)).toBe(
        state.refined * config.resource.refinedValue,
      );
    },
  );
});
