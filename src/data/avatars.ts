const choices: readonly (readonly [string, string])[] = [
  ['jellyfish', 'Jellyfish'],
  ['nautilus', 'Nautilus'],
  ['octopus', 'Octopus'],
  ['manta', 'Manta ray'],
  ['anglerfish', 'Anglerfish'],
  ['seahorse', 'Seahorse'],
  ['turtle', 'Sea turtle'],
  ['crab', 'Crab'],
  ['starfish', 'Starfish'],
  ['axolotl', 'Axolotl'],
  ['whale', 'Whale'],
  ['shark', 'Shark'],
  ['crystal', 'Abyss crystal'],
  ['pearl', 'Pearl'],
  ['coral', 'Coral'],
  ['diver', 'Deep sea diver'],
  ['submarine', 'Submarine'],
  ['robot', 'Scout robot'],
  ['vent', 'Hydrothermal vent'],
  ['compass', 'Compass'],
];
export const AVATARS = choices.map(([id, name]) => ({
  id,
  name,
  url: `/avatars/${id}.webp`,
}));

export function customAvatar(metadata: Record<string, unknown>): string | null {
  const choice = metadata.abyss_avatar;
  const preset = AVATARS.find((avatar) => avatar.id === choice);
  if (preset) return preset.url;
  if (choice === 'upload' && typeof metadata.abyss_avatar_url === 'string') {
    try {
      const url = new URL(metadata.abyss_avatar_url);
      if (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        url.pathname.includes('/storage/v1/object/public/avatars/')
      )
        return url.href;
    } catch {
      /* Fall back to the social profile photo. */
    }
  }
  return null;
}
