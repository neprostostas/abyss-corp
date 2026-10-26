import { z } from 'zod';
import type { GameSave } from '../../application/ports';
import { UPGRADES } from '../../data/balance';
import {
  getPhaseDuration,
  getProcessingDuration,
  getStorageCapacity,
} from '../../domain/game';

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const phase = z.enum(['mining', 'delivering', 'returning']);
const level = (max: number) => z.number().int().min(1).max(max);
const saveSchema = z
  .object({
    version: z.literal(2),
    savedAt: integer,
    game: z
      .object({
        credits: integer,
        phase,
        phaseElapsedMs: integer,
        running: z.boolean(),
        levels: z
          .object({
            mining: level(UPGRADES.mining.levels.length),
            transport: level(UPGRADES.transport.levels.length),
            processing: level(UPGRADES.processing.levels.length),
            storage: level(UPGRADES.storage.levels.length),
          })
          .strict(),
        raw: integer,
        refined: integer,
        processingElapsedMs: integer.nullable(),
      })
      .strict(),
  })
  .strict();

// Freeze v1 balance here: future balance changes must not redefine old save validity.
const LEGACY_DURATIONS = {
  mining: [4000, 3200, 2500, 1800, 1200],
  transport: [2500, 2000, 1500, 1100, 800],
} as const;
const legacySchema = z
  .object({
    version: z.literal(1),
    savedAt: integer,
    game: z
      .object({
        credits: integer,
        phase,
        phaseElapsedMs: integer,
        running: z.boolean(),
        levels: z.object({ mining: level(5), transport: level(5) }).strict(),
      })
      .strict(),
  })
  .strict();

export function validateSave(data: unknown): GameSave {
  const save = saveSchema.parse(data);
  const game = save.game;
  const duration = getPhaseDuration(game);
  if (
    game.phaseElapsedMs > duration ||
    (game.phase !== 'delivering' && game.phaseElapsedMs === duration)
  )
    throw new Error('Invalid transport progress.');
  if (
    game.raw > getStorageCapacity(game) ||
    game.refined > getStorageCapacity(game)
  )
    throw new Error('Storage exceeds capacity.');
  if (
    game.processingElapsedMs !== null &&
    game.processingElapsedMs > getProcessingDuration(game)
  )
    throw new Error('Invalid refinery progress.');
  return save;
}

export function parseSave(raw: string): GameSave {
  const data: unknown = JSON.parse(raw);
  const version = z.object({ version: z.number() }).parse(data).version;
  if (version !== 1) return validateSave(data);
  const legacy = legacySchema.parse(data);
  const id = legacy.game.phase === 'mining' ? 'mining' : 'transport';
  const duration = LEGACY_DURATIONS[id][legacy.game.levels[id] - 1];
  if (duration === undefined || legacy.game.phaseElapsedMs >= duration)
    throw new Error('Invalid legacy phase progress.');
  // Delivering retains its cargo; returning was already paid in v1 and grants no new cargo.
  return validateSave({
    ...legacy,
    version: 2,
    game: {
      ...legacy.game,
      levels: { ...legacy.game.levels, processing: 1, storage: 1 },
      raw: 0,
      refined: 0,
      processingElapsedMs: null,
    },
  });
}
