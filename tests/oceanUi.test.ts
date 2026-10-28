import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, useSyncExternalStore } from 'react';
import { OceanPanel } from '../src/ui/panels/OceanPanel';
import { GameSession } from '../src/application/GameSession';
import { LAYER_IDS } from '../src/data/layers';
import { createLayer } from '../src/domain/world';
import { getCampaign } from '../src/domain/campaign';
import { DeviceSave, FakeClock, gameSave } from './fixtures';
import type { GameSave } from '../src/application/ports';

const dom = new JSDOM('<!doctype html><div id="root"></div>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
function View({ session }: { session: GameSession }) {
  const { world } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
  );
  return createElement(OceanPanel, { world, session });
}
function button(text: string) {
  const node = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === text,
  );
  assert(node, `Missing ${text}`);
  return node;
}
void test('map navigation, shared upgrades and prestige use explicit native clicks and confirmation', async () => {
  const initial: GameSave = {
    ...gameSave(100000),
    world: {
      ...gameSave(100000).world,
      layers: Object.fromEntries(LAYER_IDS.map((id) => [id, createLayer()])),
    },
  };
  const repository = new DeviceSave(initial);
  let resets = 0;
  const session = new GameSession(
    {
      load: () => repository.load(),
      save: (data) => repository.save(data),
      prestige: async (_current, next) => {
        resets++;
        await repository.save(next);
      },
    },
    new FakeClock(),
  );
  await session.initialize();
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(View, { session }));
    });
    assert.equal(document.querySelectorAll('.ocean-map-node').length, 5);
    await act(async () => {
      await Promise.resolve();
      document
        .querySelector<HTMLButtonElement>('[aria-label="Visit Midnight rift"]')
        ?.click();
    });
    assert.equal(session.getSnapshot().world.selectedLayerId, 'midnight-rift');
    await act(async () => {
      await Promise.resolve();
      button('Network').click();
    });
    assert.equal(document.querySelectorAll('.infrastructure-card').length, 3);
    await act(async () => {
      await Promise.resolve();
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Upgrade Cargo depot, 800 credits"]',
        )
        ?.click();
    });
    assert.equal(
      getCampaign(session.getSnapshot().world).infrastructure.depot,
      1,
    );
    assert(
      document.querySelector('.infrastructure-list'),
      'upgrading must keep the selected view',
    );
    await act(async () => {
      await Promise.resolve();
      button('Prestige').click();
    });
    await act(async () => {
      await Promise.resolve();
      button('Prepare new run').click();
    });
    assert.equal(resets, 0);
    await act(async () => {
      await Promise.resolve();
      button('Keep playing').click();
    });
    assert.equal(resets, 0);
    await act(async () => {
      await Promise.resolve();
      button('Prepare new run').click();
    });
    await act(async () => {
      await Promise.resolve();
      const confirm = button('Reset & gain +20%');
      confirm.click();
      confirm.click();
    });
    assert.equal(resets, 1);
    assert.equal(getCampaign(session.getSnapshot().world).rank, 1);
    assert.equal(session.getSnapshot().world.credits, 0);
    assert(button('Prepare new run').disabled);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});
void test('locked map nodes and facilities cannot dispatch purchases', async () => {
  const repository = new DeviceSave(gameSave(1000));
  const session = new GameSession(repository, new FakeClock());
  await session.initialize();
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(View, { session }));
    });
    const rift = document.querySelector<HTMLButtonElement>(
      '.ocean-map-node:last-child',
    );
    assert(rift?.disabled);
    await act(async () => {
      await Promise.resolve();
      rift.click();
      button('Network').click();
    });
    for (const node of document.querySelectorAll<HTMLButtonElement>(
      '.infrastructure-card button',
    ))
      assert(node.disabled);
    await act(async () => {
      await Promise.resolve();
      button('Prestige').click();
    });
    assert(button('Prepare new run').disabled);
    assert.equal(session.getSnapshot().world.credits, 1000);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});
