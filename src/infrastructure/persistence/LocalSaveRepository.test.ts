import { describe, expect, it } from 'vitest';
import { createGame } from '../../domain/game';
import type { GameSave } from '../../application/ports';
import {
  LocalSaveRepository,
  LEGACY_BACKUP_KEY,
  SAVE_KEY,
} from './LocalSaveRepository';
import { parseSave } from './saveSchema';

const saved: GameSave = { version: 2, savedAt: 100, game: createGame() };
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
  it('round-trips the full in-progress state', async () => {
    const data = storage();
    const repo = new LocalSaveRepository(() => data);
    expect(await repo.load()).toBeNull();
    const inTransit: GameSave = {
      ...saved,
      game: {
        ...saved.game,
        credits: 45,
        phase: 'delivering',
        phaseElapsedMs: 1234,
        running: true,
      },
    };
    await repo.save(inTransit);
    expect(await new LocalSaveRepository(() => data).load()).toEqual(inTransit);
  });
  it.each([
    '{broken',
    JSON.stringify({ ...saved, version: 3 }),
    JSON.stringify({ ...saved, game: { ...saved.game, credits: -1 } }),
    JSON.stringify({ ...saved, game: { ...saved.game, credits: 0.5 } }),
    JSON.stringify({
      ...saved,
      game: { ...saved.game, levels: { mining: 99, transport: 1 } },
    }),
    JSON.stringify({ ...saved, game: { ...saved.game, phaseElapsedMs: 4000 } }),
    JSON.stringify({ ...saved, game: { ...saved.game, phase: 'unknown' } }),
    JSON.stringify({ ...saved, game: { ...saved.game, running: 'yes' } }),
  ])(
    'rejects invalid or unsupported data without overwriting it',
    async (raw) => {
      const data = storage();
      data.setItem(SAVE_KEY, raw);
      await expect(
        new LocalSaveRepository(() => data).load(),
      ).rejects.toThrow();
      expect(data.getItem(SAVE_KEY)).toBe(raw);
      expect(() => parseSave(raw)).toThrow();
    },
  );
  it.each(['mining', 'delivering', 'returning'] as const)(
    'migrates v1 %s without losing credits, upgrades or work',
    async (phase) => {
      const legacy = {
        version: 1,
        savedAt: 123,
        game: {
          credits: 75,
          levels: { mining: 2, transport: 2 },
          phase,
          phaseElapsedMs: 1000,
          running: false,
        },
      };
      const raw = JSON.stringify(legacy);
      const data = storage();
      data.setItem(SAVE_KEY, raw);
      const repo = new LocalSaveRepository(() => data);
      const migrated = await repo.load();
      expect(migrated).toMatchObject({
        version: 2,
        savedAt: 123,
        game: {
          ...legacy.game,
          levels: { mining: 2, transport: 2, processing: 1, storage: 1 },
          raw: 0,
          refined: 0,
          processingElapsedMs: null,
        },
      });
      expect(data.getItem(SAVE_KEY)).toBe(raw);
      if (migrated === null) throw new Error('Expected migrated save');
      await repo.save(migrated);
      expect(data.getItem(LEGACY_BACKUP_KEY)).toBe(raw);
      expect(await repo.load()).toEqual(migrated);
    },
  );
  it('keeps the v1 original when creating its backup fails', async () => {
    const raw = JSON.stringify({
      version: 1,
      savedAt: 1,
      game: {
        credits: 30,
        levels: { mining: 1, transport: 1 },
        phase: 'returning',
        phaseElapsedMs: 200,
        running: true,
      },
    });
    const data = storage();
    data.setItem(SAVE_KEY, raw);
    const repo = new LocalSaveRepository(() => ({
      getItem: data.getItem,
      setItem: (key, value) => {
        if (key === LEGACY_BACKUP_KEY) throw new Error('Quota');
        data.setItem(key, value);
      },
    }));
    await expect(repo.save(parseSave(raw))).rejects.toThrow('Quota');
    expect(data.getItem(SAVE_KEY)).toBe(raw);
  });
  it('round-trips blocked stages and rejects over-capacity inventory', () => {
    const full = {
      ...saved,
      game: {
        ...saved.game,
        phase: 'delivering',
        phaseElapsedMs: 2500,
        processingElapsedMs: 6000,
        raw: 6,
        refined: 6,
      },
    };
    expect(parseSave(JSON.stringify(full))).toEqual(full);
    expect(() =>
      parseSave(JSON.stringify({ ...full, game: { ...full.game, raw: 7 } })),
    ).toThrow();
    expect(() =>
      parseSave(
        JSON.stringify({ ...full, game: { ...full.game, refined: 7 } }),
      ),
    ).toThrow();
    expect(() =>
      parseSave(
        JSON.stringify({
          ...full,
          game: { ...full.game, processingElapsedMs: 6001 },
        }),
      ),
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
