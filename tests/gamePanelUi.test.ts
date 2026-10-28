import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { GamePanel } from '../src/ui/components/GamePanel';

const dom = new JSDOM('<!doctype html><div id="root"></div>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
void test('panel dismissal waits for a completed click and preserves navigation', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  let closes = 0;
  let sales = 0;
  try {
    await act(async () => {
      root.render(
        createElement(
          'div',
          null,
          createElement(
            'nav',
            { className: 'depth-rail' },
            createElement('button', { id: 'depth' }, 'Depth'),
          ),
          createElement(
            'button',
            {
              id: 'sell',
              onClick: () => {
                sales++;
              },
            },
            'Sell',
          ),
          createElement(GamePanel, {
            title: 'Crew',
            context: 'Ocean',
            icon: 'robot',
            open: true,
            onClose: () => {
              closes++;
            },
            children: 'Content',
          }),
        ),
      );
      await Promise.resolve();
    });
    const sell = document.getElementById('sell');
    const depth = document.getElementById('depth');
    const backdrop = document.querySelector<HTMLButtonElement>(
      '.game-panel-backdrop',
    );
    assert(sell instanceof HTMLElement);
    assert(depth instanceof HTMLElement);
    assert(backdrop);
    sell.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
    sell.dispatchEvent(
      new dom.window.Event('pointercancel', { bubbles: true }),
    );
    assert.equal(closes, 0, 'scroll/cancelled gestures must not dismiss');
    depth.click();
    assert.equal(closes, 0, 'changing depth must leave the panel open');
    const content = document.querySelector('.panel-content');
    assert(content);
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.onclick = () => {
      cancel.remove();
    };
    content.append(cancel);
    cancel.click();
    assert.equal(
      closes,
      0,
      'an internal action that removes its button must not dismiss',
    );
    backdrop.click();
    assert.equal(closes, 1, 'one backdrop tap must close once');
    assert.equal(sales, 0, 'backdrop must not activate the game behind it');
    sell.click();
    assert.equal(closes, 2, 'desktop outside click still dismisses');
    assert.equal(sales, 1, 'one native click activates once');
  } finally {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  }
});
