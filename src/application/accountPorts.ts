import type { GameSave, SaveRepository } from './ports';
export interface AccountSaveSnapshot {
  readonly status: 'loading' | 'saved' | 'pending' | 'syncing' | 'error';
  readonly error: string | null;
  readonly syncedAt: string | null;
}
export interface AccountSaveRepository extends SaveRepository {
  getSnapshot: () => AccountSaveSnapshot;
  subscribe: (listener: () => void) => () => void;
  flush(): Promise<void>;
  takeRemoteUpdate(): GameSave | null;
}
