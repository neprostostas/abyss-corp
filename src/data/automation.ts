export const AUTOMATION_LEVELS = [
  { cost: 80, intervalMs: 12000 },
  { cost: 180, intervalMs: 6000 },
  { cost: 360, intervalMs: 2000 },
] as const;
export const OFFLINE_LIMIT_MS = 4 * 60 * 60 * 1000;
export const OFFLINE_REPORT_MIN_MS = 1000;

// Treat a long foreground timer gap (for example device sleep) as an absence.
export const ACTIVE_GAP_LIMIT_MS = 30000;

// Ignore small differences between wall and monotonic clock sampling.
export const ACTIVE_CLOCK_DRIFT_MS = 1000;

export const SPECIALIST_IDS = ['quartermaster', 'broker'] as const;
export type SpecialistId = (typeof SPECIALIST_IDS)[number];
export const SPECIALISTS = {
  quartermaster: {
    name: 'Quartermaster',
    description: 'Expands raw and refined storage.',
    costs: [100, 260, 600],
    bonusPerLevel: 4,
    unit: ' slots',
    icon: 'storage',
  },
  broker: {
    name: 'Trade officer',
    description: 'Better prices on every sale, online or offline.',
    costs: [160, 400, 900],
    bonusPerLevel: 15,
    unit: '% sale value',
    icon: 'trade-network',
  },
} as const;
