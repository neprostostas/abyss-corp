import { LAYERS } from '../data/layers';
import type { ProductionConfig } from '../data/layers';
import { UPGRADES, UPGRADE_IDS } from '../data/balance';

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

export function getUpgradeLevel(
  id: UpgradeId,
  level: number,
  config: ProductionConfig = LAYERS.shallows.production,
) {
  const definition = UPGRADES[id].levels[level - 1];
  if (!Number.isInteger(level) || !definition)
    throw new Error(`Invalid ${id} level: ${String(level)}`);
  return {
    ...definition,
    value:
      id === 'storage'
        ? definition.value + (config.storageBonus ?? 0)
        : Math.round(definition.value * config.durationMultiplier),
    cost: definition.cost * config.upgradeCostMultiplier,
  };
}

export function getPhaseDuration(
  state: GameState,
  config: ProductionConfig = LAYERS.shallows.production,
): number {
  const id = state.phase === 'mining' ? 'mining' : 'transport';
  return getUpgradeLevel(id, state.levels[id], config).value;
}
export function getCycleDuration(
  state: GameState,
  config: ProductionConfig = LAYERS.shallows.production,
): number {
  return (
    getUpgradeLevel('mining', state.levels.mining, config).value +
    2 * getUpgradeLevel('transport', state.levels.transport, config).value
  );
}
export function getProcessingDuration(
  state: GameState,
  config: ProductionConfig = LAYERS.shallows.production,
): number {
  return getUpgradeLevel('processing', state.levels.processing, config).value;
}
export function getStorageCapacity(
  state: GameState,
  config: ProductionConfig = LAYERS.shallows.production,
): number {
  return getUpgradeLevel('storage', state.levels.storage, config).value;
}

/** Settle simultaneous events in this order: output, dock, extraction/return, input. */
export function settleProduction(
  state: GameState,
  config: ProductionConfig,
): GameState {
  let next = state;
  const capacity = getStorageCapacity(state, config);
  let changed: boolean;
  do {
    changed = false;
    if (
      next.processingElapsedMs === getProcessingDuration(next, config) &&
      next.refined + config.resource.batchSize <= capacity
    ) {
      next = {
        ...next,
        refined: next.refined + config.resource.batchSize,
        processingElapsedMs: null,
      };
      changed = true;
    }
    if (next.phaseElapsedMs === getPhaseDuration(next, config)) {
      if (next.phase === 'delivering') {
        if (next.raw + config.resource.batchSize <= capacity) {
          next = {
            ...next,
            raw: next.raw + config.resource.batchSize,
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
    if (
      next.processingElapsedMs === null &&
      next.raw >= config.resource.batchSize
    ) {
      next = {
        ...next,
        raw: next.raw - config.resource.batchSize,
        processingElapsedMs: 0,
      };
      changed = true;
    }
  } while (changed);
  return next;
}

/** Event-based elapsed-time simulation. Full storage naturally bounds work for long spans. */
export function advanceGame(
  state: GameState,
  elapsedMs: number,
  config: ProductionConfig = LAYERS.shallows.production,
): GameState {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0)
    throw new Error('Elapsed time must be a non-negative safe integer.');
  if (!state.running || elapsedMs === 0) return state;
  let next = settleProduction(state, config);
  let remaining = elapsedMs;
  while (remaining > 0) {
    const transportLeft = getPhaseDuration(next, config) - next.phaseElapsedMs;
    const processingLeft =
      next.processingElapsedMs === null
        ? 0
        : getProcessingDuration(next, config) - next.processingElapsedMs;
    const untilEvent = Math.min(
      transportLeft > 0 ? transportLeft : Infinity,
      processingLeft > 0 ? processingLeft : Infinity,
    );
    if (!Number.isFinite(untilEvent)) break; // Both stages are blocked; no time accrues as free work.
    const step = Math.min(remaining, untilEvent);
    next = settleProduction(
      {
        ...next,
        phaseElapsedMs: next.phaseElapsedMs + (transportLeft > 0 ? step : 0),
        processingElapsedMs:
          next.processingElapsedMs === null
            ? null
            : next.processingElapsedMs + (processingLeft > 0 ? step : 0),
      },
      config,
    );
    remaining -= step;
  }
  return next;
}

export function getSaleValue(
  state: GameState,
  config: ProductionConfig = LAYERS.shallows.production,
): number {
  return (
    Math.min(
      state.refined,
      Math.floor(
        (Number.MAX_SAFE_INTEGER - state.credits) /
          config.resource.refinedValue,
      ),
    ) * config.resource.refinedValue
  );
}

export function sellRefined(
  state: GameState,
  config: ProductionConfig = LAYERS.shallows.production,
): GameState {
  const value = getSaleValue(state, config);
  if (value === 0) return state;
  return settleProduction(
    {
      ...state,
      credits: state.credits + value,
      refined: state.refined - value / config.resource.refinedValue,
    },
    config,
  );
}

export function getUpgradeOffer(
  state: GameState,
  id: UpgradeId,
  config: ProductionConfig = LAYERS.shallows.production,
) {
  const current = getUpgradeLevel(id, state.levels[id], config);
  const next =
    state.levels[id] < UPGRADES[id].levels.length
      ? getUpgradeLevel(id, state.levels[id] + 1, config)
      : undefined;
  return {
    current,
    next,
    affordable: next !== undefined && state.credits >= next.cost,
  };
}

export function buyUpgrade(
  state: GameState,
  id: UpgradeId,
  config: ProductionConfig = LAYERS.shallows.production,
): GameState {
  const offer = getUpgradeOffer(state, id, config);
  if (!offer.next || !offer.affordable) return state;
  const upgraded = {
    ...state,
    credits: state.credits - offer.next.cost,
    levels: { ...state.levels, [id]: state.levels[id] + 1 },
  };
  return settleProduction(
    {
      ...upgraded,
      phaseElapsedMs: Math.floor(
        (state.phaseElapsedMs * getPhaseDuration(upgraded, config)) /
          getPhaseDuration(state, config),
      ),
      processingElapsedMs:
        state.processingElapsedMs === null
          ? null
          : Math.floor(
              (state.processingElapsedMs *
                getProcessingDuration(upgraded, config)) /
                getProcessingDuration(state, config),
            ),
    },
    config,
  );
}

export function getProductionSummary(
  state: GameState,
  config: ProductionConfig = LAYERS.shallows.production,
) {
  const capacity = getStorageCapacity(state, config);
  const storageFull = state.refined + config.resource.batchSize > capacity;
  const dockBlocked =
    state.phase === 'delivering' &&
    state.phaseElapsedMs === getPhaseDuration(state, config);
  const processorBlocked =
    state.processingElapsedMs === getProcessingDuration(state, config) &&
    storageFull;
  const supplyMs = getCycleDuration(state, config);
  const processingMs = getProcessingDuration(state, config);
  const supplyBottleneck: UpgradeId =
    getUpgradeLevel('mining', state.levels.mining, config).value >=
    2 * getUpgradeLevel('transport', state.levels.transport, config).value
      ? 'mining'
      : 'transport';
  const bottleneck: UpgradeId = storageFull
    ? 'storage'
    : processingMs > supplyMs
      ? 'processing'
      : supplyBottleneck;
  return {
    cargo: state.phase === 'delivering' ? config.resource.batchSize : 0,
    capacity,
    storageFull,
    dockBlocked,
    processorBlocked,
    bottleneck,
    creditsPerSecond:
      (config.resource.batchSize * config.resource.refinedValue * 1000) /
      Math.max(supplyMs, processingMs),
    fullyUpgraded: UPGRADE_IDS.every(
      (id) => state.levels[id] === UPGRADES[id].levels.length,
    ),
  };
}
