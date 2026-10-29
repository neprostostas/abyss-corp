import { completedWorld } from './fixtures';
import { DepthScene } from '../src/ui/world/DepthScene';
import { LockedDepthScene } from '../src/ui/world/LockedDepthScene';
import { useSurfaceReady } from '../src/ui/hooks/useSurfaceReady';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, useSyncExternalStore } from 'react';
import { DepthNavigation } from '../src/ui/panels/DepthNavigation';
import { GamePanel } from '../src/ui/components/GamePanel';
import { SURFACE_REVEAL_MS } from '../src/ui/hooks/useGameDrawer';
import { BasePanel } from '../src/ui/panels/BasePanel';
import { OceanPanel } from '../src/ui/panels/OceanPanel';
import { GameSession } from '../src/application/GameSession';
import { LAYER_IDS, LAYERS } from '../src/data/layers';
import { createLayer, getLayerGame } from '../src/domain/world';
import { getCampaign } from '../src/domain/campaign';
import { DeviceSave, FakeClock, gameSave } from './fixtures';
import type { LayerId } from '../src/data/layers';
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
  return createElement(BasePanel, { world, session });
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
      session.adoptCloudSave({ ...gameSave(), world: completedWorld() });
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
void test('uncharted oceans have no purchase controls and locked facilities cannot dispatch purchases', async () => {
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
    assert.equal(document.querySelectorAll('.infrastructure-card').length, 3);
    assert.equal(
      document.querySelectorAll('.infrastructure-card button').length,
      0,
    );
    assert.equal(document.querySelectorAll('.network-unlock').length, 1);
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

void test('surface Dive invokes navigation without changing saved progress', async () => {
  const session = new GameSession(
    new DeviceSave(gameSave(1000)),
    new FakeClock(),
  );
  await session.initialize();
  const before = session.getSnapshot().world;
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  let dives = 0;
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(OceanPanel, {
          world: before,
          onDive: () => {
            dives++;
          },
        }),
      );
    });
    await act(async () => {
      await Promise.resolve();
      document
        .querySelector<HTMLButtonElement>('[aria-label="Dive to current base"]')
        ?.click();
    });
    assert.equal(document.querySelectorAll('.surface-region').length, 3);
    assert.equal(
      document.querySelector('[aria-label="Base management"]'),
      null,
    );
    assert.equal(
      document.querySelectorAll('.surface-region:not([aria-disabled])').length,
      1,
    );
    await act(async () => {
      await Promise.resolve();
      document
        .querySelector<HTMLButtonElement>('[aria-label="Polar sea, uncharted"]')
        ?.click();
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Ember basin, uncharted"]',
        )
        ?.click();
    });
    assert.equal(dives, 1);
    assert.deepEqual(session.getSnapshot().world, before);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});

void test('depth island announces affordable unlocks and removes the price after purchase', async () => {
  const session = new GameSession(
    new DeviceSave(gameSave(1000)),
    new FakeClock(),
  );
  await session.initialize();
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  function Island() {
    const { world } = useSyncExternalStore(
      session.subscribe,
      session.getSnapshot,
    );
    return createElement(DepthNavigation, {
      world,
      onSelect: session.select,
      onUnlock: session.unlock,
    });
  }
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(Island));
    });
    const toggle = document.querySelector<HTMLButtonElement>(
      '.depth-island-toggle',
    );
    assert(toggle);
    assert(toggle.getAttribute('aria-label')?.includes('available to unlock'));
    await act(async () => {
      await Promise.resolve();
      toggle.click();
    });
    const purchase = document.querySelector<HTMLButtonElement>(
      '.depth-node.can-unlock',
    );
    assert(purchase);
    await act(async () => {
      await Promise.resolve();
      purchase.click();
    });
    assert(purchase.classList.contains('unlocked'));
    assert.equal(purchase.querySelector('.depth-price'), null);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    const slots = document.querySelector('.depth-island-list')?.children;
    assert(slots);
    assert.equal(slots.length, 5);
    assert.equal(slots[1]?.getAttribute('aria-current'), 'location');
    assert.equal(slots[1], purchase);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});

void test('surface controls become interactive after the early ocean reveal', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const originalTimeout = window.setTimeout.bind(window);
  const originalClear = window.clearTimeout.bind(window);
  const originalMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  let finish: (() => void) | undefined;
  let delay = 0;
  window.matchMedia = (() => ({
    matches: false,
  })) as unknown as typeof window.matchMedia;
  window.setTimeout = ((callback: () => void, milliseconds: number) => {
    finish = callback;
    delay = milliseconds;
    return 1;
  }) as typeof window.setTimeout;
  window.clearTimeout = () => undefined;
  const props = {
    open: true,
    surface: true,
    title: 'Ocean',
    context: '',
    icon: 'map' as const,
    onClose: () => undefined,
    children: createElement('button', null, 'Dive'),
  };
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(GamePanel, props));
    });
    assert.equal(delay, SURFACE_REVEAL_MS);
    assert(document.querySelector('aside')?.hasAttribute('inert'));
    await act(async () => {
      await Promise.resolve();
      finish?.();
    });
    assert.equal(document.querySelector('aside')?.hasAttribute('inert'), false);
    assert.equal(document.activeElement, document.querySelector('aside'));
    assert.notEqual(
      document.activeElement,
      document.querySelector('aside button'),
    );
    assert.equal(document.querySelector('aside .panel-heading'), null);
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(GamePanel, { ...props, open: false }));
    });
    assert(document.querySelector('aside')?.hasAttribute('inert'));
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(GamePanel, props));
    });
    assert(
      document.querySelector('aside')?.hasAttribute('inert'),
      'reopening must wait for the entrance again',
    );
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
    window.setTimeout = originalTimeout;
    window.clearTimeout = originalClear;
    if (originalMedia)
      Object.defineProperty(window, 'matchMedia', originalMedia);
    else Reflect.deleteProperty(window, 'matchMedia');
  }
});

void test('mobile header waits for the ocean reveal and becomes inert immediately on descent', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const timeout = window.setTimeout.bind(window);
  const clear = window.clearTimeout.bind(window);
  const media = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  let finish: (() => void) | undefined;
  let delay = 0;
  window.matchMedia = (() => ({
    matches: false,
  })) as unknown as typeof window.matchMedia;
  window.setTimeout = ((callback: () => void, milliseconds: number) => {
    finish = callback;
    delay = milliseconds;
    return 1;
  }) as typeof window.setTimeout;
  window.clearTimeout = () => undefined;
  function Header({ open }: { open: boolean }) {
    const ready = useSurfaceReady(open);
    return createElement(
      'header',
      { inert: !ready },
      createElement('button', null, 'Profile'),
    );
  }
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(Header, { open: true }));
    });
    assert.equal(delay, SURFACE_REVEAL_MS);
    assert(document.querySelector('header')?.hasAttribute('inert'));
    await act(async () => {
      await Promise.resolve();
      finish?.();
    });
    assert.equal(
      document.querySelector('header')?.hasAttribute('inert'),
      false,
    );
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(Header, { open: false }));
    });
    assert(document.querySelector('header')?.hasAttribute('inert'));
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
    window.setTimeout = timeout;
    window.clearTimeout = clear;
    if (media) Object.defineProperty(window, 'matchMedia', media);
    else Reflect.deleteProperty(window, 'matchMedia');
  }
});

void test('locked depths retain departing meters while the next depth enters', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const world = gameSave(0).world;
  const props = { world, onClose: () => undefined, onUnlock: () => undefined };
  const renderDepth = (depth: LayerId) =>
    createElement(DepthScene, {
      viewedLayerId: depth,
      layerId: 'shallows',
      phase: 'mining',
      progress: 0,
      running: false,
      game: getLayerGame(world),
      config: LAYERS.shallows.production,
      selected: null,
      bottleneck: null,
      onSelect: () => undefined,
      lockedScene: createElement(LockedDepthScene, { ...props, depth }),
    });
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(renderDepth('golden-trench'));
    });
    await act(async () => {
      await Promise.resolve();
      root.render(renderDepth('pearl-caverns'));
    });
    const departing = document.querySelector('.depth-scene-frame.departing');
    const arriving = document.querySelector('.depth-scene-frame.arriving');
    assert.equal(
      departing
        ?.querySelector('.locked-depth-scene')
        ?.getAttribute('aria-label'),
      'Golden trench, locked depth',
    );
    assert.equal(
      arriving
        ?.querySelector('.locked-depth-scene')
        ?.getAttribute('aria-label'),
      'Pearl caverns, locked depth',
    );
    assert(departing.hasAttribute('inert'));
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});

void test('locked depths show one relevant action for credit and prerequisite gates', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const unlocked: string[] = [];
  const explored: string[] = [];
  const props = {
    onUnlock: (id: string) => {
      unlocked.push(id);
    },
    onExplore: (id: string) => {
      explored.push(id);
    },
    onClose: () => undefined,
  };
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(LockedDepthScene, {
          ...props,
          depth: 'golden-trench',
          world: gameSave(0).world,
        }),
      );
    });
    const locked = document.querySelector<HTMLButtonElement>(
      '.locked-depth-unlock',
    );
    assert(locked?.disabled);
    assert.equal(
      document.querySelector('.locked-depth-number')?.textContent,
      '180m',
    );
    assert.equal(document.querySelector('.locked-depth-header'), null);
    assert.equal(document.querySelector('.locked-depth-footer'), null);
    await act(async () => {
      await Promise.resolve();
      locked.click();
    });
    assert.equal(unlocked.length, 0);
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(LockedDepthScene, {
          ...props,
          depth: 'golden-trench',
          world: gameSave(1000).world,
        }),
      );
    });
    const available = document.querySelector<HTMLButtonElement>(
      '.locked-depth-unlock',
    );
    assert(available && !available.disabled);
    assert.equal(document.querySelector('.locked-depth-shortfall'), null);
    await act(async () => {
      await Promise.resolve();
      available.click();
    });
    assert.deepEqual(unlocked, ['golden-trench']);
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(LockedDepthScene, {
          ...props,
          key: 'pearl',
          depth: 'pearl-caverns',
          world: gameSave(1000).world,
        }),
      );
    });
    assert.equal(document.querySelector('.locked-depth-unlock'), null);
    await act(async () => {
      await Promise.resolve();
      document
        .querySelector<HTMLButtonElement>('.locked-depth-prerequisite')
        ?.click();
    });
    assert.deepEqual(explored, ['golden-trench']);
    assert.deepEqual(unlocked, ['golden-trench']);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});

void test('mission header keeps the same Claim all button after collecting rewards', async () => {
  const { ClaimAllMissions, ProgressionPanel } =
    await import('../src/ui/panels/ProgressionPanel');
  const initial = gameSave(1000);
  const repository = new DeviceSave({
    ...initial,
    world: {
      ...initial.world,
      progression: { research: { trade: 1, storage: 0 }, claimedMissions: [] },
    },
  });
  const session = new GameSession(repository, new FakeClock());
  await session.initialize();
  function Missions() {
    const { world } = useSyncExternalStore(
      session.subscribe,
      session.getSnapshot,
    );
    return createElement(GamePanel, {
      title: 'Missions',
      open: true,
      context: 'All outposts',
      icon: 'missions',
      onClose: () => {
        assert.fail('Claiming must not close the panel');
      },
      headerAction: createElement(ClaimAllMissions, {
        world,
        onClaim: session.claimMission,
      }),
      children: createElement(ProgressionPanel, {
        world,
        mode: 'missions',
        onClaim: session.claimMission,
        onResearch: session.research,
      }),
    });
  }
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(Missions));
    });
    const claim = document.querySelector<HTMLButtonElement>(
      '.panel-heading .claim-all',
    );
    assert(claim);
    assert.equal(claim.disabled, false);
    await act(async () => {
      await Promise.resolve();
      claim.click();
    });
    assert.equal(document.querySelector('.claim-all'), claim);
    assert.equal(claim.disabled, true);
    assert.equal(session.getSnapshot().world.credits, 1040);
    await act(async () => {
      await Promise.resolve();
      claim.click();
    });
    assert.equal(session.getSnapshot().world.credits, 1040);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});

void test('depth island exposes all depths in ascending order with the current selection', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const expected = ['50', '180', '420', '900', '1900'];
  for (const [index, viewedDepth] of LAYER_IDS.entries()) {
    const markup = renderToStaticMarkup(
      createElement(DepthNavigation, {
        world: gameSave().world,
        viewedDepth,
        onSelect: () => {
          assert.fail('render must not select');
        },
        onUnlock: () => {
          assert.fail('render must not unlock');
        },
      }),
    );
    const fixture = document.createElement('div');
    fixture.innerHTML = markup;
    const nodes = fixture.querySelectorAll('.depth-island-list > button');
    assert.equal(nodes.length, 5);
    assert.equal(nodes[index]?.getAttribute('aria-current'), 'location');
    assert.deepEqual(
      Array.from(
        nodes,
        (node) => node.querySelector('b')?.firstChild?.textContent,
      ),
      expected,
    );
  }
});

void test('drawers dismiss outside clicks and Escape, but Ocean ignores outside clicks', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  const originalMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  window.matchMedia = (() => ({
    matches: false,
  })) as unknown as typeof window.matchMedia;
  let closes = 0;
  const outside = document.createElement('button');
  let underlyingClicks = 0;
  outside.onclick = () => {
    underlyingClicks++;
  };
  document.body.append(outside);
  const render = (surface: boolean) => {
    root.render(
      createElement(GamePanel, {
        title: 'Test panel',
        open: true,
        context: 'Test',
        icon: 'research',
        surface,
        onClose: () => {
          closes++;
        },
        children: createElement('button', { id: 'inside-test' }, 'Inside'),
      }),
    );
  };
  try {
    await act(async () => {
      await Promise.resolve();
      render(false);
    });
    document.getElementById('inside-test')?.click();
    assert.equal(closes, 0);
    outside.click();
    assert.equal(closes, 1);
    assert.equal(underlyingClicks, 0);
    const handledEscape = new dom.window.KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    });
    handledEscape.preventDefault();
    window.dispatchEvent(handledEscape);
    window.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        isComposing: true,
      }),
    );
    assert.equal(
      closes,
      1,
      'handled Escape and IME composition must not close the drawer',
    );
    window.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Escape' }),
    );
    assert.equal(closes, 2);
    await act(async () => {
      await Promise.resolve();
      render(true);
    });
    outside.click();
    assert.equal(closes, 2);
    assert.equal(underlyingClicks, 1);
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
    outside.remove();
    if (originalMedia)
      Object.defineProperty(window, 'matchMedia', originalMedia);
    else Reflect.deleteProperty(window, 'matchMedia');
  }
});

void test('depth island closes on outside touch and Escape returns focus to its trigger', async () => {
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(
        createElement(DepthNavigation, {
          world: gameSave().world,
          onSelect: () => undefined,
          onUnlock: () => undefined,
        }),
      );
    });
    const toggle = document.querySelector<HTMLButtonElement>(
      '.depth-island-toggle',
    );
    assert(toggle);
    await act(async () => {
      await Promise.resolve();
      toggle.click();
    });
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    await act(async () => {
      await Promise.resolve();
      const leave = new dom.window.MouseEvent('pointerout', {
        bubbles: true,
        relatedTarget: document.body,
      });
      Object.defineProperty(leave, 'pointerType', { value: 'touch' });
      toggle.dispatchEvent(leave);
    });
    assert.equal(
      toggle.getAttribute('aria-expanded'),
      'true',
      'lifting a finger must not close the island',
    );

    await act(async () => {
      await Promise.resolve();
      document.body.dispatchEvent(
        new dom.window.Event('pointerdown', { bubbles: true }),
      );
    });
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    await act(async () => {
      await Promise.resolve();
      toggle.click();
    });
    const node = document.querySelector<HTMLButtonElement>('.depth-node');
    assert(node);
    await act(async () => {
      await Promise.resolve();
      node.focus();
      node.dispatchEvent(
        new dom.window.KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        }),
      );
    });
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(document.activeElement, toggle);
    await act(async () => {
      await Promise.resolve();
      toggle.click();
    });
    await act(async () => {
      await Promise.resolve();
      node.focus();
      node.dispatchEvent(
        new dom.window.WheelEvent('wheel', { deltaY: 80, bubbles: true }),
      );
    });
    assert.equal(
      document.activeElement,
      node,
      'wheel scrolling must not steal keyboard focus',
    );
    await act(async () => {
      await Promise.resolve();
      node.click();
    });
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(
      document.activeElement,
      toggle,
      'selecting the current depth restores trigger focus',
    );
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
  }
});
