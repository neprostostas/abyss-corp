import type { CoreLayerId, LayerId } from './layers';

export interface ExpeditionDefinition {
  readonly name: string;
  readonly targets: Readonly<
    Record<CoreLayerId, number> & Partial<Record<LayerId, number>>
  >;
}
// Append contracts: existing completed indices and active cargo retain their meaning.
export const EXPEDITIONS: readonly ExpeditionDefinition[] = [
  {
    name: 'Map the shelf',
    targets: { shallows: 30, 'golden-trench': 24, 'pearl-caverns': 18 },
  },
  {
    name: 'Supply the deep station',
    targets: { shallows: 60, 'golden-trench': 45, 'pearl-caverns': 30 },
  },
  {
    name: 'Reach the abyss beacon',
    targets: { shallows: 90, 'golden-trench': 60, 'pearl-caverns': 45 },
  },
  {
    name: 'Stabilize the thermal station',
    targets: {
      shallows: 0,
      'golden-trench': 0,
      'pearl-caverns': 0,
      'thermal-vents': 45,
    },
  },
  {
    name: 'Chart the midnight rift',
    targets: {
      shallows: 0,
      'golden-trench': 0,
      'pearl-caverns': 0,
      'thermal-vents': 24,
      'midnight-rift': 36,
    },
  },
];
export const EXPEDITION_TRADE_BONUS = 5;
