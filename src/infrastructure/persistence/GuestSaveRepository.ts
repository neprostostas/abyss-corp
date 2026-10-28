import type { GameSave, SaveRepository } from '../../application/ports';
import { validateSave } from './saveSchema';

export class GuestSaveRepository implements SaveRepository {
  readonly key = 'abyss-corp.guest.v1';
  private generation: string | null | undefined;
  constructor(private readonly storage: () => Storage) {}
  load(): Promise<GameSave | null> {
    return new Promise((resolve) => {
      const raw = this.storage().getItem(this.key);
      const data: unknown = raw ? JSON.parse(raw) : null;
      if (
        data &&
        typeof data === 'object' &&
        'generation' in data &&
        'save' in data &&
        typeof data.generation === 'string'
      ) {
        this.generation = data.generation;
        resolve(validateSave(data.save));
      } else {
        this.generation = null;
        resolve(data ? validateSave(data) : null);
      }
    });
  }
  save(save: GameSave): Promise<void> {
    return new Promise((resolve) => {
      const raw = this.storage().getItem(this.key);
      const current: unknown = raw ? JSON.parse(raw) : null;
      const generation =
        current &&
        typeof current === 'object' &&
        'generation' in current &&
        typeof current.generation === 'string'
          ? current.generation
          : null;
      if (this.generation === undefined) this.generation = generation;
      if (generation !== this.generation)
        throw new Error(
          'This game was restarted in another tab. Reload to continue.',
        );
      const data = validateSave(save);
      this.storage().setItem(
        this.key,
        JSON.stringify(generation ? { generation, save: data } : data),
      );
      resolve();
    });
  }
  reset(save: GameSave): Promise<void> {
    return new Promise((resolve) => {
      const generation = crypto.randomUUID();
      this.storage().setItem(
        this.key,
        JSON.stringify({ generation, save: validateSave(save) }),
      );
      this.generation = generation;
      try {
        this.storage().removeItem(`${this.key}.transfer`);
      } catch {
        /* The new game is already stored atomically. */
      }
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
    const beforeLoad = storage.getItem(this.key);
    const save = await this.load();
    if (storage.getItem(this.key) !== beforeLoad)
      throw new Error(
        'Guest progress changed or was restarted while preparing transfer. Please try again.',
      );
    if (!save) return null;
    // Another claim may have completed while the device save was loading.
    if (storage.getItem(archiveKey)) return this.claim(userId);
    storage.setItem(archiveKey, JSON.stringify({ userId, save }));
    return save;
  }
}
