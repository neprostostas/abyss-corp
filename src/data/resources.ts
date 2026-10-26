export interface ResourceDefinition {
  readonly name: string;
  readonly unit: string;
  readonly refinedName: string;
  readonly batchSize: number;
  readonly refinedValue: number;
  readonly color: string;
  readonly shape: 'crystal' | 'ingot' | 'pearl';
}

export const RESOURCES = {
  crystals: {
    name: 'Crystals',
    unit: 'crystals',
    refinedName: 'Refined crystals',
    batchSize: 3,
    refinedValue: 8,
    color: '#a1fff1',
    shape: 'crystal',
  },
  gold: {
    name: 'Gold',
    unit: 'gold ore',
    refinedName: 'Gold ingots',
    batchSize: 3,
    refinedValue: 20,
    color: '#ffda6b',
    shape: 'ingot',
  },
  pearls: {
    name: 'Pearls',
    unit: 'rough pearls',
    refinedName: 'Polished pearls',
    batchSize: 3,
    refinedValue: 45,
    color: '#f7c5ff',
    shape: 'pearl',
  },
} as const satisfies Record<string, ResourceDefinition>;
