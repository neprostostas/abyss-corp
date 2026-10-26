import type { GameSave, SaveRepository } from '../../application/ports';
import { parseSave, validateSave } from './saveSchema';

export const SAVE_KEY = 'abyss-corp.save';
export const LEGACY_BACKUP_KEY = 'abyss-corp.save.v1-backup';

/** Defers storage access so blocked browser storage is a recoverable error. */
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
    // The local write executes synchronously for pagehide reliability.
    return new Promise((resolve) => {
      const serialized = JSON.stringify(validateSave(data));
      const storage = this.storage();
      const previous = storage.getItem(SAVE_KEY);
      if (previous !== null) {
        // Refuse to overwrite invalid/newer data, including a save changed in another tab.
        parseSave(previous);
        const header: unknown = JSON.parse(previous);
        if (
          typeof header === 'object' &&
          header !== null &&
          'version' in header &&
          header.version === 1
        ) {
          storage.setItem(LEGACY_BACKUP_KEY, previous);
        }
      }
      storage.setItem(SAVE_KEY, serialized);
      resolve();
    });
  }
}
