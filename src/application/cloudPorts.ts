import type { GameSave } from './ports';

export interface ServerSnapshot {
  readonly revision: number;
  readonly updatedAt: number;
  readonly save: GameSave;
}
export interface CloudSaveGateway {
  connect(): Promise<string>;
  load(): Promise<ServerSnapshot | null>;
  save(save: GameSave, expectedRevision: number): Promise<ServerSnapshot>;
}
export class SaveConflictError extends Error {
  constructor(readonly snapshot: ServerSnapshot | null) {
    super('The server copy changed. Choose which progress to keep.');
  }
}
