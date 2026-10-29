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
  costGrowth: { numerator: 8, denominator: 5 },
  requiredLayer: 'midnight-rift',
  bonusPerRank: 20,
  maxRank: 25,
} as const;

/** Geometric cost growth outpaces the additive +20% income bonus. */
export function getPrestigeCost(rank: number): number {
  const numerator =
    BigInt(PRESTIGE.requiredCredits) *
    BigInt(PRESTIGE.costGrowth.numerator) ** BigInt(rank);
  const step = BigInt(PRESTIGE.costGrowth.denominator) ** BigInt(rank) * 1000n;
  return Number(((numerator + step - 1n) / step) * 1000n);
}
