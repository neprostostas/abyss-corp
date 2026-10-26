import { SaveConflictError } from '../../application/cloudPorts';
import type {
  CloudSaveGateway,
  ServerSnapshot,
} from '../../application/cloudPorts';
import { z } from 'zod';
import type { GameSave } from '../../application/ports';
import { validateSave } from '../persistence/saveSchema';

const snapshotSchema = z.object({
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  updatedAt: z.number().int().nonnegative(),
  save: z.unknown(),
});
function parseSnapshot(value: unknown): ServerSnapshot {
  const parsed = snapshotSchema.parse(value);
  return { ...parsed, save: validateSave(parsed.save) };
}
export class CloudSaveClient implements CloudSaveGateway {
  private async request(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(`/api/v1/${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Abyss-Client': '1' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(8000),
    });
    const value: unknown = await response.json();
    if (response.status === 409) {
      const conflict = z
        .object({ snapshot: z.unknown().nullable() })
        .parse(value);
      throw new SaveConflictError(
        conflict.snapshot === null ? null : parseSnapshot(conflict.snapshot),
      );
    }
    if (!response.ok) {
      const error = z.object({ error: z.string() }).safeParse(value);
      throw new Error(
        error.success
          ? error.data.error
          : 'Server backup is unavailable. Your local progress is safe.',
      );
    }
    return value;
  }
  async connect(): Promise<string> {
    const value = await this.request('session', 'POST');
    return z
      .object({ playerId: z.string().uuid(), serverTime: z.number() })
      .parse(value).playerId;
  }
  async load(): Promise<ServerSnapshot | null> {
    const value = z
      .object({ snapshot: z.unknown().nullable() })
      .parse(await this.request('save', 'GET'));
    return value.snapshot === null ? null : parseSnapshot(value.snapshot);
  }
  async save(
    save: GameSave,
    expectedRevision: number,
  ): Promise<ServerSnapshot> {
    const value = z
      .object({ snapshot: z.unknown() })
      .parse(await this.request('save', 'PUT', { save, expectedRevision }));
    return parseSnapshot(value.snapshot);
  }
}
