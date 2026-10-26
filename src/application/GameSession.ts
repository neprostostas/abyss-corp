import type { GameplayEvent, LiveEvent } from '../data/liveOps';
import { claimLiveEvent } from '../domain/liveEvents';
import type { ResearchId, MissionId } from '../data/progression';
import {
  OFFLINE_LIMIT_MS,
  OFFLINE_REPORT_MIN_MS,
  ACTIVE_GAP_LIMIT_MS,
} from '../data/automation';
import {
  advanceWorld,
  buyResearch,
  claimMission,
  upgradeAutomation,
  toggleAutomation,
  createWorld,
  selectLayer,
  sellLayer,
  toggleLayer,
  unlockLayer,
  upgradeLayer,
} from '../domain/world';
import type { WorldState } from '../domain/world';
import type { UpgradeId } from '../domain/game';
import type { LayerId } from '../data/layers';
import type { Clock, GameSave, SaveRepository } from './ports';

export interface OfflineReport {
  readonly elapsedMs: number;
  readonly capped: boolean;
  readonly credits: number;
}
export interface SessionSnapshot {
  readonly offlineReport: OfflineReport | null;
  readonly status: 'loading' | 'ready' | 'load-error';
  readonly world: WorldState;
  readonly saveStatus: 'unsaved' | 'saving' | 'saved' | 'error';
  readonly error: string | null;
}

/** Owns one session; React observes it and never owns economy state. */
export class GameSession {
  private snapshot: SessionSnapshot = {
    offlineReport: null,
    status: 'loading',
    world: createWorld(),
    saveStatus: 'unsaved',
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private lastTick: number;
  private active = false;
  private suspendedAt: number | null = null;
  private loading: Promise<void> | null = null;
  private saving: Promise<void> | null = null;
  private pendingSave: GameSave | null = null;

  constructor(
    private readonly repository: SaveRepository,
    private readonly clock: Clock,
    private readonly observe: (event: GameplayEvent) => void = () => {},
  ) {
    this.lastTick = clock.now();
  }

  getSnapshot = (): SessionSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(update: Partial<SessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    for (const listener of this.listeners) listener();
  }

  initialize = (): Promise<void> => {
    if (this.snapshot.status === 'ready') return Promise.resolve();
    if (this.loading) return this.loading;
    this.publish({ status: 'loading', error: null });
    this.loading = this.load().finally(() => {
      this.loading = null;
    });
    return this.loading;
  };

  private async load() {
    try {
      const saved = await this.repository.load();
      this.lastTick = this.clock.now();
      this.publish({
        status: 'ready',
        world: saved?.world ?? createWorld(),
        saveStatus: saved ? 'saved' : 'unsaved',
      });
      if (saved) this.applyOffline(saved.savedAt);
      // Consume elapsed time before the next reload, even when the report stays open.
      this.suspendedAt = this.active ? null : this.clock.timestamp();
      if (saved) await this.save();
    } catch (error) {
      console.error('Unable to load Abyss Corp save.', error);
      this.publish({
        status: 'load-error',
        error:
          'Your save could not be read. It has not been replaced. Restore a valid save or allow browser storage, then retry.',
      });
    }
  }

  private applyOffline(since: number) {
    const awayMs = Math.max(0, Math.floor(this.clock.timestamp() - since));
    const elapsedMs = Math.min(awayMs, OFFLINE_LIMIT_MS);
    const previous = this.snapshot.world;
    const world = advanceWorld(previous, elapsedMs);
    this.publish({
      world,
      offlineReport:
        elapsedMs >= OFFLINE_REPORT_MIN_MS
          ? {
              elapsedMs,
              capped: awayMs > OFFLINE_LIMIT_MS,
              credits: world.credits - previous.credits,
            }
          : this.snapshot.offlineReport,
    });
  }

  dismissOfflineReport = () => {
    this.publish({ offlineReport: null });
  };

  setActive(active: boolean) {
    if (active === this.active) return;
    this.tick();
    if (!active) this.suspendedAt = this.clock.timestamp();
    else if (this.suspendedAt !== null && this.snapshot.status === 'ready') {
      this.applyOffline(this.suspendedAt);
      this.suspendedAt = null;
    }
    this.active = active;
    this.lastTick = this.clock.now();
    if (active && this.snapshot.status === 'ready') void this.save();
  }

  tick = () => {
    const now = this.clock.now();
    const elapsed = Math.max(0, now - this.lastTick);
    this.lastTick = now;
    if (!this.active || this.snapshot.status !== 'ready') return;
    if (elapsed > ACTIVE_GAP_LIMIT_MS) {
      this.applyOffline(this.clock.timestamp() - elapsed);
      void this.save();
      return;
    }
    const world = advanceWorld(this.snapshot.world, elapsed);
    if (world !== this.snapshot.world) this.publish({ world });
  };

  private command(
    action: (world: WorldState) => WorldState,
    event?: GameplayEvent,
  ) {
    if (this.snapshot.status !== 'ready') return;
    this.tick();
    const world = action(this.snapshot.world);
    if (world === this.snapshot.world) return;
    this.publish({ world });
    if (event) this.observe({ ...event, layerId: world.selectedLayerId });
    void this.save();
  }

  research = (id: ResearchId) => {
    this.command((world) => buyResearch(world, id), {
      name: 'research_purchased',
      itemId: id,
    });
  };
  claimMission = (id: MissionId) => {
    this.command((world) => claimMission(world, id), {
      name: 'mission_claimed',
      itemId: id,
    });
  };

  upgradeAutomation = () => {
    this.command(upgradeAutomation, { name: 'automation_upgraded' });
  };
  toggleAutomation = () => {
    this.command(toggleAutomation);
  };

  toggleRunning = () => {
    this.command(toggleLayer, { name: 'operation_toggled' });
  };
  upgrade = (id: UpgradeId) => {
    this.command((world) => upgradeLayer(world, id), {
      name: 'upgrade_purchased',
      itemId: id,
    });
  };
  sell = () => {
    this.command(sellLayer, { name: 'cargo_sold' });
  };
  select = (id: LayerId) => {
    this.command((world) => selectLayer(world, id));
  };
  unlock = (id: LayerId) => {
    this.command((world) => unlockLayer(world, id), { name: 'depth_unlocked' });
  };

  claimLiveEvent = (event: LiveEvent, now: number) => {
    this.command((world) => claimLiveEvent(world, event, now), {
      name: 'event_claimed',
      contentId: event.id,
    });
  };

  captureSave(): GameSave {
    if (this.snapshot.status !== 'ready')
      throw new Error('Wait for your local save to load.');
    this.tick();
    return {
      version: 6,
      savedAt: this.suspendedAt ?? this.clock.timestamp(),
      world: this.snapshot.world,
    };
  }

  async restoreServerSave(data: GameSave): Promise<void> {
    if (this.snapshot.status !== 'ready')
      throw new Error('Your session is not ready.');
    await this.save(true);
    if (this.snapshot.saveStatus === 'error')
      throw new Error('Local saving failed; server restore was cancelled.');
    if (!this.repository.backup)
      throw new Error('Local backups are unavailable.');
    await this.repository.backup(this.captureSave());
    this.publish({ world: data.world, offlineReport: null });
    this.applyOffline(data.savedAt);
    this.lastTick = this.clock.now();
    this.suspendedAt = this.active ? null : this.clock.timestamp();
    await this.save(true);
    if (this.getSnapshot().saveStatus === 'error')
      throw new Error(
        'Restored in memory. Retry local saving before closing this tab.',
      );
  }

  save = (retry = false): Promise<void> => {
    if (
      this.snapshot.status !== 'ready' ||
      (this.snapshot.saveStatus === 'error' && !retry)
    )
      return Promise.resolve();
    this.pendingSave = {
      version: 6,
      savedAt: this.suspendedAt ?? this.clock.timestamp(),
      world: this.snapshot.world,
    };
    if (this.saving) return this.saving;
    this.saving = this.flushSaves().finally(() => {
      this.saving = null;
    });
    return this.saving;
  };

  private async flushSaves() {
    this.publish({ saveStatus: 'saving', error: null });
    try {
      while (this.pendingSave) {
        const data = this.pendingSave;
        this.pendingSave = null;
        await this.repository.save(data);
      }
      this.publish({ saveStatus: 'saved' });
    } catch (error) {
      this.pendingSave = null;
      console.error('Unable to save Abyss Corp progress.', error);
      this.publish({
        saveStatus: 'error',
        error:
          'Progress is only in memory: local saving failed. Keep this tab open and retry saving.',
      });
    }
  }
}
