import { RESOURCES } from './resources';

export const RESOURCE = RESOURCES.crystals;

// Each entry describes the resulting level. Level 1 is free.
// Values are milliseconds for machines and crystal slots per buffer for storage.
export const UPGRADES = {
  mining: {
    name: 'Extraction drill',
    description: 'Extract each cargo faster.',
    levels: [
      { value: 4000, cost: 0 },
      { value: 3200, cost: 30 },
      { value: 2500, cost: 60 },
      { value: 1800, cost: 105 },
      { value: 1200, cost: 165 },
    ],
  },
  transport: {
    name: 'Submarine engine',
    description: 'Shorten both the delivery and return trip.',
    levels: [
      { value: 2500, cost: 0 },
      { value: 2000, cost: 30 },
      { value: 1500, cost: 60 },
      { value: 1100, cost: 105 },
      { value: 800, cost: 165 },
    ],
  },
  processing: {
    name: 'Refinery',
    description: 'Process delivered materials into valuable cargo.',
    levels: [
      { value: 6000, cost: 0 },
      { value: 4500, cost: 45 },
      { value: 3200, cost: 90 },
      { value: 2200, cost: 150 },
      { value: 1500, cost: 225 },
    ],
  },
  storage: {
    name: 'Cargo warehouse',
    description: 'Expand both the raw intake and refined storage.',
    levels: [
      { value: 6, cost: 0 },
      { value: 12, cost: 45 },
      { value: 18, cost: 90 },
      { value: 30, cost: 150 },
      { value: 48, cost: 225 },
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
