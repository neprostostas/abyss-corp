import { describe, expect, it } from 'vitest';
import {
  advanceGame,
  buyUpgrade,
  createGame,
  DELIVERY_VALUE,
  getCycleDuration,
  getPhaseDuration,
  getProductionSummary,
  getUpgradeOffer,
} from './game';
import type { GameState, Phase } from './game';

const running = (): GameState => ({ ...createGame(), running: true });

describe('production cycle', () => {
  it('starts paused and does not mint credits while paused', () => {
    const state = createGame();
    expect(advanceGame(state, 100000)).toBe(state);
  });
  it('extracts cargo, pays only on arrival, and returns empty', () => {
    const mined = advanceGame(running(), 4000);
    expect(mined.phase).toBe('delivering');
    expect(mined.credits).toBe(0);
    expect(getProductionSummary(mined).cargo).toBe(3);
    const nearDock = advanceGame(mined, 2499);
    expect(nearDock.credits).toBe(0);
    const delivered = advanceGame(nearDock, 1);
    expect(delivered.phase).toBe('returning');
    expect(delivered.credits).toBe(DELIVERY_VALUE);
    expect(getProductionSummary(delivered).cargo).toBe(0);
    const returned = advanceGame(delivered, 2500);
    expect(returned).toEqual({ ...running(), credits: DELIVERY_VALUE });
  });
  it.each<Phase>(['mining', 'delivering', 'returning'])(
    'agrees for partitioned elapsed time starting in %s',
    (phase) => {
      const state = { ...running(), phase, phaseElapsedMs: 777 };
      const totalMs = 90123;
      let sliced = state;
      for (let time = 0; time < totalMs; time += 37) {
        sliced = advanceGame(sliced, Math.min(37, totalMs - time));
      }
      expect(advanceGame(state, totalMs)).toEqual(sliced);
    },
  );
  it('calculates long elapsed spans without frame simulation', () => {
    const cycles = 1000000;
    expect(
      advanceGame(running(), getCycleDuration(running()) * cycles),
    ).toEqual({ ...running(), credits: DELIVERY_VALUE * cycles });
  });
  it.each([-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid elapsed time %s',
    (elapsed) => {
      expect(() => advanceGame(running(), elapsed)).toThrow();
    },
  );
  it('saturates credits at safe integer precision', () => {
    const state = { ...running(), credits: Number.MAX_SAFE_INTEGER - 1 };
    expect(advanceGame(state, 9000).credits).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('upgrades', () => {
  it('rejects unaffordable upgrades without changing state', () => {
    const state = running();
    expect(buyUpgrade(state, 'mining')).toBe(state);
  });
  it('charges the exact price and prevents a double purchase with the same credits', () => {
    const state = { ...running(), credits: 30 };
    const upgraded = buyUpgrade(state, 'mining');
    expect(upgraded.credits).toBe(0);
    expect(upgraded.levels.mining).toBe(2);
    expect(buyUpgrade(upgraded, 'mining')).toBe(upgraded);
    expect(state.levels.mining).toBe(1);
  });
  it('preserves phase fraction and increases output rate', () => {
    const state = { ...running(), credits: 30, phaseElapsedMs: 2000 };
    const upgraded = buyUpgrade(state, 'mining');
    expect(upgraded.phaseElapsedMs / getPhaseDuration(upgraded)).toBe(0.5);
    expect(upgraded.credits).toBe(0);
    expect(getProductionSummary(upgraded).creditsPerSecond).toBeGreaterThan(
      getProductionSummary(state).creditsPerSecond,
    );
  });
  it.each<Phase>(['delivering', 'returning'])(
    'accelerates transport in phase %s without a free delivery',
    (phase) => {
      const state = { ...running(), phase, credits: 30, phaseElapsedMs: 1250 };
      const upgraded = buyUpgrade(state, 'transport');
      expect(upgraded.phaseElapsedMs).toBe(1000);
      expect(upgraded.credits).toBe(0);
      expect(upgraded.phase).toBe(phase);
    },
  );
  it('caps levels and reports the completed slice', () => {
    const state = {
      ...running(),
      credits: 10000,
      levels: { mining: 5, transport: 5 },
    };
    expect(buyUpgrade(state, 'mining')).toBe(state);
    expect(getUpgradeOffer(state, 'transport').next).toBeUndefined();
    expect(getProductionSummary(state).fullyUpgraded).toBe(true);
  });
});
