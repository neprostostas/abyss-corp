export const CAPTAIN_NAME_LIMITS = { min: 3, max: 24 } as const;

/** PostgreSQL char_length counts Unicode code points, not UTF-16 code units. */
export function normalizeCaptainName(value: string): string {
  const name = value.trim();
  const length = Array.from(name).length;
  if (
    length < CAPTAIN_NAME_LIMITS.min ||
    length > CAPTAIN_NAME_LIMITS.max ||
    /[\p{Cc}]/u.test(name)
  )
    throw new Error('Use 3-24 characters without control characters.');
  return name;
}

const segmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function captainInitial(name: string): string {
  if (segmenter) {
    for (const { segment } of segmenter.segment(name))
      return segment.toUpperCase();
  }
  return (Array.from(name)[0] ?? '?').toUpperCase();
}

/** Format only the legacy generated name; preserve player-chosen nicknames. */
export function displayPlayerName(name: string, userId: string): string {
  const tag = userId.replaceAll('-', '').slice(0, 8).toUpperCase();
  return name === `Captain ${tag}` ? `#${tag}` : name;
}
