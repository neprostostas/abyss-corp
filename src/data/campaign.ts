export const INFRASTRUCTURE_IDS = ['depot', 'exchange', 'sonar'] as const;
export type InfrastructureId = (typeof INFRASTRUCTURE_IDS)[number];
export const INFRASTRUCTURE = {
  depot: {
    name: 'Cargo depot',
    costs: [800, 2400, 7200],
    bonusPerLevel: 8,
    unit: 'slots',
    effect: 'Storage · all outposts',
  },
  exchange: {
    name: 'Trade hub',
    costs: [1200, 3600, 10800],
    bonusPerLevel: 10,
    unit: '%',
    effect: 'Sale value · all outposts',
  },
  sonar: {
    name: 'Sonar array',
    costs: [600, 1800, 5400],
    bonusPerLevel: 10,
    unit: '%',
    effect: 'Lower depth unlock cost',
  },
} as const;
export const PRESTIGE = {
  requiredCredits: 25000,
  requiredLayer: 'midnight-rift',
  bonusPerRank: 20,
  maxRank: 25,
} as const;
