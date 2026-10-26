import { z } from 'zod';
import { liveOpsConfigSchema } from '../../data/liveOps';
import type { TelemetryEvent } from '../../data/liveOps';
import type { LiveOpsGateway } from '../../application/liveOpsPorts';
export class LiveOpsClient implements LiveOpsGateway {
  async load() {
    const response = await fetch('/api/v1/live-ops', {
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      throw new Error(
        'Live events are unavailable. Your regular expedition can continue.',
      );
    return z
      .object({
        config: liveOpsConfigSchema,
        serverTime: z.number().int().nonnegative().max(8640000000000000),
      })
      .parse(await response.json());
  }
  async send(
    installationId: string,
    events: readonly TelemetryEvent[],
    signal: AbortSignal,
  ) {
    const response = await fetch('/api/v1/telemetry', {
      method: 'POST',
      credentials: 'omit',
      signal,
      headers: { 'Content-Type': 'application/json', 'X-Abyss-Client': '1' },
      body: JSON.stringify({ consent: true, installationId, events }),
    });
    if (!response.ok)
      throw new Error(
        'Usage data could not be sent. Gameplay and saves are unaffected.',
      );
  }
}
