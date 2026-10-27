import type { GameSave, SaveRepository } from '../../application/ports';
import { validateSave } from './saveSchema';

export class GuestSaveRepository implements SaveRepository {
  readonly key = 'abyss-corp.guest.v1';
  constructor(private readonly storage: () => Storage) {}
  load(): Promise<GameSave | null> {
    return new Promise((resolve) => {
      const raw = this.storage().getItem(this.key);
      resolve(raw ? validateSave(JSON.parse(raw)) : null);
    });
  }
  save(save: GameSave): Promise<void> {
    return new Promise((resolve) => {
      this.storage().setItem(this.key, JSON.stringify(validateSave(save)));
      resolve();
    });
  }
  /** Bind a transfer before uploading, so retries cannot give it to another account. */
  async claim(userId: string): Promise<GameSave | null> {
    const storage = this.storage();
    const archiveKey = `${this.key}.transfer`;
    const raw = storage.getItem(archiveKey);
    if (raw) {
      const transfer: unknown = JSON.parse(raw);
      if (
        !transfer ||
        typeof transfer !== 'object' ||
        !('userId' in transfer) ||
        !('save' in transfer)
      )
        throw new Error(
          'Guest transfer is unavailable. Your device progress has been kept.',
        );
      if (transfer.userId === userId) return validateSave(transfer.save);
      return null;
    }
    const save = await this.load();
    if (!save) return null;
    // Another claim may have completed while the device save was loading.
    if (storage.getItem(archiveKey)) return this.claim(userId);
    storage.setItem(archiveKey, JSON.stringify({ userId, save }));
    return save;
  }
}
