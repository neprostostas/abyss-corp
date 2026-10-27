/** Cargo goals, not timers: upgraded bases and active pilots complete these faster. */
export const EXPEDITIONS = [
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
] as const;
export const EXPEDITION_TRADE_BONUS = 5;
