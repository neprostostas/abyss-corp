import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from './GameSession';
import type { Clock, GameSave, SaveRepository } from './ports';
import { createLayer, createWorld } from '../domain/world';

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
    expect(f.session.getSnapshot().world.layers.shallows?.phaseElapsedMs).toBe(
      2000,
    );
    expect(f.session.getSnapshot().world.credits).toBe(0);
    f.elapse(10500);
    f.session.tick();
    expect(f.session.getSnapshot().world.credits).toBe(0);
    f.session.sell();
    expect(f.session.getSnapshot().world.credits).toBe(24);
  });
  it('resumes saved cargo without offline rewards', async () => {
    const initial: GameSave = {
      version: 3,
      savedAt: 1,
      world: {
        ...createWorld(),
        layers: {
          shallows: {
            ...createLayer(),
            running: true,
            phase: 'delivering',
            phaseElapsedMs: 2400,
          },
        },
      },
    };
    const f = fixture(initial);
    f.elapse(600000);
    await f.session.initialize();
    expect(f.session.getSnapshot().world).toEqual(initial.world);
    f.session.setActive(true);
    f.elapse(100);
    f.session.tick();
    expect(f.session.getSnapshot().world.credits).toBe(0);
    expect(
      f.session.getSnapshot().world.layers.shallows?.processingElapsedMs,
    ).toBe(0);
  });
  it('coordinates unlocks, navigation and shared sales through the session', async () => {
    const f = fixture({
      version: 3,
      savedAt: 1,
      world: { ...createWorld(), credits: 250 },
    });
    await f.session.initialize();
    f.session.setActive(true);
    f.session.unlock('golden-trench');
    expect(f.session.getSnapshot().world.credits).toBe(0);
    f.session.unlock('golden-trench');
    expect(f.session.getSnapshot().world.credits).toBe(0);
    f.session.toggleRunning();
    f.session.select('shallows');
    f.elapse(18750);
    f.session.tick();
    expect(f.session.getSnapshot().world.layers['golden-trench']?.refined).toBe(
      3,
    );
    expect(f.session.getSnapshot().world.layers.shallows?.phaseElapsedMs).toBe(
      0,
    );
    f.session.select('golden-trench');
    f.session.sell();
    expect(f.session.getSnapshot().world.credits).toBe(60);
    await f.session.save();
    expect(f.saved()?.world).toEqual(f.session.getSnapshot().world);
  });
  it('suspends every unlocked operation while hidden', async () => {
    const world = {
      ...createWorld(),
      selectedLayerId: 'golden-trench' as const,
      layers: {
        shallows: { ...createLayer(), running: true },
        'golden-trench': { ...createLayer(), running: true },
      },
    };
    const f = fixture({ version: 3, savedAt: 1, world });
    await f.session.initialize();
    f.session.setActive(true);
    f.elapse(1000);
    f.session.setActive(false);
    const before = f.session.getSnapshot().world;
    f.elapse(10000000);
    f.session.setActive(true);
    expect(f.session.getSnapshot().world).toEqual(before);
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
    f.elapse(12500);
    f.session.tick();
    f.session.sell();
    expect(f.session.getSnapshot().world.credits).toBe(24);
    await f.session.save(true);
    expect(f.session.getSnapshot().saveStatus).toBe('saved');
    expect(f.saved()?.world.credits).toBe(24);
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
    f.elapse(12500);
    f.session.tick();
    f.session.sell();
    void f.session.save();
    expect(writes).toHaveLength(1);
    finish();
    await Promise.resolve();
    expect(writes).toHaveLength(2);
    expect(writes[1]?.world.credits).toBe(24);
    finish();
    await pending;
    expect(f.session.getSnapshot().saveStatus).toBe('saved');
  });
});
