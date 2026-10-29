import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import {
  SURFACE_TRAVEL_MS,
  useGameDrawer,
} from '../src/ui/hooks/useGameDrawer';

const dom = new JSDOM('<div id="root"></div>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => undefined,
});
const { createRoot } = await import('react-dom/client');
const duration = () => SURFACE_TRAVEL_MS;
void test('ocean stays mounted throughout descent and reopening cancels removal', async () => {
  let timer: (() => void) | undefined;
  let delay = 0;
  let cleared = 0;
  let reduced = false;
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: reduced }),
  });
  window.setTimeout = ((callback: () => void, milliseconds: number) => {
    timer = callback;
    delay = milliseconds;
    return 7;
  }) as typeof window.setTimeout;
  window.clearTimeout = () => {
    cleared++;
  };
  let drawer: ReturnType<typeof useGameDrawer<'ocean'>> | undefined;
  function Harness() {
    drawer = useGameDrawer<'ocean'>(undefined, duration);
    return createElement('div', null, drawer.name);
  }
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(Harness));
    });
    await act(async () => {
      await Promise.resolve();
      drawer?.toggle('ocean');
    });
    await act(async () => {
      await Promise.resolve();
      drawer?.close();
    });
    assert.equal(delay, SURFACE_TRAVEL_MS);
    assert.equal(drawer?.name, 'ocean');
    assert.equal(drawer.phase, 'closing');
    await act(async () => {
      await Promise.resolve();
      drawer?.toggle('ocean');
    });
    assert(cleared > 0);
    assert.equal(drawer.phase, 'open');
    await act(async () => {
      await Promise.resolve();
      timer?.();
    });
    assert.equal(drawer.name, 'ocean');
    reduced = true;
    await act(async () => {
      await Promise.resolve();
      drawer?.close();
    });
    assert.equal(delay, 0);
    await act(async () => {
      await Promise.resolve();
      timer?.();
    });
    assert.equal(drawer.name, null);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});
