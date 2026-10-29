import { memo } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { OfflineReport } from '../../application/GameSession';
import { Brand } from './Brand';
import { GameIcon } from './GameIcon';
const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
export const GameHud = memo(function GameHud({
  credits,
  offlineReport,
  ocean,
  surfaceReady,
  hasError,
  profileOpen,
  profileTrigger,
  walletRef,
  onDismiss,
  onProfile,
}: {
  credits: number;
  offlineReport: OfflineReport | null;
  ocean: boolean;
  surfaceReady: boolean;
  hasError: boolean;
  profileOpen: boolean;
  profileTrigger: ReactNode;
  walletRef: RefObject<HTMLDivElement | null>;
  onDismiss: () => void;
  onProfile: () => void;
}) {
  return (
    <header className="game-hud" inert={ocean && !surfaceReady}>
      <div className="game-brand">
        <Brand />
      </div>
      {!ocean && (
        <div
          ref={walletRef}
          className="hud-wallet"
          role="group"
          aria-label={`Credits: ${credits.toLocaleString('en-US')}`}
          title={`${credits.toLocaleString('en-US')} credits`}
        >
          {offlineReport && offlineReport.credits > 0 ? (
            <div
              className="offline-toast"
              role="status"
              aria-label={`${compact.format(offlineReport.credits)} credits earned while away`}
              title="Offline earnings"
            >
              <GameIcon name="coin" />
              <strong>+{compact.format(offlineReport.credits)}</strong>
              <button
                className="icon-button"
                aria-label="Dismiss offline report"
                onClick={onDismiss}
              >
                <GameIcon name="close" />
              </button>
            </div>
          ) : (
            <>
              <span className="coin-medallion">
                <GameIcon name="coin" />
              </span>
              <strong>{compact.format(credits)}</strong>
            </>
          )}
        </div>
      )}
      <button
        className={`icon-button settings-trigger${hasError ? ' has-error' : ''}`}
        aria-label="Profile"
        aria-expanded={profileOpen}
        onClick={onProfile}
      >
        {profileTrigger ?? <GameIcon name="profile" />}
      </button>
    </header>
  );
});
