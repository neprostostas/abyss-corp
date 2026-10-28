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
    assert.match(container.textContent, /No players here yet/);
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

void test('slow leaderboard requests do not overlap periodic refreshes', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const originalInterval = window.setInterval.bind(window);
  const originalClear = window.clearInterval.bind(window);
  let poll: (() => void) | undefined;
  let finish: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let saves = 0;
  window.setInterval = ((handler: () => void) => {
    poll = handler;
    return 1;
  }) as typeof window.setInterval;
  window.clearInterval = () => undefined;
  try {
    await act(async () => {
      root.render(
        createElement(LeaderboardPanel, {
          gateway: {
            loadLeaderboard: () => Promise.resolve(empty),
            renameCaptain: () => Promise.resolve(),
          },
          synchronize: () => {
            saves++;
            return pending;
          },
        }),
      );
      await Promise.resolve();
    });
    assert(poll);
    await act(async () => {
      poll?.();
      poll?.();
      await Promise.resolve();
    });
    assert.equal(
      saves,
      1,
      'a slow request must not launch another save every 30 seconds',
    );
    await act(async () => {
      assert(finish);
      finish();
      await pending;
    });
    await act(async () => {
      poll?.();
      await Promise.resolve();
    });
    assert.equal(
      saves,
      2,
      'polling resumes after the previous request finishes',
    );
  } finally {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    window.setInterval = originalInterval;
    window.clearInterval = originalClear;
  }
});

void test('rankings show a player once, use generated tags and omit redundant explanations', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const player = {
    id: 'db1ca8fb-9ba2-4633-a4ce-c7b804fedc3c',
    captainName: 'Captain DB1CA8FB',
    position: 1,
    depthMeters: 50,
    upgrades: 0,
    research: 0,
    automation: 0,
    credits: 0,
  };
  try {
    await act(async () => {
      root.render(
        createElement(LeaderboardPanel, {
          gateway: {
            loadLeaderboard: () =>
              Promise.resolve({
                players: [player],
                currentPlayer: player,
                total: 1,
              }),
            renameCaptain: () => Promise.resolve(),
          },
          synchronize: () => Promise.resolve(),
        }),
      );
      await Promise.resolve();
    });
    assert.equal(container.querySelectorAll('.standing-row').length, 1);
    assert.match(container.textContent, /#DB1CA8FB/);
    assert.doesNotMatch(
      container.textContent,
      /Captain DB1CA8FB|Depth first|Upgrades break ties/,
    );
    assert.equal(container.querySelector('.leaderboard-emblem'), null);
    assert(container.querySelector('button[aria-label="Refresh leaderboard"]'));
  } finally {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  }
});
