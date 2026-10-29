import { MISSION_IDS } from '../src/data/progression';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { getCampaign, getPrestigeOffer } from '../src/domain/campaign';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Clock, GameSave, SaveRepository } from '../src/application/ports';
import type {
  Database,
  SaveRow,
} from '../src/infrastructure/supabase/database.types';
import { AccountSaveRepository } from '../src/infrastructure/supabase/AccountSaveRepository';
import { createLayer, createWorld } from '../src/domain/world';
import { createProgression } from '../src/domain/progression';
import { LAYER_IDS } from '../src/data/layers';

export class FakeClock implements Clock {
  private monotonic = 0;
  private wall = 1_000_000;
  now = () => this.monotonic;
  timestamp = () => this.wall;
  advance(milliseconds: number, wallMilliseconds = milliseconds) {
    this.monotonic += milliseconds;
    this.wall += wallMilliseconds;
  }
}

export class DeviceSave implements SaveRepository {
  writes: GameSave[] = [];
  fail = false;
  constructor(public saved: GameSave | null) {}
  load = () => Promise.resolve(this.saved);
  save(data: GameSave) {
    if (this.fail)
      return Promise.reject(new Error('Device storage unavailable'));
    this.saved = structuredClone(data);
    this.writes.push(this.saved);
    return Promise.resolve();
  }
}

export function gameSave(credits = 0, completed = 0): GameSave {
  const world = createWorld();
  return {
    version: 8,
    savedAt: 1_000_000,
    world: {
      ...world,
      credits,
      ...(completed > 0
        ? {
            layers: Object.fromEntries(
              LAYER_IDS.map((id) => [id, createLayer()]),
            ),
            progression: {
              ...createProgression(),
              research: { trade: 3, storage: 3 },
              claimedMissions: [],
              expedition: {
                completed,
                active: false,
                delivered: {
                  shallows: 0,
                  'golden-trench': 0,
                  'pearl-caverns': 0,
                },
              },
            },
          }
        : {}),
    },
  };
}

export function deferred() {
  let finish: () => void = () => {
    throw new Error('Deferred promise not initialized');
  };
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return {
    promise,
    resolve: () => {
      finish();
    },
  };
}

export class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

export function cloudFixture() {
  const storage = new MemoryStorage();
  let remote: SaveRow | null = {
    epoch: 0,
    user_id: 'captain',
    revision: 1,
    save: z.json().parse(gameSave()),
    updated_at: '2026-10-27T00:00:00Z',
    write_id: crypto.randomUUID(),
  };
  let gate: ReturnType<typeof deferred> | null = null;
  let offline = false;
  let loseResponse = false;
  let conflicts = 0;
  let requests = 0;
  let commits = 0;
  type Write = Database['public']['Functions']['write_game_save']['Args'] & {
    expected_rank?: number;
  };
  // Only the used transport surface is faked; production save validation still runs.
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: structuredClone(remote),
              error: offline ? { code: 'NETWORK' } : null,
            }),
        }),
      }),
    }),
    rpc: async (name: string, args: Write) => {
      requests++;
      const waiting = gate;
      gate = null;
      if (waiting) await waiting.promise;
      if (offline) return { data: null, error: { code: 'NETWORK' } };
      if (name === 'reset_game_save' || name === 'prestige_game_save') {
        if (remote?.write_id !== args.operation_id) {
          if (name === 'prestige_game_save') {
            const current = remote ? validateSave(remote.save).world : null;
            const next = validateSave(args.payload).world;
            if (
              !current ||
              args.expected_epoch !== remote?.epoch ||
              args.expected_revision !== remote?.revision ||
              args.expected_rank !== getCampaign(current).rank ||
              getCampaign(next).rank !== getCampaign(current).rank + 1 ||
              !getPrestigeOffer(current).canPrestige
            )
              return { data: null, error: { code: 'PT409' } };
          }
          remote = {
            user_id: args.account_id,
            revision: (remote?.revision ?? 0) + 1,
            epoch: (remote?.epoch ?? 0) + 1,
            save: args.payload,
            updated_at: '2026-10-27T00:00:02Z',
            write_id: args.operation_id,
          };
          commits++;
        }
        if (loseResponse) {
          loseResponse = false;
          return { data: null, error: { code: 'NETWORK' } };
        }
        return { data: [structuredClone(remote)], error: null };
      }
      if (remote?.write_id !== args.operation_id) {
        if (
          (args.expected_epoch ?? 0) !== (remote?.epoch ?? 0) ||
          conflicts-- > 0 ||
          args.expected_revision !== (remote?.revision ?? 0)
        )
          return { data: null, error: { code: 'PT409' } };
        remote = {
          epoch: remote?.epoch ?? 0,
          user_id: args.account_id,
          revision: args.expected_revision + 1,
          save: args.payload,
          updated_at: '2026-10-27T00:00:01Z',
          write_id: args.operation_id,
        };
        commits++;
      }
      if (loseResponse) {
        loseResponse = false;
        return { data: null, error: { code: 'NETWORK' } };
      }
      return { data: [structuredClone(remote)], error: null };
    },
  } as unknown as SupabaseClient<Database>;
  return {
    storage,
    repository: (
      userId = 'captain',
      initialSave?: () => Promise<GameSave | null>,
    ) => new AccountSaveRepository(client, userId, () => storage, initialSave),
    get remote() {
      return remote;
    },
    set remote(value: SaveRow | null) {
      remote = value;
    },
    get requests() {
      return requests;
    },
    get commits() {
      return commits;
    },
    offline(value: boolean) {
      offline = value;
    },
    loseNextResponse() {
      loseResponse = true;
    },
    conflictNext(count: number) {
      conflicts = count;
    },
    holdNextWrite() {
      gate = deferred();
      return gate;
    },
  };
}

/** A fully completed run eligible for prestige, with zero pending machine work. */
export function completedWorld() {
  return {
    ...createWorld(),
    credits: 100000,
    layers: Object.fromEntries(
      LAYER_IDS.map((id) => [
        id,
        {
          ...createLayer(),
          levels: { mining: 5, transport: 5, processing: 5, storage: 5 },
          automation: { level: 3, enabled: true, elapsedMs: 0 },
          specialists: { quartermaster: 3, broker: 3 },
        },
      ]),
    ),
    campaign: { rank: 0, infrastructure: { depot: 3, exchange: 3, sonar: 3 } },
    progression: {
      ...createProgression(),
      research: { trade: 5, storage: 5, engineering: 5, surveying: 5 },
      claimedMissions: [...MISSION_IDS],
      expedition: {
        completed: 3,
        active: false,
        delivered: { shallows: 0, 'golden-trench': 0, 'pearl-caverns': 0 },
      },
    },
  };
}
