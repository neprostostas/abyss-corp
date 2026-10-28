import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, useState } from 'react';
import { LeaderboardPanel } from '../src/ui/players/LeaderboardPanel';
import type { LeaderboardPage } from '../src/application/playerPorts';

const dom = new JSDOM('<!doctype html><div id="root"></div>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const empty: LeaderboardPage = { players: [], currentPlayer: null, total: 0 };

void test('leaderboard sync does not restart when saving rerenders its parent', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  let saves = 0;
  let loads = 0;
  function AccountHarness() {
    const [, setCloudVersion] = useState(0);
    return createElement(LeaderboardPanel, {
      gateway: {
        loadLeaderboard: () => {
          loads++;
          return Promise.resolve(empty);
        },
        renameCaptain: () => Promise.resolve(),
      },
      synchronize: () => {
        saves++;
        // Bound the reproduction so the broken implementation cannot hang tests.
        if (saves < 5) setCloudVersion((value) => value + 1);
        return Promise.resolve();
      },
    });
  }
  try {
    await act(async () => {
      root.render(createElement(AccountHarness));
      await Promise.resolve();
    });
    assert.equal(saves, 1, 'opening Leaders must synchronize only once');
    assert.equal(loads, 1);
    assert.match(container.textContent, /No captains here yet/);
    await act(async () => {
      const refresh = container.querySelector<HTMLButtonElement>(
        '[aria-label="Refresh leaderboard"]',
      );
      assert(refresh);
      refresh.click();
      await Promise.resolve();
    });
    assert.equal(saves, 2, 'manual refresh must synchronize once more');
    assert.equal(loads, 2);
  } finally {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  }
});
