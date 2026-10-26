import type { GameState } from '../domain/game';

export interface GameSave {
  readonly version: 1;
  readonly savedAt: number;
  readonly game: GameState;
}

export interface SaveRepository {
  load(): Promise<GameSave | null>;
  save(data: GameSave): Promise<void>;
}

export interface Clock {
  /** Monotonic integer milliseconds used for simulation. */
  now(): number;
  /** Wall time is metadata only, never used for offline earnings in this milestone. */
  timestamp(): number;
}
