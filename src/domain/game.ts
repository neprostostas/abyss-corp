import { RESOURCE, UPGRADES, UPGRADE_IDS } from '../data/balance';

export type UpgradeId = keyof typeof UPGRADES;
export type Phase = 'mining' | 'delivering' | 'returning';
export interface GameState {
  readonly credits: number;
  readonly levels: Readonly<Record<UpgradeId, number>>;
  readonly phase: Phase;
  readonly phaseElapsedMs: number;
  readonly running: boolean;
}

export function createGame(): GameState {
  return {
    credits: 0,
    levels: { mining: 1, transport: 1 },
    phase: 'mining',
    phaseElapsedMs: 0,
    running: false,
  };
}

export function getUpgradeLevel(id: UpgradeId, level: number) {
  const definition = UPGRADES[id].levels[level - 1];
  if (!Number.isInteger(level) || !definition)
    throw new Error(`Invalid ${id} level: ${String(level)}`);
  return definition;
}

export function getPhaseDuration(state: GameState): number {
  const id = state.phase === 'mining' ? 'mining' : 'transport';
  return getUpgradeLevel(id, state.levels[id]).durationMs;
}

export function getCycleDuration(state: GameState): number {
  return (
    getUpgradeLevel('mining', state.levels.mining).durationMs +
    2 * getUpgradeLevel('transport', state.levels.transport).durationMs
  );
}

export const DELIVERY_VALUE = RESOURCE.batchSize * RESOURCE.creditValue;

export function getProductionSummary(state: GameState) {
  return {
    cargo: state.phase === 'delivering' ? RESOURCE.batchSize : 0,
    creditsPerSecond: (DELIVERY_VALUE * 1000) / getCycleDuration(state),
    fullyUpgraded: UPGRADE_IDS.every(
      (id) => state.levels[id] === UPGRADES[id].levels.length,
    ),
  };
}
const NEXT_PHASE: Record<Phase, Phase> = {
  mining: 'delivering',
  delivering: 'returning',
  returning: 'mining',
};

/** Elapsed-time simulation, independent of frame rate. All amounts and time are integers. */
export function advanceGame(state: GameState, elapsedMs: number): GameState {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0)
    throw new Error('Elapsed time must be a non-negative safe integer.');
  if (!state.running || elapsedMs === 0) return state;

  // A whole cycle returns to the exact same phase/progress and delivers once.
  const cycleMs = getCycleDuration(state);
  const cycles = Math.floor(elapsedMs / cycleMs);
  let remaining = elapsedMs % cycleMs;
  let next = {
    ...state,
    credits: Math.min(
      Number.MAX_SAFE_INTEGER,
      state.credits + cycles * DELIVERY_VALUE,
    ),
  };

  while (remaining > 0) {
    const step = Math.min(
      remaining,
      getPhaseDuration(next) - next.phaseElapsedMs,
    );
    next = { ...next, phaseElapsedMs: next.phaseElapsedMs + step };
    remaining -= step;
    if (next.phaseElapsedMs === getPhaseDuration(next)) {
      next = {
        ...next,
        credits:
          next.phase === 'delivering'
            ? Math.min(Number.MAX_SAFE_INTEGER, next.credits + DELIVERY_VALUE)
            : next.credits,
        phase: NEXT_PHASE[next.phase],
        phaseElapsedMs: 0,
      };
    }
  }
  return next;
}

export function getUpgradeOffer(state: GameState, id: UpgradeId) {
  const current = getUpgradeLevel(id, state.levels[id]);
  const next = UPGRADES[id].levels[state.levels[id]];
  return {
    current,
    next,
    affordable: next !== undefined && state.credits >= next.cost,
  };
}

export function buyUpgrade(state: GameState, id: UpgradeId): GameState {
  const offer = getUpgradeOffer(state, id);
  if (!offer.next || !offer.affordable) return state;
  const upgraded = {
    ...state,
    credits: state.credits - offer.next.cost,
    levels: { ...state.levels, [id]: state.levels[id] + 1 },
  };
  // Keep completed work when changing speed, without an instant free delivery.
  return {
    ...upgraded,
    phaseElapsedMs: Math.floor(
      (state.phaseElapsedMs * getPhaseDuration(upgraded)) /
        getPhaseDuration(state),
    ),
  };
}
