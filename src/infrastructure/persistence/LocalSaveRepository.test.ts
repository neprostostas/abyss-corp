import { describe, expect, it } from 'vitest';
import { createGame } from '../../domain/game';
import {
  advanceWorld,
  createLayer,
  createWorld,
  unlockLayer,
} from '../../domain/world';
import type { GameSave } from '../../application/ports';
import {
  LocalSaveRepository,
  LEGACY_BACKUP_KEY,
  SAVE_KEY,
  V2_BACKUP_KEY,
} from './LocalSaveRepository';
import { parseSave, validateSave } from './saveSchema';

const saved: GameSave = { version: 3, savedAt: 100, world: createWorld() };
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe('local save boundary', () => {
  it('round-trips multiple depths, selection, inventory and progress', async () => {
    const data = storage();
    const repo = new LocalSaveRepository(() => data);
    expect(await repo.load()).toBeNull();
    const opened = unlockLayer(
      { ...createWorld(), credits: 1000 },
      'golden-trench',
    );
    const world = advanceWorld(
      {
        ...opened,
        layers: {
          shallows: { ...createLayer(), running: true },
          'golden-trench': { ...createLayer(), running: true },
        },
      },
      17000,
    );
    const inTransit: GameSave = { ...saved, world };
    await repo.save(inTransit);
    expect(await new LocalSaveRepository(() => data).load()).toEqual(inTransit);
  });
  it.each([
    '{broken',
    JSON.stringify({ ...saved, version: 4 }),
    JSON.stringify({ ...saved, world: { ...saved.world, credits: -1 } }),
    JSON.stringify({ ...saved, world: { ...saved.world, credits: 0.5 } }),
    JSON.stringify({
      ...saved,
      world: { ...saved.world, selectedLayerId: 'golden-trench' },
    }),
    JSON.stringify({
      ...saved,
      world: {
        ...saved.world,
        layers: { ...saved.world.layers, 'pearl-caverns': createLayer() },
      },
    }),
    JSON.stringify({
      ...saved,
      world: {
        ...saved.world,
        layers: { ...saved.world.layers, typo: createLayer() },
      },
    }),
    JSON.stringify({
      ...saved,
      world: {
        ...saved.world,
        layers: { shallows: { ...createLayer(), raw: 7 } },
      },
    }),
    JSON.stringify({
      ...saved,
      world: {
        ...saved.world,
        layers: { shallows: { ...createLayer(), phaseElapsedMs: 4000 } },
      },
    }),
    JSON.stringify({
      ...saved,
      world: {
        ...saved.world,
        layers: { shallows: { ...createLayer(), credits: 99 } },
      },
    }),
  ])('rejects invalid/unsupported data without overwriting it', async (raw) => {
    const data = storage();
    data.setItem(SAVE_KEY, raw);
    await expect(new LocalSaveRepository(() => data).load()).rejects.toThrow();
    expect(data.getItem(SAVE_KEY)).toBe(raw);
    expect(() => parseSave(raw)).toThrow();
  });
  it.each(['mining', 'delivering', 'returning'] as const)(
    'migrates v1 %s without losing credits, levels or cargo',
    async (phase) => {
      const legacyGame = {
        credits: 75,
        levels: { mining: 2, transport: 2 },
        phase,
        phaseElapsedMs: 1000,
        running: false,
      };
      const raw = JSON.stringify({
        version: 1,
        savedAt: 123,
        game: legacyGame,
      });
      const data = storage();
      data.setItem(SAVE_KEY, raw);
      const repo = new LocalSaveRepository(() => data);
      const migrated = await repo.load();
      const { credits, ...oldLayer } = legacyGame;
      expect(migrated).toEqual({
        version: 3,
        savedAt: 123,
        world: {
          credits,
          selectedLayerId: 'shallows',
          layers: {
            shallows: {
              ...createLayer(),
              ...oldLayer,
              levels: { mining: 2, transport: 2, processing: 1, storage: 1 },
            },
          },
        },
      });
      // A production snapshot never owns the corporate wallet.
      expect(migrated?.world.layers.shallows).not.toHaveProperty('credits');
      expect(data.getItem(SAVE_KEY)).toBe(raw);
      if (!migrated) throw new Error('Expected migrated save');
      await repo.save(migrated);
      expect(data.getItem(LEGACY_BACKUP_KEY)).toBe(raw);
      expect(await repo.load()).toEqual(migrated);
    },
  );
  it('migrates v2 including completed blocked work and preserves a backup before replacing it', async () => {
    const game = {
      ...createGame(),
      credits: 345,
      levels: { mining: 3, transport: 3, processing: 2, storage: 2 },
      phase: 'delivering' as const,
      phaseElapsedMs: 1500,
      processingElapsedMs: 4500,
      raw: 12,
      refined: 12,
      running: true,
    };
    const raw = JSON.stringify({ version: 2, savedAt: 55, game });
    const data = storage();
    data.setItem(SAVE_KEY, raw);
    const repo = new LocalSaveRepository(() => data);
    const migrated = await repo.load();
    const { credits, ...layer } = game;
    expect(migrated).toEqual({
      version: 3,
      savedAt: 55,
      world: {
        credits,
        selectedLayerId: 'shallows',
        layers: { shallows: layer },
      },
    });
    expect(data.getItem(SAVE_KEY)).toBe(raw);
    if (!migrated) throw new Error('Expected migrated save');
    await repo.save(migrated);
    expect(data.getItem(V2_BACKUP_KEY)).toBe(raw);
    expect(await repo.load()).toEqual(migrated);
  });
  it.each([1, 2])(
    'keeps the version %i original if backup creation fails',
    async (version) => {
      const game =
        version === 1
          ? {
              credits: 30,
              levels: { mining: 1, transport: 1 },
              phase: 'returning',
              phaseElapsedMs: 200,
              running: true,
            }
          : { ...createGame(), credits: 30 };
      const raw = JSON.stringify({ version, savedAt: 1, game });
      const data = storage();
      data.setItem(SAVE_KEY, raw);
      const repo = new LocalSaveRepository(() => ({
        getItem: data.getItem,
        setItem: (key, value) => {
          if (key !== SAVE_KEY) throw new Error('Quota');
          data.setItem(key, value);
        },
      }));
      await expect(repo.save(parseSave(raw))).rejects.toThrow('Quota');
      expect(data.getItem(SAVE_KEY)).toBe(raw);
    },
  );
  it('validates progress using the selected layer balance rather than shallow durations', () => {
    const opened = unlockLayer(
      { ...createWorld(), credits: 250 },
      'golden-trench',
    );
    const world = {
      ...opened,
      layers: {
        ...opened.layers,
        'golden-trench': {
          ...createLayer(),
          phaseElapsedMs: 5000,
          processingElapsedMs: 8000,
        },
      },
    };
    expect(validateSave({ ...saved, world }).world).toEqual(world);
    expect(() =>
      validateSave({
        ...saved,
        world: {
          ...world,
          layers: {
            ...world.layers,
            'golden-trench': { ...createLayer(), phaseElapsedMs: 6001 },
          },
        },
      }),
    ).toThrow();
  });
  it('surfaces blocked access and quota failures', async () => {
    const blocked = new LocalSaveRepository(() => {
      throw new Error('Storage blocked');
    });
    await expect(blocked.load()).rejects.toThrow('Storage blocked');
    const full = new LocalSaveRepository(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota exceeded');
      },
    }));
    await expect(full.save(saved)).rejects.toThrow('Quota exceeded');
  });
});
