import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SaveRow } from './database.types';
import type { GameSave } from '../../application/ports';
import type {
  AccountSaveRepository as AccountSavePort,
  AccountSaveSnapshot,
} from '../../application/accountPorts';
import { validateSave } from '../persistence/saveSchema';

const cacheSchema = z
  .object({
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    dirty: z.boolean(),
    save: z.unknown(),
    pendingWrite: z
      .object({ id: z.uuid(), save: z.unknown() })
      .strict()
      .optional(),
  })
  .strict();
interface CachedSave {
  revision: number;
  dirty: boolean;
  save: GameSave;
  pendingWrite?: { id: string; save: GameSave };
}

/** A per-account local journal plus automatic, revision-checked cloud writes. */
export class AccountSaveRepository implements AccountSavePort {
  private snapshot: AccountSaveSnapshot = {
    status: 'loading',
    error: null,
    syncedAt: null,
  };
  private readonly listeners = new Set<() => void>();
  private cache: CachedSave | null = null;
  private flushing: Promise<void> | null = null;
  private loaded = false;
  private remoteUpdate: GameSave | null = null;
  readonly key: string;
  constructor(
    private readonly client: SupabaseClient<Database>,
    readonly userId: string,
    private readonly storage: () => Storage,
  ) {
    this.key = `abyss-corp.account.${userId}`;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<AccountSaveSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    for (const listener of this.listeners) listener();
  }
  private readCache(): CachedSave | null {
    const raw = this.storage().getItem(this.key);
    if (!raw) return null;
    const parsed = cacheSchema.parse(JSON.parse(raw));
    const { pendingWrite, ...entry } = parsed;
    return {
      ...entry,
      save: validateSave(entry.save),
      ...(pendingWrite
        ? {
            pendingWrite: {
              id: pendingWrite.id,
              save: validateSave(pendingWrite.save),
            },
          }
        : {}),
    };
  }
  private store(cache: CachedSave) {
    this.storage().setItem(this.key, JSON.stringify(cache));
    this.cache = cache;
  }
  takeRemoteUpdate(): GameSave | null {
    const update = this.remoteUpdate;
    this.remoteUpdate = null;
    return update;
  }
  private async remote(): Promise<SaveRow | null> {
    const { data, error } = await this.client
      .from('game_saves')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();
    if (error)
      throw new Error('Cannot load account progress. Check your connection.');
    if (data) validateSave(data.save);
    return data;
  }
  async load(): Promise<GameSave | null> {
    try {
      let local = this.readCache();
      const remote = await this.remote();
      if (local?.pendingWrite && remote?.write_id === local.pendingWrite.id) {
        local = {
          revision: remote.revision,
          dirty: local.dirty,
          save: local.save,
        };
      }
      if (local?.dirty && local.revision !== (remote?.revision ?? 0)) {
        await this.backup(local.save);
        local = null;
      }
      const selected = local?.dirty
        ? local
        : remote
          ? {
              revision: remote.revision,
              dirty: false,
              save: validateSave(remote.save),
            }
          : null;
      if (selected) this.store(selected);
      else {
        this.storage().removeItem(this.key);
        this.cache = null;
      }
      this.loaded = true;
      this.publish({
        status: selected?.dirty ? 'pending' : 'saved',
        error: null,
        syncedAt: remote?.updated_at ?? null,
      });
      return selected?.save ?? null;
    } catch (error) {
      this.publish({
        status: 'error',
        error: 'Account progress is unavailable. Retry loading.',
      });
      throw error;
    }
  }
  backup(save: GameSave): Promise<void> {
    return new Promise((resolve) => {
      this.storage().setItem(
        `${this.key}.backup`,
        JSON.stringify(validateSave(save)),
      );
      resolve();
    });
  }
  save(save: GameSave): Promise<void> {
    return new Promise((resolve) => {
      if (!this.loaded)
        throw new Error('Account progress must load before saving.');
      this.store({
        ...this.cache,
        revision: this.cache?.revision ?? 0,
        dirty: true,
        save: validateSave(save),
      });
      if (this.snapshot.status !== 'error') this.publish({ status: 'pending' });
      resolve();
    });
  }
  flush = (): Promise<void> => {
    if (!this.loaded || !this.cache?.dirty) return Promise.resolve();
    if (this.flushing) return this.flushing;
    this.flushing = this.upload().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  };
  private async upload() {
    let captured = this.cache;
    if (!captured) return;
    this.publish({ status: 'syncing', error: null });
    try {
      const pendingWrite = captured.pendingWrite ?? {
        id: crypto.randomUUID(),
        save: captured.save,
      };
      captured = { ...captured, pendingWrite };
      this.store(captured);
      const { data, error } = await this.client.rpc('write_game_save', {
        account_id: this.userId,
        expected_revision: captured.revision,
        payload: z.json().parse(validateSave(pendingWrite.save)),
        operation_id: pendingWrite.id,
      });
      if (error?.code === 'PT409') {
        const remote = await this.remote();
        if (!remote)
          throw new Error('Account progress is unavailable. Retry syncing.');
        const current = this.cache ?? captured;
        await this.backup(current.save);
        const save = validateSave(remote.save);
        this.store({ save, revision: remote.revision, dirty: false });
        this.remoteUpdate = save;
        this.publish({
          status: 'saved',
          error: null,
          syncedAt: remote.updated_at,
        });
        return;
      }
      const row = data?.[0];
      if (error || !row)
        throw new Error(
          'Cloud save failed. Your progress is saved on this device.',
        );
      validateSave(row.save);
      const current = this.cache ?? captured;
      const dirty =
        JSON.stringify(current.save) !== JSON.stringify(pendingWrite.save);
      this.store({ save: current.save, revision: row.revision, dirty });
      this.publish({
        status: dirty ? 'pending' : 'saved',
        syncedAt: row.updated_at,
        error: null,
      });
    } catch (error) {
      this.publish({
        status: 'error',
        error:
          error instanceof Error ? error.message : 'Cloud save failed. Retry.',
      });
    }
  }
}
