import {
  advanceGame,
  buyUpgrade,
  createGame,
  sellRefined,
} from '../domain/game';
import type { GameState, UpgradeId } from '../domain/game';
import type { Clock, GameSave, SaveRepository } from './ports';

export interface SessionSnapshot {
  readonly status: 'loading' | 'ready' | 'load-error';
  readonly game: GameState;
  readonly saveStatus: 'unsaved' | 'saving' | 'saved' | 'error';
  readonly error: string | null;
}

/** Owns one session; React observes it and never owns economy state. */
export class GameSession {
  private snapshot: SessionSnapshot = {
    status: 'loading',
    game: createGame(),
    saveStatus: 'unsaved',
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private lastTick: number;
  private active = false;
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
        game: saved?.game ?? createGame(),
        saveStatus: saved ? 'saved' : 'unsaved',
      });
    } catch (error) {
      console.error('Unable to load Abyss Corp save.', error);
      this.publish({
        status: 'load-error',
        error:
          'Your save could not be read. It has not been replaced. Restore a valid save or allow browser storage, then retry.',
      });
    }
  }

  setActive(active: boolean) {
    this.tick();
    this.active = active;
    this.lastTick = this.clock.now();
  }

  tick = () => {
    const now = this.clock.now();
    const elapsed = Math.max(0, now - this.lastTick);
    this.lastTick = now;
    if (!this.active || this.snapshot.status !== 'ready') return;
    const game = advanceGame(this.snapshot.game, elapsed);
    if (game !== this.snapshot.game) this.publish({ game });
  };

  toggleRunning = () => {
    if (this.snapshot.status !== 'ready') return;
    this.tick();
    this.publish({
      game: { ...this.snapshot.game, running: !this.snapshot.game.running },
    });
    void this.save();
  };

  upgrade = (id: UpgradeId) => {
    if (this.snapshot.status !== 'ready') return;
    this.tick();
    const game = buyUpgrade(this.snapshot.game, id);
    if (game === this.snapshot.game) return;
    this.publish({ game });
    void this.save();
  };

  sell = () => {
    if (this.snapshot.status !== 'ready') return;
    this.tick();
    const game = sellRefined(this.snapshot.game);
    if (game === this.snapshot.game) return;
    this.publish({ game });
    void this.save();
  };

  save = (retry = false): Promise<void> => {
    if (
      this.snapshot.status !== 'ready' ||
      (this.snapshot.saveStatus === 'error' && !retry)
    )
      return Promise.resolve();
    this.pendingSave = {
      version: 2,
      savedAt: this.clock.timestamp(),
      game: this.snapshot.game,
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
