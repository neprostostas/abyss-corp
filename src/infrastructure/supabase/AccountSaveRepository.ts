import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SaveRow } from './database.types';
import type { GameSave } from '../../application/ports';
import type {
  AccountSaveRepository as AccountSavePort,
  AccountSaveSnapshot,
} from '../../application/accountPorts';
import { validateSave } from '../persistence/saveSchema';
import { createExpedition, getProgression } from '../../domain/progression';

const cacheSchema = z
  .object({
    epoch: z.number().int().nonnegative().default(0),
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
  epoch?: number;
  revision: number;
  dirty: boolean;
  save: GameSave;
  pendingWrite?: { id: string; save: GameSave };
}

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
  private paused = false;
  private remoteUpdate: GameSave | null = null;
  readonly key: string;
  constructor(
    private readonly client: SupabaseClient<Database>,
    readonly userId: string,
    private readonly storage: () => Storage,
    private readonly initialSave?: () => Promise<GameSave | null>,
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
  /** Completed contracts are permanent milestones; never merge money or cargo. */
  private preserveExpeditions(
    save: GameSave,
    ...sources: GameSave[]
  ): GameSave {
    const completed = Math.max(
      save.world.progression?.expedition?.completed ?? 0,
      ...sources.map(
        (source) => source.world.progression?.expedition?.completed ?? 0,
      ),
    );
    if (completed === (save.world.progression?.expedition?.completed ?? 0))
      return save;
    return validateSave({
      ...save,
      version: 7,
      world: {
        ...save.world,
        progression: {
          ...getProgression(save.world),
          expedition: { ...createExpedition(), completed },
        },
      },
    });
  }
  private readBackup(epoch = 0): GameSave | null {
    const raw = this.storage().getItem(`${this.key}.backup`);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        'epoch' in parsed &&
        'save' in parsed
      )
        return parsed.epoch === epoch ? validateSave(parsed.save) : null;
      return epoch === 0 ? validateSave(parsed) : null;
    } catch (error) {
      console.warn('Ignoring an invalid account progress backup.', error);
      return null;
    }
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
      let local: CachedSave | null;
      let corruptCache = false;
      try {
        local = this.readCache();
      } catch (error) {
        const raw = this.storage().getItem(this.key);
        if (raw === null) throw error;
        // Keep the rejected journal intact before replacing it with a valid cloud copy.
        this.storage().setItem(`${this.key}.corrupt`, raw);
        console.warn(
          'Recovering an invalid device save from the cloud.',
          error,
        );
        local = null;
        corruptCache = true;
      }
      let previous = local?.save;
      const remote = await this.remote();
      let backup = this.readBackup(remote?.epoch ?? 0);
      if (remote && remote.epoch !== (local?.epoch ?? 0)) {
        local = null;
        previous = undefined;
        backup = null;
        this.clearArchives();
      }
      const firstUploadPending = local?.dirty && local.revision === 0;
      if (
        !remote &&
        (corruptCache ||
          backup !== null ||
          (local !== null && !firstUploadPending))
      )
        throw new Error(
          'The existing cloud save is unavailable. Device progress has been kept; retry loading.',
        );
      if (local?.pendingWrite && remote?.write_id === local.pendingWrite.id) {
        local = {
          epoch: remote.epoch,
          revision: remote.revision,
          dirty:
            JSON.stringify(local.save) !==
            JSON.stringify(local.pendingWrite.save),
          save: local.save,
        };
      }
      if (local?.dirty && local.revision !== (remote?.revision ?? 0)) {
        await this.backup(local.save);
        local = null;
      }
      let selected = local?.dirty
        ? local
        : remote
          ? {
              epoch: remote.epoch,
              revision: remote.revision,
              dirty: false,
              save: validateSave(remote.save),
            }
          : null;
      if (selected) {
        const save = this.preserveExpeditions(
          selected.save,
          ...(remote ? [validateSave(remote.save)] : []),
          ...(previous ? [previous] : []),
          ...(backup ? [backup] : []),
        );
        if (save !== selected.save)
          selected = { ...selected, save, dirty: true };
      }
      if (!selected && this.initialSave) {
        const initial = await this.initialSave();
        if (initial)
          selected = { save: validateSave(initial), revision: 0, dirty: true };
      }
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
        JSON.stringify({
          epoch: this.cache?.epoch ?? 0,
          save: validateSave(save),
        }),
      );
      resolve();
    });
  }
  save(save: GameSave): Promise<void> {
    return new Promise((resolve) => {
      if (this.paused) {
        resolve();
        return;
      }
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
    if (this.paused || !this.loaded || !this.cache?.dirty)
      return Promise.resolve();
    if (this.flushing) return this.flushing;
    this.flushing = this.upload().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  };
  private clearArchives() {
    for (const suffix of ['.backup', '.corrupt'])
      this.storage().removeItem(`${this.key}${suffix}`);
  }
  async pause() {
    this.paused = true;
    await this.flushing;
  }
  resume() {
    this.paused = false;
  }
  clearDeviceData() {
    this.clearArchives();
    this.storage().removeItem(this.key);
    this.cache = null;
  }
  async reset(save: GameSave) {
    await this.pause();
    try {
      const args = {
        account_id: this.userId,
        payload: z.json().parse(validateSave(save)),
        operation_id: crypto.randomUUID(),
      };
      let result = await this.client.rpc('reset_game_save', args);
      // A lost HTTP response retries the same operation, never a second reset.
      if (result.error) result = await this.client.rpc('reset_game_save', args);
      const { data, error } = result;
      const row = data?.[0];
      if (error || !row)
        throw new Error(
          'Could not reset cloud progress. Check your connection and try again.',
        );
      const canonical = validateSave(row.save);
      // Publish the new cloud state even when device storage is unavailable.
      this.cache = {
        save: canonical,
        epoch: row.epoch,
        revision: row.revision,
        dirty: false,
      };
      this.remoteUpdate = canonical;
      try {
        this.clearArchives();
        this.store(this.cache);
      } catch {
        /* Epoch fencing discards stale device data on the next load. */
      }
      this.publish({ status: 'saved', error: null, syncedAt: row.updated_at });
    } finally {
      this.resume();
    }
  }
  private async upload(attempt = 0): Promise<void> {
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
        expected_epoch: captured.epoch ?? 0,
        payload: z.json().parse(validateSave(pendingWrite.save)),
        operation_id: pendingWrite.id,
      });
      if (error?.code === 'PT409') {
        const remote = await this.remote();
        if (!remote)
          throw new Error('Account progress is unavailable. Retry syncing.');
        const current = this.cache ?? captured;
        const reset = remote.epoch !== (current.epoch ?? 0);
        if (reset) this.clearArchives();
        else await this.backup(current.save);
        const canonical = validateSave(remote.save);
        const save = reset
          ? canonical
          : this.preserveExpeditions(canonical, current.save);
        const dirty = save !== canonical;
        this.store({
          save,
          epoch: remote.epoch,
          revision: remote.revision,
          dirty,
        });
        this.remoteUpdate = save;
        this.publish({
          status: dirty ? 'pending' : 'saved',
          error: null,
          syncedAt: remote.updated_at,
        });
        if (dirty) {
          if (attempt >= 2)
            throw new Error(
              'Another game session keeps changing progress. Close other game tabs and retry sync. Completed expeditions are preserved on this device.',
            );
          await this.upload(attempt + 1);
        }
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
      this.store({
        save: current.save,
        epoch: row.epoch,
        revision: row.revision,
        dirty,
      });
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
