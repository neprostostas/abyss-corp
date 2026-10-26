import { RESOURCE, UPGRADES, UPGRADE_IDS } from '../data/balance';

export type UpgradeId = keyof typeof UPGRADES;
export type Phase = 'mining' | 'delivering' | 'returning';
export interface GameState {
  readonly credits: number;
  readonly levels: Readonly<Record<UpgradeId, number>>;
  readonly phase: Phase;
  readonly phaseElapsedMs: number;
  readonly running: boolean;
  readonly raw: number;
  readonly refined: number;
  /** Null means idle; a full-duration batch waits here when storage is full. */
  readonly processingElapsedMs: number | null;
}

export function createGame(): GameState {
  return {
    credits: 0,
    levels: { mining: 1, transport: 1, processing: 1, storage: 1 },
    phase: 'mining',
    phaseElapsedMs: 0,
    running: false,
    raw: 0,
    refined: 0,
    processingElapsedMs: null,
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
  return getUpgradeLevel(id, state.levels[id]).value;
}
export function getCycleDuration(state: GameState): number {
  return (
    getUpgradeLevel('mining', state.levels.mining).value +
    2 * getUpgradeLevel('transport', state.levels.transport).value
  );
}
export function getProcessingDuration(state: GameState): number {
  return getUpgradeLevel('processing', state.levels.processing).value;
}
export function getStorageCapacity(state: GameState): number {
  return getUpgradeLevel('storage', state.levels.storage).value;
}

/** Settle simultaneous events in this order: output, dock, extraction/return, input. */
function settle(state: GameState): GameState {
  let next = state;
  const capacity = getStorageCapacity(state);
  let changed: boolean;
  do {
    changed = false;
    if (
      next.processingElapsedMs === getProcessingDuration(next) &&
      next.refined + RESOURCE.batchSize <= capacity
    ) {
      next = {
        ...next,
        refined: next.refined + RESOURCE.batchSize,
        processingElapsedMs: null,
      };
      changed = true;
    }
    if (next.phaseElapsedMs === getPhaseDuration(next)) {
      if (next.phase === 'delivering') {
        if (next.raw + RESOURCE.batchSize <= capacity) {
          next = {
            ...next,
            raw: next.raw + RESOURCE.batchSize,
            phase: 'returning',
            phaseElapsedMs: 0,
          };
          changed = true;
        }
      } else {
        next = {
          ...next,
          phase: next.phase === 'mining' ? 'delivering' : 'mining',
          phaseElapsedMs: 0,
        };
        changed = true;
      }
    }
    if (next.processingElapsedMs === null && next.raw >= RESOURCE.batchSize) {
      next = {
        ...next,
        raw: next.raw - RESOURCE.batchSize,
        processingElapsedMs: 0,
      };
      changed = true;
    }
  } while (changed);
  return next;
}

/** Event-based elapsed-time simulation. Full storage naturally bounds work for long spans. */
export function advanceGame(state: GameState, elapsedMs: number): GameState {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0)
    throw new Error('Elapsed time must be a non-negative safe integer.');
  if (!state.running || elapsedMs === 0) return state;
  let next = settle(state);
  let remaining = elapsedMs;
  while (remaining > 0) {
    const transportLeft = getPhaseDuration(next) - next.phaseElapsedMs;
    const processingLeft =
      next.processingElapsedMs === null
        ? 0
        : getProcessingDuration(next) - next.processingElapsedMs;
    const untilEvent = Math.min(
      transportLeft > 0 ? transportLeft : Infinity,
      processingLeft > 0 ? processingLeft : Infinity,
    );
    if (!Number.isFinite(untilEvent)) break; // Both stages are blocked; no time accrues as free work.
    const step = Math.min(remaining, untilEvent);
    next = settle({
      ...next,
      phaseElapsedMs: next.phaseElapsedMs + (transportLeft > 0 ? step : 0),
      processingElapsedMs:
        next.processingElapsedMs === null
          ? null
          : next.processingElapsedMs + (processingLeft > 0 ? step : 0),
    });
    remaining -= step;
  }
  return next;
}

export function getSaleValue(state: GameState): number {
  return (
    Math.min(
      state.refined,
      Math.floor(
        (Number.MAX_SAFE_INTEGER - state.credits) / RESOURCE.refinedValue,
      ),
    ) * RESOURCE.refinedValue
  );
}

export function sellRefined(state: GameState): GameState {
  const value = getSaleValue(state);
  if (value === 0) return state;
  return settle({
    ...state,
    credits: state.credits + value,
    refined: state.refined - value / RESOURCE.refinedValue,
  });
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
  return settle({
    ...upgraded,
    phaseElapsedMs: Math.floor(
      (state.phaseElapsedMs * getPhaseDuration(upgraded)) /
        getPhaseDuration(state),
    ),
    processingElapsedMs:
      state.processingElapsedMs === null
        ? null
        : Math.floor(
            (state.processingElapsedMs * getProcessingDuration(upgraded)) /
              getProcessingDuration(state),
          ),
  });
}

export function getProductionSummary(state: GameState) {
  const capacity = getStorageCapacity(state);
  const storageFull = state.refined + RESOURCE.batchSize > capacity;
  const dockBlocked =
    state.phase === 'delivering' &&
    state.phaseElapsedMs === getPhaseDuration(state);
  const processorBlocked =
    state.processingElapsedMs === getProcessingDuration(state) && storageFull;
  const supplyMs = getCycleDuration(state);
  const processingMs = getProcessingDuration(state);
  const supplyBottleneck: UpgradeId =
    getUpgradeLevel('mining', state.levels.mining).value >=
    2 * getUpgradeLevel('transport', state.levels.transport).value
      ? 'mining'
      : 'transport';
  const bottleneck: UpgradeId = storageFull
    ? 'storage'
    : processingMs > supplyMs
      ? 'processing'
      : supplyBottleneck;
  return {
    cargo: state.phase === 'delivering' ? RESOURCE.batchSize : 0,
    capacity,
    storageFull,
    dockBlocked,
    processorBlocked,
    bottleneck,
    creditsPerSecond:
      (RESOURCE.batchSize * RESOURCE.refinedValue * 1000) /
      Math.max(supplyMs, processingMs),
    fullyUpgraded: UPGRADE_IDS.every(
      (id) => state.levels[id] === UPGRADES[id].levels.length,
    ),
  };
}
