import { describe, expect, it } from 'vitest';
import {
  advanceGame,
  buyUpgrade,
  createGame,
  getPhaseDuration,
  getProcessingDuration,
  getProductionSummary,
  getSaleValue,
  getUpgradeOffer,
  sellRefined,
} from './game';
import type { GameState, Phase } from './game';

const running = (): GameState => ({ ...createGame(), running: true });
const material = (state: GameState) =>
  state.raw +
  state.refined +
  (state.processingElapsedMs === null ? 0 : 3) +
  getProductionSummary(state).cargo;

describe('production chain', () => {
  it('does not produce while paused', () => {
    const state = createGame();
    expect(advanceGame(state, 100000)).toBe(state);
  });
  it('requires delivery, refinement and an explicit sale before credits arrive', () => {
    const mined = advanceGame(running(), 4000);
    expect(mined.phase).toBe('delivering');
    expect(material(mined)).toBe(3);
    const delivered = advanceGame(mined, 2500);
    expect(delivered.phase).toBe('returning');
    expect(delivered.processingElapsedMs).toBe(0);
    expect(delivered.raw).toBe(0);
    expect(delivered.credits).toBe(0);
    expect(advanceGame(delivered, 5999).refined).toBe(0);
    const refined = advanceGame(delivered, 6000);
    expect(refined.refined).toBe(3);
    expect(refined.credits).toBe(0);
    const sold = sellRefined(refined);
    expect(sold.credits).toBe(24);
    expect(sold.refined).toBe(0);
    expect(sellRefined(sold)).toBe(sold);
  });
  it.each<Phase>(['mining', 'delivering', 'returning'])(
    'is invariant to tick partition from phase %s',
    (phase) => {
      const state: GameState = {
        ...running(),
        phase,
        phaseElapsedMs: 777,
        raw: 3,
        processingElapsedMs: 1000,
      };
      const totalMs = 90123;
      let sliced = state;
      for (let time = 0; time < totalMs; time += 37)
        sliced = advanceGame(sliced, Math.min(37, totalMs - time));
      expect(advanceGame(state, totalMs)).toEqual(sliced);
    },
  );
  it.each([1, 3, 5])(
    'preserves partition invariance through simultaneous events at level %i',
    (level) => {
      const state = {
        ...running(),
        levels: {
          mining: level,
          transport: level,
          processing: level,
          storage: level,
        },
      };
      let sliced = state;
      for (let i = 0; i < 500; i++) sliced = advanceGame(sliced, 123);
      expect(advanceGame(state, 61500)).toEqual(sliced);
    },
  );
  it('fills the warehouse, stalls the refinery and eventually blocks the dock without losing material', () => {
    const full = advanceGame(running(), 1000000000);
    expect(full.refined).toBe(6);
    expect(full.processingElapsedMs).toBe(6000);
    expect(full.raw).toBe(6);
    expect(full.phase).toBe('delivering');
    expect(full.phaseElapsedMs).toBe(2500);
    expect(full.credits).toBe(0);
    expect(material(full)).toBe(18);
    expect(advanceGame(full, 1000000000)).toEqual(full);
    expect(getProductionSummary(full)).toMatchObject({
      processorBlocked: true,
      dockBlocked: true,
      bottleneck: 'storage',
    });
  });
  it('selling restarts blocked stages without giving free elapsed work', () => {
    const full = advanceGame(running(), 1000000);
    const sold = sellRefined(full);
    expect(sold.credits).toBe(48);
    expect(material(sold)).toBe(material(full) - 6);
    expect(sold.refined).toBe(3); // The already completed batch moves into the newly freed slots.
    expect(sold.processingElapsedMs).toBe(0);
    expect(sold.phase).toBe('returning');
    expect(sold.phaseElapsedMs).toBe(0);
    expect(advanceGame(sold, 1000).processingElapsedMs).toBe(1000);
  });
  it('never overflows inventory over repeated production and sales', () => {
    let state = running();
    for (let i = 0; i < 100; i++) {
      const produced = advanceGame(state, 17000);
      expect(produced.raw).toBeLessThanOrEqual(6);
      expect(produced.refined).toBeLessThanOrEqual(6);
      const value = getSaleValue(produced);
      state = sellRefined(produced);
      expect(state.credits - produced.credits).toBe(value);
      expect(material(state) + value / 8).toBe(material(produced));
    }
  });
  it.each([-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid elapsed time %s',
    (elapsed) => {
      expect(() => advanceGame(running(), elapsed)).toThrow();
    },
  );
  it('retains unsellable crystals at the safe-integer credit limit', () => {
    const state = {
      ...createGame(),
      credits: Number.MAX_SAFE_INTEGER - 8,
      refined: 3,
    };
    const sold = sellRefined(state);
    expect(sold.credits).toBe(Number.MAX_SAFE_INTEGER);
    expect(sold.refined).toBe(2);
    expect(sellRefined(sold)).toBe(sold);
  });
});

describe('upgrades and bottlenecks', () => {
  it('charges once and rejects unaffordable purchases', () => {
    const state = running();
    expect(buyUpgrade(state, 'mining')).toBe(state);
    const upgraded = buyUpgrade({ ...state, credits: 30 }, 'mining');
    expect(upgraded.credits).toBe(0);
    expect(upgraded.levels.mining).toBe(2);
    expect(buyUpgrade(upgraded, 'mining')).toBe(upgraded);
  });
  it('preserves extraction progress when upgrading', () => {
    const state = { ...running(), credits: 30, phaseElapsedMs: 2000 };
    const upgraded = buyUpgrade(state, 'mining');
    expect(upgraded.phaseElapsedMs / getPhaseDuration(upgraded)).toBe(0.5);
    expect(upgraded.credits).toBe(0);
  });
  it.each<Phase>(['delivering', 'returning'])(
    'preserves %s progress while upgrading transport',
    (phase) => {
      const upgraded = buyUpgrade(
        { ...running(), phase, credits: 30, phaseElapsedMs: 1250 },
        'transport',
      );
      expect(upgraded.phaseElapsedMs).toBe(1000);
      expect(upgraded.credits).toBe(0);
      expect(upgraded.phase).toBe(phase);
    },
  );
  it('preserves active refinery work when upgrading', () => {
    const state = { ...running(), credits: 45, processingElapsedMs: 3000 };
    const upgraded = buyUpgrade(state, 'processing');
    expect(upgraded.processingElapsedMs).toBe(
      getProcessingDuration(upgraded) / 2,
    );
    expect(material(upgraded)).toBe(material(state));
  });
  it('expanding storage immediately releases completed cargo without loss', () => {
    const full = { ...advanceGame(running(), 1000000), credits: 45 };
    const upgraded = buyUpgrade(full, 'storage');
    expect(upgraded.credits).toBe(0);
    expect(getProductionSummary(upgraded).capacity).toBe(12);
    expect(getProductionSummary(upgraded).dockBlocked).toBe(false);
    expect(material(upgraded)).toBe(material(full));
  });
  it('identifies the supply or refinery limit, not just the most expensive upgrade', () => {
    expect(getProductionSummary(running()).bottleneck).toBe('transport');
    const fastSupply = {
      ...running(),
      levels: { mining: 5, transport: 5, processing: 1, storage: 1 },
    };
    expect(getProductionSummary(fastSupply).bottleneck).toBe('processing');
    expect(
      getProductionSummary(
        buyUpgrade({ ...fastSupply, credits: 45 }, 'processing'),
      ).creditsPerSecond,
    ).toBeGreaterThan(getProductionSummary(fastSupply).creditsPerSecond);
  });
  it('caps all four upgrade categories', () => {
    const state = {
      ...running(),
      credits: 10000,
      levels: { mining: 5, transport: 5, processing: 5, storage: 5 },
    };
    expect(buyUpgrade(state, 'storage')).toBe(state);
    expect(getUpgradeOffer(state, 'processing').next).toBeUndefined();
    expect(getProductionSummary(state).fullyUpgraded).toBe(true);
  });
});
