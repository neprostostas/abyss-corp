import { useSyncExternalStore } from 'react';
import type { LiveOps } from '../../application/LiveOps';
import type { GameSession } from '../../application/GameSession';
import type { WorldState } from '../../domain/world';
import { getLiveEventOffer } from '../../domain/liveEvents';
import { ProgressBar } from '../components/ProgressBar';
import { GameIcon } from '../components/GameIcon';
function remainingTime(ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  return minutes >= 1440
    ? `${Math.floor(minutes / 1440)}d ${Math.floor(minutes / 60) % 24}h`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
export function LiveOpsPanel({
  liveOps,
  session,
  world,
  mode = 'event',
  onNavigate,
}: {
  liveOps: LiveOps;
  session: GameSession;
  world: WorldState;
  mode?: 'event' | 'privacy';
  onNavigate?: (mode: 'research' | 'missions') => void;
}) {
  const state = useSyncExternalStore(liveOps.subscribe, liveOps.getSnapshot);
  const event = state.config?.event;
  const offer = event ? getLiveEventOffer(world, event, state.now) : null;
  if (mode === 'privacy')
    return (
      <section className="settings-section">
        <label className="setting-toggle">
          <span>Share gameplay usage</span>
          <input
            type="checkbox"
            checked={state.analyticsConsent}
            onChange={(e) => {
              liveOps.setConsent(e.target.checked);
            }}
          />
        </label>
        <details>
          <summary>What gets shared?</summary>
          <p>
            Optional game actions, depth and experiment group go to this game’s
            server. No names, emails or save contents. Turning off clears queued
            actions and stops new sharing. Received data is cleaned up after 30
            days.
          </p>
        </details>
        {state.analyticsError && <p role="status">{state.analyticsError}</p>}
      </section>
    );
  return (
    <div className="event-panel">
      {event && offer ? (
        <>
          <div className="event-art">
            <span className="event-orbit" />
            <GameIcon name="events" />
            <span className="event-timer">
              {state.now < event.startsAt
                ? `In ${remainingTime(event.startsAt - state.now)}`
                : offer.active
                  ? `${remainingTime(event.endsAt - state.now)} left`
                  : 'Ended'}
            </span>
          </div>
          <h3>{event.name}</h3>
          <strong className="event-reward">
            <GameIcon name="coin" />
            {event.reward}
          </strong>
          <div className="event-objectives">
            <span>
              <GameIcon name="depth" />
              Outposts{' '}
              <b>
                {Math.min(offer.outposts, event.requiredOutposts)}/
                {event.requiredOutposts}
              </b>
            </span>
            <span>
              <GameIcon name="robot" />
              Sales modules{' '}
              <b>
                {Math.min(offer.modules, event.requiredModules)}/
                {event.requiredModules}
              </b>
            </span>
          </div>
          <ProgressBar
            label="Event progress"
            value={
              (Math.min(offer.outposts, event.requiredOutposts) +
                Math.min(offer.modules, event.requiredModules)) /
              (event.requiredOutposts + event.requiredModules)
            }
          />
          <button
            className="wide-button"
            disabled={state.status !== 'ready' || !offer.canClaim}
            onClick={() => {
              liveOps.claimEvent(session);
            }}
          >
            {offer.claimed
              ? 'Collected'
              : !offer.active
                ? state.now < event.startsAt
                  ? 'Coming soon'
                  : 'Event ended'
                : 'Collect reward'}
          </button>
          {offer.complete && !offer.claimed && !offer.rewardFits && (
            <p>Spend credits to make room for the reward.</p>
          )}
        </>
      ) : (
        <div className="empty-panel">
          <GameIcon name="events" />
          <p>
            {state.status === 'loading' ? 'Connecting…' : 'No event available'}
          </p>
        </div>
      )}
      {state.error && (
        <p className="compact-error" role="status">
          Event unavailable. Try refreshing.
        </p>
      )}
      <div className="event-footer">
        <button
          className="text-button"
          disabled={state.status === 'loading'}
          onClick={() => {
            void liveOps.refresh();
          }}
        >
          Refresh
        </button>
        {state.config && onNavigate && (
          <button
            className="text-button"
            onClick={() => {
              onNavigate(
                state.variant === 'challenger' ? 'missions' : 'research',
              );
            }}
          >
            {state.variant === 'challenger' ? 'Missions' : 'Research'}
            <GameIcon name="arrow" />
          </button>
        )}
      </div>
    </div>
  );
}
