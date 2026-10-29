import { useEffect, useState } from 'react';
import { SURFACE_REVEAL_MS } from './useGameDrawer';

export function useSurfaceReady(open: boolean, enabled = true) {
  const [settled, setSettled] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    if (!open) setSettled(false);
  }
  useEffect(() => {
    if (!enabled) return;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const timer = window.setTimeout(
      () => {
        setSettled(open);
      },
      open && !reduced ? SURFACE_REVEAL_MS : 0,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [open, enabled]);
  return open && settled;
}
