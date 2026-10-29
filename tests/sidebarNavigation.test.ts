import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { GameScreen } from '../src/ui/screens/GameScreen';
import { GameSession } from '../src/application/GameSession';
import { DeviceSave, FakeClock, gameSave } from './fixtures';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  },
  cancelAnimationFrame: (id: number) => {
    frames.delete(id);
  },
});
window.matchMedia = (() => ({
  matches: true,
})) as unknown as typeof window.matchMedia;
const { createRoot } = await import('react-dom/client');
async function settle() {
  await act(async () => {
    await Promise.resolve();
    for (let i = 0; i < 2; i++) {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(performance.now());
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
function click(label: string) {
  const button = document.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  assert(button, `Missing ${label}`);
  button.click();
}
void test('sidebar blocks background navigation while its own scrolling stays local', async () => {
  const session = new GameSession(
    new DeviceSave(gameSave(1000, 1)),
    new FakeClock(),
  );
  await session.initialize();
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const originalNow = Date.now;
  let now = 10000;
  Date.now = () => now;
  const wheel = (target: EventTarget, deltaY: number) => {
    now += 1000;
    target.dispatchEvent(
      new dom.window.WheelEvent('wheel', { deltaY, bubbles: true }),
    );
  };
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(GameScreen, {
          session,
          accountPanel: 'Profile content',
          leaderboardPanel: 'Leaders content',
          cloud: { status: 'saved', error: null, syncedAt: null },
        }),
      );
    });
    await act(async () => {
      await Promise.resolve();
      click('Research');
    });
    await settle();
    assert(document.querySelector('.game-panel'));
    await act(async () => {
      await Promise.resolve();
      wheel(window, 120);
    });
    assert.equal(session.getSnapshot().world.selectedLayerId, 'shallows');
    assert.equal(
      document.querySelector('#panel-title')?.textContent,
      'Research',
    );
    const panelContent = document.querySelector('.game-panel .panel-content');
    assert(panelContent);
    await act(async () => {
      await Promise.resolve();
      wheel(panelContent, 120);
    });
    assert.equal(session.getSnapshot().world.selectedLayerId, 'shallows');
    await act(async () => {
      await Promise.resolve();
      now += 1000;
      const arrow = new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      });
      panelContent.dispatchEvent(arrow);
      assert.equal(
        arrow.defaultPrevented,
        false,
        'panel arrows retain native scrolling',
      );
    });
    assert.equal(session.getSnapshot().world.selectedLayerId, 'shallows');
    // Focused panel controls must not navigate the underlying base.
    const panelButton =
      document.querySelector<HTMLButtonElement>('.game-panel button');
    assert(panelButton);
    await act(async () => {
      await Promise.resolve();
      now += 1000;
      panelButton.focus();
      panelButton.dispatchEvent(
        new dom.window.KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
        }),
      );
    });
    assert.equal(session.getSnapshot().world.selectedLayerId, 'shallows');
    const input = document.createElement('input');
    panelContent.append(input);
    await act(async () => {
      await Promise.resolve();
      now += 1000;
      input.dispatchEvent(
        new dom.window.KeyboardEvent('keydown', {
          key: 'ArrowUp',
          bubbles: true,
        }),
      );
    });
    assert.equal(session.getSnapshot().world.selectedLayerId, 'shallows');
    input.remove();
    await act(async () => {
      await Promise.resolve();
      now += 1000;
      panelButton.dispatchEvent(
        new dom.window.KeyboardEvent('keydown', {
          key: 'ArrowUp',
          bubbles: true,
        }),
      );
    });
    assert.equal(session.getSnapshot().world.selectedLayerId, 'shallows');
    await act(async () => {
      await Promise.resolve();
      window.dispatchEvent(
        new dom.window.KeyboardEvent('keydown', { key: 'Escape' }),
      );
    });
    await settle();
    await act(async () => {
      await Promise.resolve();
      wheel(window, -120);
    });
    await settle();
    await settle();
    assert(document.querySelector('.ocean-surface'));
    assert.equal(document.querySelector('.hud-wallet'), null);
    assert.equal(document.querySelector('.ocean-surface .panel-heading'), null);
    assert.equal(document.querySelector('[aria-label="Return to base"]'), null);
    await act(async () => {
      await Promise.resolve();
      wheel(window, 120);
    });
    await settle();
    assert.equal(document.querySelector('.ocean-surface'), null);
    assert(document.querySelector('.hud-wallet'));
    // The explicit Ocean button also works when another sidebar is open.
    await act(async () => {
      await Promise.resolve();
      click('Research');
    });
    await settle();
    await act(async () => {
      await Promise.resolve();
      click('Ocean');
    });
    await settle();
    assert(document.querySelector('.ocean-surface'));
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
    Date.now = originalNow;
    frames.clear();
  }
});
