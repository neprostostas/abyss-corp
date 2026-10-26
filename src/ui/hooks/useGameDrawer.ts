import { useEffect, useState } from 'react';

export const DRAWER_DURATION_MS = 280;
interface DrawerState<Name extends string> {
  name: Name;
  phase: 'opening' | 'open' | 'closing';
}

/** Keep content mounted through exit; rapid toggles cancel the previous transition. */
export function useGameDrawer<Name extends string>() {
  const [state, setState] = useState<DrawerState<Name> | null>(null);
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
        reduced ? 0 : DRAWER_DURATION_MS,
      );
      return () => {
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [state]);
  const toggle = (name: Name) => {
    setState((current) => {
      if (current?.name === name && current.phase !== 'closing')
        return { name, phase: 'closing' };
      if (current) return { name, phase: 'open' };
      return { name, phase: 'opening' };
    });
  };
  const close = () => {
    setState((current) => (current ? { ...current, phase: 'closing' } : null));
  };
  return {
    name: state?.name ?? null,
    open: state?.phase === 'open',
    toggle,
    close,
  };
}
