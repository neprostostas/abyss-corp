import { z } from 'zod';
import type { GameSession } from './GameSession';
import { SaveConflictError } from './cloudPorts';
import type { CloudSaveGateway, ServerSnapshot } from './cloudPorts';

const syncKey = 'abyss-corp.server-sync';
const metadataSchema = z
  .object({
    playerId: z.string().uuid(),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();
export interface SyncSnapshot {
  readonly status: 'local' | 'syncing' | 'synced' | 'conflict' | 'error';
  readonly remote: ServerSnapshot | null;
  readonly lastSyncedAt: number | null;
  readonly error: string | null;
}
/** Server backup is explicit; network failures never block local saves or gameplay. */
export class SaveSync {
  private snapshot: SyncSnapshot = {
    status: 'local',
    remote: null,
    lastSyncedAt: null,
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private busy = false;
  private baseline: z.infer<typeof metadataSchema> | null = null;
  private remotePlayerId: string | null = null;
  constructor(
    private readonly session: GameSession,
    private readonly client: CloudSaveGateway,
    private readonly storage: () => Pick<Storage, 'getItem' | 'setItem'>,
  ) {
    // Freeze this tab's baseline. Reading another tab's newer metadata during sync
    // would incorrectly grant permission to overwrite a revision we never loaded.
    try {
      const raw = this.storage().getItem(syncKey);
      const parsed =
        raw === null ? null : metadataSchema.safeParse(JSON.parse(raw));
      this.baseline = parsed?.success ? parsed.data : null;
    } catch {
      // No trusted baseline means an existing server copy requires explicit resolution.
      this.baseline = null;
    }
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<SyncSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    for (const listener of this.listeners) listener();
  }
  private remember(playerId: string, remote: ServerSnapshot) {
    const metadata = {
      playerId,
      revision: remote.revision,
      updatedAt: remote.updatedAt,
    };
    this.storage().setItem(syncKey, JSON.stringify(metadata));
    this.baseline = metadata;
    this.publish({
      status: 'synced',
      remote,
      lastSyncedAt: remote.updatedAt,
      error: null,
    });
  }
  private async run(action: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true;
    this.publish({ status: 'syncing', error: null });
    try {
      await action();
    } catch (error) {
      if (error instanceof SaveConflictError)
        this.publish({
          status: 'conflict',
          remote: error.snapshot,
          error: error.message,
        });
      else
        this.publish({
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Server backup failed. Your local progress is safe.',
        });
    } finally {
      this.busy = false;
    }
  }
  sync = () =>
    this.run(async () => {
      const playerId = await this.client.connect();
      const remote = await this.client.load();
      this.remotePlayerId = playerId;
      const metadata = this.baseline;
      if (
        remote &&
        (metadata?.playerId !== playerId ||
          metadata.revision !== remote.revision)
      )
        throw new SaveConflictError(remote);
      const save = this.session.captureSave();
      await this.session.save(true);
      if (this.session.getSnapshot().saveStatus === 'error')
        throw new Error('Save on this device first, then retry server backup.');
      const uploaded = await this.client.save(save, remote?.revision ?? 0);
      this.remember(playerId, uploaded);
    });
  keepLocal = () => {
    const expected = this.snapshot.remote;
    const expectedPlayerId = this.remotePlayerId;
    return this.run(async () => {
      const playerId = await this.client.connect();
      // Re-read the selected revision; never force a newer unseen server copy out.
      const latest = await this.client.load();
      this.remotePlayerId = playerId;
      if (
        !expected ||
        playerId !== expectedPlayerId ||
        latest?.revision !== expected.revision
      )
        throw new SaveConflictError(latest);
      const save = this.session.captureSave();
      await this.session.save(true);
      if (this.session.getSnapshot().saveStatus === 'error')
        throw new Error('Local saving failed. Retry it before uploading.');
      this.remember(playerId, await this.client.save(save, expected.revision));
    });
  };
  useServer = () => {
    const expected = this.snapshot.remote;
    const expectedPlayerId = this.remotePlayerId;
    return this.run(async () => {
      const playerId = await this.client.connect();
      const latest = await this.client.load();
      this.remotePlayerId = playerId;
      if (
        !expected ||
        !latest ||
        playerId !== expectedPlayerId ||
        latest.revision !== expected.revision
      )
        throw new SaveConflictError(latest);
      await this.session.restoreServerSave(latest.save);
      this.remember(playerId, latest);
    });
  };
}
