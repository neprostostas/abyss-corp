import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { UpgradeCard } from '../src/ui/panels/UpgradeCard';
import { createGame } from '../src/domain/game';
import { LAYERS } from '../src/data/layers';

void test('memoized upgrades retain live affordability, level, research prices and storage capacity', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const onUpgrade = () => undefined;
  const game = createGame();
  const config = LAYERS.shallows.production;
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(UpgradeCard, { id: 'mining', game, config, onUpgrade }),
      );
    });
    assert(document.querySelector('button')?.disabled);
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(UpgradeCard, {
          id: 'mining',
          game: { ...game, credits: 1000 },
          config: { ...config, upgradeCostMultiplier: 0.5 },
          onUpgrade,
        }),
      );
    });
    assert.equal(document.querySelector('button')?.disabled, false);
    assert.match(document.querySelector('button')?.textContent ?? '', /12/);
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(UpgradeCard, {
          id: 'mining',
          game: {
            ...game,
            credits: 1000,
            levels: { ...game.levels, mining: 5 },
          },
          config,
          onUpgrade,
        }),
      );
    });
    assert(document.querySelector('button')?.disabled);
    assert.match(document.querySelector('button')?.textContent ?? '', /Max/i);
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(UpgradeCard, {
          id: 'storage',
          game,
          config: { ...config, storageBonus: 12 },
          onUpgrade,
        }),
      );
    });
    assert.match(container.textContent, /18/);
    assert.match(container.textContent, /24/);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
    dom.window.close();
  }
});
