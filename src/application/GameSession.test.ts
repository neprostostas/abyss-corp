import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from './GameSession';
import type { Clock, GameSave, SaveRepository } from './ports';
import { createGame } from '../domain/game';

function fixture(initial: GameSave | null = null) {
  let time = 0;
  let stored = initial;
  const clock: Clock = { now: () => time, timestamp: () => time };
  const repository: SaveRepository = {
    load: () => Promise.resolve(stored),
    save: (data) => {
      stored = data;
      return Promise.resolve();
    },
  };
  const session = new GameSession(repository, clock);
  return {
    session,
    clock,
    repository,
    elapse: (ms: number) => {
      time += ms;
    },
    saved: () => stored,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('session coordination', () => {
  it('does not reward hidden time or time spent loading', async () => {
    const f = fixture();
    f.elapse(100000);
    await f.session.initialize();
    f.session.setActive(true);
    f.session.toggleRunning();
    f.elapse(2000);
    f.session.setActive(false);
    f.elapse(600000);
    f.session.setActive(true);
    expect(f.session.getSnapshot().game.phaseElapsedMs).toBe(2000);
    expect(f.session.getSnapshot().game.credits).toBe(0);
    f.elapse(4500);
    f.session.tick();
    expect(f.session.getSnapshot().game.credits).toBe(15);
  });
  it('resumes saved cargo without offline rewards', async () => {
    const initial: GameSave = {
      version: 1,
      savedAt: 1,
      game: {
        ...createGame(),
        running: true,
        phase: 'delivering',
        phaseElapsedMs: 2400,
      },
    };
    const f = fixture(initial);
    f.elapse(600000);
    await f.session.initialize();
    expect(f.session.getSnapshot().game).toEqual(initial.game);
    f.session.setActive(true);
    f.elapse(100);
    f.session.tick();
    expect(f.session.getSnapshot().game.credits).toBe(15);
  });
  it('keeps an unreadable save untouched and supports retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const f = fixture();
    const save = vi.spyOn(f.repository, 'save');
    vi.spyOn(f.repository, 'load').mockRejectedValueOnce(
      new Error('Invalid save'),
    );
    await f.session.initialize();
    f.session.toggleRunning();
    await f.session.save();
    expect(f.session.getSnapshot().status).toBe('load-error');
    expect(save).not.toHaveBeenCalled();
    await f.session.initialize();
    expect(f.session.getSnapshot().status).toBe('ready');
  });
  it('retains in-memory progress after save failure and allows explicit retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const f = fixture();
    await f.session.initialize();
    vi.spyOn(f.repository, 'save').mockRejectedValueOnce(new Error('Quota'));
    await f.session.save();
    expect(f.session.getSnapshot().saveStatus).toBe('error');
    f.session.setActive(true);
    f.session.toggleRunning();
    f.elapse(6500);
    f.session.tick();
    expect(f.session.getSnapshot().game.credits).toBe(15);
    await f.session.save(true);
    expect(f.session.getSnapshot().saveStatus).toBe('saved');
    expect(f.saved()?.game.credits).toBe(15);
  });
  it('serializes slow writes and flushes the newest pending snapshot last', async () => {
    const f = fixture();
    await f.session.initialize();
    const writes: GameSave[] = [];
    let finish: () => void = () => {
      throw new Error('No write is pending');
    };
    vi.spyOn(f.repository, 'save').mockImplementation((data) => {
      writes.push(data);
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    const pending = f.session.save();
    f.session.toggleRunning();
    f.session.setActive(true);
    f.elapse(6500);
    f.session.tick();
    void f.session.save();
    expect(writes).toHaveLength(1);
    finish();
    await Promise.resolve();
    expect(writes).toHaveLength(2);
    expect(writes[1]?.game.credits).toBe(15);
    finish();
    await pending;
    expect(f.session.getSnapshot().saveStatus).toBe('saved');
  });
});
