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

export const CORE_LAYER_IDS = [
  'shallows',
  'golden-trench',
  'pearl-caverns',
] as const;
export type CoreLayerId = (typeof CORE_LAYER_IDS)[number];
export const LAYER_IDS = [
  ...CORE_LAYER_IDS,
  'thermal-vents',
  'midnight-rift',
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
  'thermal-vents': {
    name: 'Thermal vents',
    depthMeters: 900,
    unlockCost: 4800,
    description: 'Titanium seams beneath the volcanic shelf.',
    production: {
      resource: RESOURCES.titanium,
      durationMultiplier: 2.5,
      upgradeCostMultiplier: 8,
    },
    visual: {
      oceanTop: '#204654',
      oceanBottom: '#142c39',
      coral: '#ff9b6a',
      formation: 'trench',
    },
  },
  'midnight-rift': {
    name: 'Midnight rift',
    depthMeters: 1900,
    unlockCost: 18000,
    description: 'Luminous cores at the edge of the known ocean.',
    production: {
      resource: RESOURCES.lumens,
      durationMultiplier: 3,
      upgradeCostMultiplier: 16,
    },
    visual: {
      oceanTop: '#233c65',
      oceanBottom: '#0b192d',
      coral: '#89baff',
      formation: 'cavern',
    },
  },
} as const satisfies Record<LayerId, LayerDefinition>;
