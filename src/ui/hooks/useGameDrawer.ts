import { useCallback, useEffect, useState } from 'react';

export const DRAWER_DURATION_MS = 280;
const defaultCloseDuration = () => DRAWER_DURATION_MS;
export const SURFACE_TRAVEL_MS = 550;
// Keep interaction readiness aligned with the completed crossfade.
export const SURFACE_REVEAL_MS = SURFACE_TRAVEL_MS;
interface DrawerState<Name extends string> {
  name: Name;
  phase: 'opening' | 'open' | 'closing';
}

export function useGameDrawer<Name extends string>(
  initialName?: Name,
  closeDuration: (name: Name) => number = defaultCloseDuration,
  canSwap?: (from: Name, to: Name) => boolean,
) {
  const [state, setState] = useState<DrawerState<Name> | null>(() =>
    initialName ? { name: initialName, phase: 'opening' } : null,
  );
  useEffect(() => {
    if (!state) return undefined;
    if (state.phase === 'opening') {
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          setState((current) =>
            current?.phase === 'opening'
              ? { ...current, phase: 'open' }
              : current,
          );
        });
      });
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
      };
    }
    if (state.phase === 'closing') {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      const timer = window.setTimeout(
        () => {
          setState((current) =>
            current?.phase === 'closing' ? null : current,
          );
        },
        reduced ? 0 : closeDuration(state.name),
      );
      return () => {
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [state, closeDuration]);
  const toggle = useCallback(
    (name: Name) => {
      setState((current) => {
        if (current?.name === name && current.phase !== 'closing')
          return { name, phase: 'closing' };
        if (current?.name === name) return { name, phase: 'open' };
        if (
          current &&
          current.phase !== 'closing' &&
          canSwap?.(current.name, name)
        )
          return { name, phase: current.phase };
        return { name, phase: 'opening' };
      });
    },
    [canSwap],
  );
  const close = useCallback(() => {
    setState((current) =>
      current && current.phase !== 'closing'
        ? { ...current, phase: 'closing' }
        : current,
    );
  }, []);
  return {
    name: state?.name ?? null,
    phase: state?.phase ?? null,
    open: state?.phase === 'open',
    toggle,
    close,
  };
}
