// Each entry describes the resulting level. Level 1 is free.
// Values are milliseconds for machines and cargo slots per buffer for storage.
export const UPGRADES = {
  mining: {
    name: 'Extraction drill',
    description: 'Extract each cargo faster.',
    levels: [
      { value: 4000, cost: 0 },
      { value: 3200, cost: 24 },
      { value: 2500, cost: 48 },
      { value: 1800, cost: 90 },
      { value: 1200, cost: 140 },
    ],
  },
  transport: {
    name: 'Submarine engine',
    description: 'Shorten both the delivery and return trip.',
    levels: [
      { value: 2500, cost: 0 },
      { value: 2000, cost: 24 },
      { value: 1500, cost: 48 },
      { value: 1100, cost: 90 },
      { value: 800, cost: 140 },
    ],
  },
  processing: {
    name: 'Refinery',
    description: 'Process delivered materials into valuable cargo.',
    levels: [
      { value: 6000, cost: 0 },
      { value: 4500, cost: 36 },
      { value: 3200, cost: 72 },
      { value: 2200, cost: 120 },
      { value: 1500, cost: 180 },
    ],
  },
  storage: {
    name: 'Cargo warehouse',
    description: 'Expand both the raw intake and refined storage.',
    levels: [
      { value: 6, cost: 0 },
      { value: 12, cost: 36 },
      { value: 18, cost: 72 },
      { value: 30, cost: 120 },
      { value: 48, cost: 180 },
    ],
  },
} as const;

export const UPGRADE_IDS = [
  'mining',
  'transport',
  'processing',
  'storage',
] as const;
export const SESSION_TIMING = { tickMs: 100, autosaveMs: 2000 } as const;
