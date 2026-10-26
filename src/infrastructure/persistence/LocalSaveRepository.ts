import { z } from 'zod';
import type { GameSave, SaveRepository } from '../../application/ports';
import { UPGRADES } from '../../data/balance';
import { getPhaseDuration } from '../../domain/game';

export const SAVE_KEY = 'abyss-corp.save';
const gameSchema = z
  .object({
    credits: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    levels: z
      .object({
        mining: z.number().int().min(1).max(UPGRADES.mining.levels.length),
        transport: z
          .number()
          .int()
          .min(1)
          .max(UPGRADES.transport.levels.length),
      })
      .strict(),
    phase: z.enum(['mining', 'delivering', 'returning']),
    phaseElapsedMs: z.number().int().nonnegative(),
    running: z.boolean(),
  })
  .strict()
  .refine(
    (game) => game.phaseElapsedMs < getPhaseDuration(game),
    'Phase progress exceeds its duration.',
  );

const saveSchema = z
  .object({
    version: z.literal(1),
    savedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    game: gameSchema,
  })
  .strict();

export function parseSave(raw: string): GameSave {
  const data: unknown = JSON.parse(raw);
  return saveSchema.parse(data);
}

/** The storage getter defers access so blocked browser storage is a recoverable load error. */
export class LocalSaveRepository implements SaveRepository {
  constructor(
    private readonly storage: () => Pick<Storage, 'getItem' | 'setItem'>,
  ) {}

  load(): Promise<GameSave | null> {
    return new Promise((resolve) => {
      const raw = this.storage().getItem(SAVE_KEY);
      resolve(raw === null ? null : parseSave(raw));
    });
  }

  save(data: GameSave): Promise<void> {
    // Execute the local write synchronously, including during pagehide, while
    // exposing the same rejection-based contract as a future async adapter.
    return new Promise((resolve) => {
      this.storage().setItem(SAVE_KEY, JSON.stringify(saveSchema.parse(data)));
      resolve();
    });
  }
}
