import type { WorldState } from '../domain/world';

export interface GameSave {
  readonly version: 3 | 4 | 5 | 6 | 7;
  readonly savedAt: number;
  readonly world: WorldState;
}

export interface SaveRepository {
  load(): Promise<GameSave | null>;
  backup?(data: GameSave): Promise<void>;
  save(data: GameSave): Promise<void>;
}

export interface Clock {
  /** Monotonic integer milliseconds used for simulation. */
  now(): number;
  /** Wall time for persisted activity and capped offline progress. */
  timestamp(): number;
}
