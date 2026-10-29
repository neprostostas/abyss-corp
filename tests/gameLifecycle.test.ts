import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { GameSession } from '../src/application/GameSession';
import { useGameSession } from '../src/app/useGameSession';
import { DeviceSave, FakeClock, gameSave } from './fixtures';

void test('page lifecycle resumes once and unmount removes timers and listeners', async () => {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const timers = new Map<number, TimerHandler>();
  let id = 0;
  window.setInterval = ((handler: TimerHandler) => {
    timers.set(++id, handler);
    return id;
  }) as typeof window.setInterval;
  window.clearInterval = (key) => {
    if (typeof key === 'number') timers.delete(key);
  };
  const clock = new FakeClock();
  const repository = new DeviceSave(gameSave());
  const session = new GameSession(repository, clock);
  function View() {
    const snapshot = useGameSession(session);
    return createElement('span', null, snapshot.status);
  }
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(createElement(View));
      await Promise.resolve();
    });
    assert.equal(session.getSnapshot().status, 'ready');
    assert.equal(timers.size, 2);
    await act(async () => {
      window.dispatchEvent(new dom.window.Event('pagehide'));
      await Promise.resolve();
    });
    const before = session.getSnapshot().world;
    clock.advance(60000);
    await act(async () => {
      window.dispatchEvent(new dom.window.Event('pageshow'));
      await Promise.resolve();
    });
    const resumed = session.getSnapshot().world;
    assert.notDeepEqual(resumed, before);
    await act(async () => {
      window.dispatchEvent(new dom.window.Event('pageshow'));
      await Promise.resolve();
    });
    assert.deepEqual(session.getSnapshot().world, resumed);
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    assert.equal(timers.size, 0);
    const stopped = session.getSnapshot().world;
    clock.advance(60000);
    window.dispatchEvent(new dom.window.Event('pageshow'));
    session.tick();
    assert.deepEqual(
      session.getSnapshot().world,
      stopped,
      'unmounted game must not resume',
    );
  } finally {
    dom.window.close();
  }
});
