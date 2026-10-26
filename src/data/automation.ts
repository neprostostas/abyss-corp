export const AUTOMATION_LEVELS = [
  { cost: 120, intervalMs: 12000 },
  { cost: 240, intervalMs: 6000 },
  { cost: 480, intervalMs: 2000 },
] as const;
export const OFFLINE_LIMIT_MS = 4 * 60 * 60 * 1000;
export const OFFLINE_REPORT_MIN_MS = 1000;

// Treat a long foreground timer gap (for example device sleep) as an absence.
export const ACTIVE_GAP_LIMIT_MS = 30000;
