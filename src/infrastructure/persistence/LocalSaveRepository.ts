import type { GameSave, SaveRepository } from '../../application/ports';
import { parseSave, validateSave } from './saveSchema';

export const SAVE_KEY = 'abyss-corp.save';
export const LEGACY_BACKUP_KEY = 'abyss-corp.save.v1-backup';
export const V5_BACKUP_KEY = 'abyss-corp.save.v5-backup';
export const V4_BACKUP_KEY = 'abyss-corp.save.v4-backup';
export const V3_BACKUP_KEY = 'abyss-corp.save.v3-backup';
export const V2_BACKUP_KEY = 'abyss-corp.save.v2-backup';

/** Defers storage access so blocked browser storage is a recoverable error. */
export class LocalSaveRepository implements SaveRepository {
  constructor(
    private readonly storage: () => Pick<Storage, 'getItem' | 'setItem'>,
  ) {}

  backup(data: GameSave): Promise<void> {
    return new Promise((resolve) => {
      this.storage().setItem(
        'abyss-corp.save.before-server-restore',
        JSON.stringify(validateSave(data)),
      );
      resolve();
    });
  }

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
          (header.version === 1 ||
            header.version === 2 ||
            header.version === 3 ||
            header.version === 4 ||
            header.version === 5)
        ) {
          storage.setItem(
            header.version === 1
              ? LEGACY_BACKUP_KEY
              : header.version === 2
                ? V2_BACKUP_KEY
                : header.version === 3
                  ? V3_BACKUP_KEY
                  : header.version === 4
                    ? V4_BACKUP_KEY
                    : V5_BACKUP_KEY,
            previous,
          );
        }
      }
      storage.setItem(SAVE_KEY, serialized);
      resolve();
    });
  }
}
