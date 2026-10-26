import { RESOURCES } from './resources';
import type { ResourceDefinition } from './resources';

export interface ProductionConfig {
  readonly storageBonus?: number;
  readonly resource: ResourceDefinition;
  readonly durationMultiplier: number;
  readonly upgradeCostMultiplier: number;
}
interface LayerDefinition {
  readonly name: string;
  readonly depthMeters: number;
  readonly unlockCost: number;
  readonly description: string;
  readonly production: ProductionConfig;
  readonly visual: {
    readonly oceanTop: string;
    readonly oceanBottom: string;
    readonly coral: string;
    readonly formation: 'shelf' | 'trench' | 'cavern';
  };
}

export const LAYER_IDS = [
  'shallows',
  'golden-trench',
  'pearl-caverns',
] as const;
export type LayerId = (typeof LAYER_IDS)[number];
export const LAYERS = {
  shallows: {
    name: 'Crystal shallows',
    depthMeters: 50,
    unlockCost: 0,
    description:
      'Sunlit shelves and bright crystal veins. Your first underwater operation.',
    production: {
      resource: RESOURCES.crystals,
      durationMultiplier: 1,
      upgradeCostMultiplier: 1,
    },
    visual: {
      oceanTop: '#28bfd1',
      oceanBottom: '#07557e',
      coral: '#ff8d93',
      formation: 'shelf',
    },
  },
  'golden-trench': {
    name: 'Golden trench',
    depthMeters: 180,
    unlockCost: 200,
    description:
      'Gold seams between steep rock walls. Slower trips carry more valuable cargo.',
    production: {
      resource: RESOURCES.gold,
      durationMultiplier: 1.5,
      upgradeCostMultiplier: 2,
    },
    visual: {
      oceanTop: '#127f9e',
      oceanBottom: '#103c68',
      coral: '#ffbd76',
      formation: 'trench',
    },
  },
  'pearl-caverns': {
    name: 'Pearl caverns',
    depthMeters: 420,
    unlockCost: 650,
    description:
      'Glowing oysters beneath a cavern canopy. Polish precious pearls at your new outpost.',
    production: {
      resource: RESOURCES.pearls,
      durationMultiplier: 2,
      upgradeCostMultiplier: 4,
    },
    visual: {
      oceanTop: '#36518b',
      oceanBottom: '#171f49',
      coral: '#e9a9ff',
      formation: 'cavern',
    },
  },
} as const satisfies Record<LayerId, LayerDefinition>;
