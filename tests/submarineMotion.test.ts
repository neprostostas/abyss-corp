import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { useSubmarineMotion } from '../src/ui/world/useSubmarineMotion';
import { submarinePosition } from '../src/ui/world/submarineRoute';
import type { Phase } from '../src/domain/game';

void test('submarine animation uses frames only while interpolating visible movement', async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    pretendToBeVisual: true,
  });
  let now = 100;
  let reduced = false;
  let sequence = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const globals = [
    'window',
    'document',
    'HTMLElement',
    'performance',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'IS_REACT_ACT_ENVIRONMENT',
  ] as const;
  const original = globals.map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++sequence, callback);
      return sequence;
    },
    cancelAnimationFrame: (id: number) => {
      frames.delete(id);
    },
  });
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: { now: () => now },
  });
  dom.window.matchMedia = (() => ({
    get matches() {
      return reduced;
    },
  })) as unknown as typeof window.matchMedia;
  const { createRoot } = await import('react-dom/client');
  const container = document.getElementById('root');
  assert(container);
  const root = createRoot(container);
  function Submarine({ phase, progress }: { phase: Phase; progress: number }) {
    const ref = useSubmarineMotion(phase, progress, true, 'shallows');
    return createElement('svg', null, createElement('g', { ref }));
  }
  const render = async (phase: Phase, progress: number) => {
    await act(async () => {
      await Promise.resolve();
      root.render(createElement(Submarine, { phase, progress }));
    });
  };
  const advanceFrame = (time: number) => {
    now = time;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
  };
  const expectedTransform = (progress: number) => {
    const { x, y } = submarinePosition(progress);
    return `translate(${String(x)} ${String(y)})`;
  };
  try {
    await render('mining', 0);
    assert.equal(
      frames.size,
      0,
      'stationary mining must not run an animation loop',
    );
    now = 200;
    await render('delivering', 0.5);
    assert.equal(frames.size, 1, 'moving submarine schedules interpolation');
    advanceFrame(250);
    assert.equal(
      container.querySelector('g')?.getAttribute('transform'),
      expectedTransform(0.25),
    );
    advanceFrame(300);
    assert.equal(
      container.querySelector('g')?.getAttribute('transform'),
      expectedTransform(0.5),
    );
    assert.equal(
      frames.size,
      0,
      'completed movement must stop scheduling frames',
    );

    reduced = true;
    now = 400;
    await render('delivering', 0.75);
    assert.equal(
      container.querySelector('g')?.getAttribute('transform'),
      expectedTransform(0.75),
    );
    assert.equal(
      frames.size,
      0,
      'reduced motion updates positions without a frame loop',
    );

    reduced = false;
    now = 500;
    await render('returning', 0.5);
    assert.equal(frames.size, 1);
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new dom.window.Event('visibilitychange'));
    assert.equal(frames.size, 0, 'background tab cancels animation');
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new dom.window.Event('visibilitychange'));
    assert.equal(frames.size, 1, 'unfinished movement resumes when visible');
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
    assert.equal(frames.size, 0, 'unmount cancels pending frames');
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  }
});
