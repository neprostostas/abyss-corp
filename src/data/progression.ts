export const RESEARCH_IDS = ['trade', 'storage'] as const;
export type ResearchId = (typeof RESEARCH_IDS)[number];
export const RESEARCH = {
  trade: {
    name: 'Deep-sea trade',
    description:
      'Raise refined cargo prices across every outpost, including automatic and offline sales.',
    costs: [180, 450, 900],
    bonusPerLevel: 25,
    unit: '% sale value',
    icon: '↗',
  },
  storage: {
    name: 'Modular warehousing',
    description:
      'Add slots to both raw and refined buffers at every current and future outpost.',
    costs: [120, 300, 650],
    bonusPerLevel: 3,
    unit: ' storage slots',
    icon: '▣',
  },
} as const;

export const MISSION_IDS = [
  'improve',
  'automate',
  'expand',
  'discover',
  'explore',
  'network',
  'research',
] as const;
export type MissionId = (typeof MISSION_IDS)[number];
interface MissionDefinition {
  readonly name: string;
  readonly description: string;
  readonly metric: 'upgrades' | 'modules' | 'layers' | 'research';
  readonly target: number;
  readonly reward: number;
}
export const MISSIONS = {
  improve: {
    name: 'Better foundations',
    description: 'Purchase four production upgrades across your outposts.',
    metric: 'upgrades',
    target: 4,
    reward: 60,
  },
  automate: {
    name: 'A helping hand',
    description: 'Install your first cargo sales module.',
    metric: 'modules',
    target: 1,
    reward: 90,
  },
  expand: {
    name: 'Into the trench',
    description: 'Establish two underwater outposts.',
    metric: 'layers',
    target: 2,
    reward: 150,
  },
  discover: {
    name: 'Corporate science',
    description: 'Complete your first research level.',
    metric: 'research',
    target: 1,
    reward: 120,
  },
  explore: {
    name: 'Ocean explorer',
    description: 'Unlock all three depths.',
    metric: 'layers',
    target: 3,
    reward: 300,
  },
  network: {
    name: 'An independent network',
    description: 'Install sales modules at all three outposts.',
    metric: 'modules',
    target: 3,
    reward: 450,
  },
  research: {
    name: 'A brighter abyss',
    description: 'Complete all six research levels.',
    metric: 'research',
    target: 6,
    reward: 900,
  },
} as const satisfies Record<MissionId, MissionDefinition>;
