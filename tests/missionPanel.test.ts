import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { ProgressionPanel } from '../src/ui/panels/ProgressionPanel';
import { completedWorld } from './fixtures';

void test('new late missions stay outside collapsed history of the seven legacy claims', () => {
  const full = completedWorld();
  const world = {
    ...full,
    progression: {
      ...full.progression,
      claimedMissions: full.progression.claimedMissions.filter(
        (id) => id !== 'vents' && id !== 'rift',
      ),
    },
  };
  const html = renderToStaticMarkup(
    createElement(ProgressionPanel, {
      world,
      mode: 'missions',
      onResearch: () => undefined,
      onClaim: () => undefined,
    }),
  );
  const dom = new JSDOM(html);
  try {
    const rows = [...dom.window.document.querySelectorAll('.mission-row')];
    const visible = rows.filter((row) => !row.closest('details'));
    const history = dom.window.document.querySelector('.mission-history');
    assert.equal(visible.length, 2);
    assert.match(visible[0]?.textContent ?? '', /900 m/);
    assert.match(visible[1]?.textContent ?? '', /1,900 m/);
    assert.equal(history?.querySelectorAll('.mission-row').length, 7);
    assert.equal(history.hasAttribute('open'), false);
    for (const row of visible)
      assert(row.querySelector('button:not([disabled])'));
  } finally {
    dom.window.close();
  }
});
