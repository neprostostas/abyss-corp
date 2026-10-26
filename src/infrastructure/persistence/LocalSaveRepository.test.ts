import { describe, expect, it } from 'vitest';
import { createGame } from '../../domain/game';
import type { GameSave } from '../../application/ports';
import {
  LocalSaveRepository,
  parseSave,
  SAVE_KEY,
} from './LocalSaveRepository';

const saved: GameSave = { version: 1, savedAt: 100, game: createGame() };
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
    JSON.stringify({ ...saved, version: 2 }),
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
