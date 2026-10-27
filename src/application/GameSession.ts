import { startExpedition, claimExpedition } from '../domain/expeditions';
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
  resumeProduction,
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
      this.publish({ world: resumeProduction(this.snapshot.world) });
      // Consume elapsed time before the next reload, even when the report stays open.
      this.suspendedAt = this.active ? null : this.clock.timestamp();
      if (saved) await this.save();
    } catch (error) {
      console.error('Unable to load Abyss Corp save.', error);
      this.publish({
        status: 'load-error',
        error:
          'Could not load account progress. Check your connection and retry. Your save has not been replaced.',
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

  private command(action: (world: WorldState) => WorldState) {
    if (this.snapshot.status !== 'ready') return;
    this.tick();
    const world = action(this.snapshot.world);
    if (world === this.snapshot.world) return;
    this.publish({ world });
    void this.save();
  }

  startExpedition = () => {
    this.command(startExpedition);
  };
  claimExpedition = () => {
    this.command(claimExpedition);
  };
  research = (id: ResearchId) => {
    this.command((world) => buyResearch(world, id));
  };
  claimMission = (id: MissionId) => {
    this.command((world) => claimMission(world, id));
  };
  upgradeAutomation = (layerId = this.snapshot.world.selectedLayerId) => {
    this.command((world) =>
      world.selectedLayerId === layerId ? upgradeAutomation(world) : world,
    );
  };
  toggleAutomation = (layerId = this.snapshot.world.selectedLayerId) => {
    this.command((world) =>
      world.selectedLayerId === layerId ? toggleAutomation(world) : world,
    );
  };
  upgrade = (id: UpgradeId, layerId = this.snapshot.world.selectedLayerId) => {
    this.command((world) =>
      world.selectedLayerId === layerId ? upgradeLayer(world, id) : world,
    );
  };
  /** Return only this manual sale; the preceding tick may sell other bases automatically. */
  sell = (layerId = this.snapshot.world.selectedLayerId): number => {
    let earned = 0;
    this.command((world) => {
      if (world.selectedLayerId !== layerId) return world;
      const sold = sellLayer(world);
      earned = sold.credits - world.credits;
      return sold;
    });
    return earned;
  };
  select = (id: LayerId) => {
    this.command((world) => selectLayer(world, id));
  };
  unlock = (id: LayerId) => {
    this.command((world) => unlockLayer(world, id));
  };

  /** Apply the canonical cloud copy without merging currencies or commands. */
  adoptCloudSave(data: GameSave) {
    if (this.snapshot.status !== 'ready') return;
    this.publish({
      world: data.world,
      offlineReport: null,
      error: null,
      saveStatus: 'saved',
    });
    this.applyOffline(data.savedAt);
    this.publish({ world: resumeProduction(this.snapshot.world) });
    this.lastTick = this.clock.now();
    this.suspendedAt = this.active ? null : this.clock.timestamp();
    void this.save();
  }

  captureSave(): GameSave {
    if (this.snapshot.status !== 'ready')
      throw new Error('Wait for your local save to load.');
    this.tick();
    return {
      version: 7,
      savedAt: this.suspendedAt ?? this.clock.timestamp(),
      world: this.snapshot.world,
    };
  }

  save = (retry = false): Promise<void> => {
    if (
      this.snapshot.status !== 'ready' ||
      (this.snapshot.saveStatus === 'error' && !retry)
    )
      return Promise.resolve();
    this.pendingSave = {
      version: 7,
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
