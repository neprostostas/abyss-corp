import type { LiveOpsConfig, TelemetryEvent } from '../data/liveOps';
export interface LiveOpsGateway {
  load(): Promise<{ config: LiveOpsConfig; serverTime: number }>;
  send(
    installationId: string,
    events: readonly TelemetryEvent[],
    signal: AbortSignal,
  ): Promise<void>;
}
