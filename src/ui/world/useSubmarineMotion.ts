import { useLayoutEffect, useRef } from 'react';
import type { Phase } from '../../domain/game';
import { submarinePosition } from './submarineRoute';

function position(phase: Phase, progress: number): number {
  return phase === 'delivering'
    ? progress
    : phase === 'returning'
      ? 1 - progress
      : 0;
}
export function useSubmarineMotion(
  phase: Phase,
  progress: number,
  running: boolean,
  layerId: string,
) {
  const ref = useRef<SVGGElement>(null);
  const motion = useRef({
    from: position(phase, progress),
    to: position(phase, progress),
    started: 0,
    duration: 100,
    layerId,
    lastTick: 0,
  });
  useLayoutEffect(() => {
    const now = performance.now();
    const previous = motion.current;
    const fraction = Math.min(
      1,
      Math.max(0, (now - previous.started) / previous.duration),
    );
    const current = previous.from + (previous.to - previous.from) * fraction;
    const next = position(phase, progress);
    const reset = previous.layerId !== layerId || !running || document.hidden;
    motion.current = {
      from: reset ? next : current,
      to: next,
      started: now,
      duration: Math.min(
        150,
        Math.max(16, previous.lastTick ? now - previous.lastTick : 100),
      ),
      layerId,
      lastTick: now,
    };
  }, [phase, progress, running, layerId]);
  useLayoutEffect(() => {
    let frame = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const draw = (now: number) => {
      const state = motion.current;
      const t = reduced.matches
        ? 1
        : Math.min(1, Math.max(0, (now - state.started) / state.duration));
      const travel = state.from + (state.to - state.from) * t;
      const { x, y } = submarinePosition(travel);
      ref.current?.setAttribute(
        'transform',
        `translate(${String(x)} ${String(y)})`,
      );
      return !reduced.matches && t < 1 && state.from !== state.to;
    };
    const animate = (now: number) => {
      const moving = draw(now);
      if (moving && running && !document.hidden)
        frame = requestAnimationFrame(animate);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      animate(performance.now());
    };
    animate(performance.now());
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [phase, progress, running, layerId]);
  return ref;
}
