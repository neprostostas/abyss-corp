import { useEffect } from 'react';
import type { LiveOps } from '../application/LiveOps';
import { LIVE_OPS_POLL_MS, TELEMETRY_FLUSH_MS } from '../data/liveOps';
import type { SaveSync } from '../application/SaveSync';
import { GameScreen } from '../ui/screens/GameScreen';
import type { GameSession } from '../application/GameSession';

export function App({
  session,
  sync,
  liveOps,
}: {
  session: GameSession;
  sync: SaveSync;
  liveOps: LiveOps;
}) {
  useEffect(() => {
    void liveOps.refresh();
    const time = window.setInterval(liveOps.tick, 1000);
    const refresh = window.setInterval(() => {
      if (!document.hidden) void liveOps.refresh();
    }, LIVE_OPS_POLL_MS);
    const flush = window.setInterval(() => {
      void liveOps.flush();
    }, TELEMETRY_FLUSH_MS);
    const visibility = () => {
      if (!document.hidden) void liveOps.refresh();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearInterval(time);
      window.clearInterval(refresh);
      window.clearInterval(flush);
      document.removeEventListener('visibilitychange', visibility);
      liveOps.stop();
    };
  }, [liveOps]);
  return <GameScreen session={session} sync={sync} liveOps={liveOps} />;
}
