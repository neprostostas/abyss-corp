export const RESOURCE = {
  name: 'Crystals',
  batchSize: 3,
  creditValue: 5,
} as const;
export const LAYER = { name: 'Crystal shallows', depthMeters: 50 } as const;

// Each entry describes the resulting level. Level 1 is free.
export const UPGRADES = {
  mining: {
    name: 'Crystal drill',
    description: 'Extract each cargo of crystals faster.',
    levels: [
      { durationMs: 4000, cost: 0 },
      { durationMs: 3200, cost: 30 },
      { durationMs: 2500, cost: 60 },
      { durationMs: 1800, cost: 105 },
      { durationMs: 1200, cost: 165 },
    ],
  },
  transport: {
    name: 'Submarine engine',
    description: 'Shorten both the delivery and return trip.',
    levels: [
      { durationMs: 2500, cost: 0 },
      { durationMs: 2000, cost: 30 },
      { durationMs: 1500, cost: 60 },
      { durationMs: 1100, cost: 105 },
      { durationMs: 800, cost: 165 },
    ],
  },
} as const;

export const UPGRADE_IDS = ['mining', 'transport'] as const;
export const SESSION_TIMING = { tickMs: 100, autosaveMs: 2000 } as const;
