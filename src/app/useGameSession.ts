import { useEffect, useSyncExternalStore } from 'react';
import type { GameSession } from '../application/GameSession';
import { SESSION_TIMING } from '../data/balance';

export function useGameSession(session: GameSession) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    const onVisibility = () => {
      session.setActive(!document.hidden);
      if (document.hidden) void session.save();
    };
    const onPageHide = () => {
      session.setActive(false);
      void session.save();
    };
    const onPageShow = () => {
      session.setActive(!document.hidden);
    };
    void session.initialize();
    session.setActive(!document.hidden);
    const tick = window.setInterval(session.tick, SESSION_TIMING.tickMs);
    const autosave = window.setInterval(() => {
      if (!document.hidden) void session.save();
    }, SESSION_TIMING.autosaveMs);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(autosave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      session.setActive(false);
      void session.save();
    };
  }, [session]);
  return snapshot;
}
