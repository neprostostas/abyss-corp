import type { Clock } from './ports';
import type { GameSession } from './GameSession';
import type { LiveOpsGateway } from './liveOpsPorts';
import type {
  GameplayEvent,
  LiveOpsConfig,
  TelemetryEvent,
} from '../data/liveOps';
import { getLiveEventOffer } from '../domain/liveEvents';

const preferenceKey = 'abyss-corp.analytics-consent';
const installationKey = 'abyss-corp.installation-id';
export interface LiveOpsSnapshot {
  readonly status: 'loading' | 'ready' | 'error';
  readonly config: LiveOpsConfig | null;
  readonly now: number;
  readonly variant: 'control' | 'challenger';
  readonly analyticsConsent: boolean;
  readonly analyticsError: string | null;
  readonly error: string | null;
}
function cohort(installationId: string, experimentId: string, percent: number) {
  let hash = 2166136261;
  for (const character of `${experimentId}:${installationId}`)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) % 100 < percent ? 'challenger' : 'control';
}
export class LiveOps {
  private snapshot: LiveOpsSnapshot = {
    status: 'loading',
    config: null,
    now: 0,
    variant: 'control',
    analyticsConsent: false,
    analyticsError: null,
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private readonly installationId: string;
  private anchor: { server: number; monotonic: number } | null = null;
  private loading: Promise<void> | null = null;
  private queue: TelemetryEvent[] = [];
  private sending: AbortController | null = null;
  private exposureKey: string | null = null;
  private sessionTracked = false;
  constructor(
    private readonly client: LiveOpsGateway,
    private readonly clock: Clock,
    private readonly storage: () => Pick<Storage, 'getItem' | 'setItem'>,
  ) {
    let id: string = crypto.randomUUID();
    try {
      const stored = this.storage().getItem(installationKey);
      if (stored && /^[a-f0-9-]{36}$/.test(stored)) id = stored;
      else this.storage().setItem(installationKey, id);
      this.snapshot = {
        ...this.snapshot,
        analyticsConsent: this.storage().getItem(preferenceKey) === 'true',
      };
    } catch {
      // Storage failure uses an in-memory cohort and leaves analytics disabled.
      this.snapshot = { ...this.snapshot, analyticsConsent: false };
    }
    this.installationId = id;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<LiveOpsSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    for (const listener of this.listeners) listener();
  }
  now = () =>
    this.anchor
      ? this.anchor.server +
        Math.max(0, this.clock.now() - this.anchor.monotonic)
      : 0;
  tick = () => {
    if (this.anchor) this.publish({ now: this.now() });
  };
  refresh = (): Promise<void> => {
    if (this.loading) return this.loading;
    this.loading = this.load().finally(() => {
      this.loading = null;
    });
    return this.loading;
  };
  private async load() {
    this.publish({ status: 'loading', error: null });
    try {
      const { config, serverTime } = await this.client.load();
      this.anchor = { server: serverTime, monotonic: this.clock.now() };
      const variant = config.experiment.enabled
        ? cohort(
            this.installationId,
            config.experiment.id,
            config.experiment.challengerPercent,
          )
        : 'control';
      if (!config.analyticsEnabled) {
        this.sending?.abort();
        this.queue = [];
      }
      this.publish({ status: 'ready', config, variant, now: this.now() });
      if (
        !this.sessionTracked &&
        this.snapshot.analyticsConsent &&
        config.analyticsEnabled
      ) {
        this.sessionTracked = true;
        this.track({ name: 'session_started' });
      }
      this.expose();
    } catch (error) {
      this.anchor = null;
      this.queue = [];
      this.publish({
        status: 'error',
        config: null,
        now: 0,
        error:
          error instanceof Error
            ? error.message
            : 'Live events are unavailable.',
      });
    }
  }
  setConsent = (enabled: boolean) => {
    let preferenceError: string | null = null;
    try {
      this.storage().setItem(preferenceKey, String(enabled));
    } catch {
      preferenceError =
        'Your preference could not be saved. Usage sharing remains off.';
      enabled = false;
    }
    this.publish({
      analyticsConsent: enabled,
      analyticsError: preferenceError,
    });
    if (!enabled) {
      this.queue = [];
      this.sending?.abort();
      this.exposureKey = null;
      this.sessionTracked = false;
    } else {
      if (this.snapshot.config?.analyticsEnabled && !this.sessionTracked) {
        this.sessionTracked = true;
        this.track({ name: 'session_started' });
      }
      this.expose();
    }
  };
  private expose() {
    const config = this.snapshot.config;
    if (
      !this.snapshot.analyticsConsent ||
      !config?.analyticsEnabled ||
      !config.experiment.enabled
    )
      return;
    const key = `${config.experiment.id}:${this.snapshot.variant}`;
    if (this.exposureKey === key) return;
    this.exposureKey = key;
    this.track({ name: 'experiment_exposed' });
  }
  track = (event: GameplayEvent) => {
    const config = this.snapshot.config;
    if (!this.snapshot.analyticsConsent || !config?.analyticsEnabled) return;
    const experiment = config.experiment.enabled
      ? { experimentId: config.experiment.id, variant: this.snapshot.variant }
      : {};
    this.queue.push({
      ...event,
      ...experiment,
      id: crypto.randomUUID(),
      occurredAt: Math.floor(this.now()),
    });
    if (this.queue.length > 100) this.queue.shift();
  };
  flush = async () => {
    if (
      this.sending ||
      !this.queue.length ||
      !this.snapshot.analyticsConsent ||
      !this.snapshot.config?.analyticsEnabled
    )
      return;
    const controller = new AbortController();
    this.sending = controller;
    const batch = this.queue.splice(0, 20);
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      await this.client.send(this.installationId, batch, controller.signal);
      this.publish({ analyticsError: null });
    } catch (error) {
      if (
        this.snapshot.analyticsConsent &&
        this.snapshot.config?.analyticsEnabled &&
        !controller.signal.aborted
      ) {
        this.queue = [...batch, ...this.queue].slice(0, 100);
        this.publish({
          analyticsError:
            error instanceof Error
              ? error.message
              : 'Usage data could not be sent.',
        });
      }
    } finally {
      clearTimeout(timeout);
      this.sending = null;
    }
  };
  stop = () => {
    this.sending?.abort();
  };
  claimEvent = (session: GameSession) => {
    const event = this.snapshot.config?.event;
    const now = this.now();
    if (
      this.snapshot.status !== 'ready' ||
      !event ||
      !getLiveEventOffer(session.getSnapshot().world, event, now).canClaim
    )
      return;
    session.claimLiveEvent(event, now);
  };
}
