import type { Clock } from '../../application/ports';

export const browserClock: Clock = {
  now: () => Math.floor(performance.now()),
  timestamp: () => Date.now(),
};
