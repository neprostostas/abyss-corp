import type { WorldState } from '../../domain/world';
import { getAutomationOffer } from '../../domain/world';
import { GameIcon } from '../components/GameIcon';
import { ProgressBar } from '../components/ProgressBar';
export function AutomationPanel({
  world,
  onUpgrade,
  onToggle,
}: {
  world: WorldState;
  onUpgrade: () => void;
  onToggle: () => void;
}) {
  const offer = getAutomationOffer(world);
  const layer = world.layers[world.selectedLayerId];
  const automation = layer?.automation;
  return (
    <div className="crew-card">
      <div className="crew-portrait">
        <div className="robot-face">
          <span />
          <span />
          <i />
        </div>
        <span className="crew-level">LV {offer.level}</span>
      </div>
      <h3>Cargo pilot</h3>
      <p>Auto-sells your cargo, even while you’re away.</p>
      {automation && offer.intervalMs && (
        <div className="crew-status">
          <span
            className={
              automation.enabled && layer?.running ? 'active-status' : ''
            }
          >
            {!automation.enabled
              ? 'Off duty'
              : !layer?.running
                ? 'Outpost paused'
                : 'On duty'}
          </span>
          <b>Every {offer.intervalMs / 1000}s</b>
          <ProgressBar
            label="Next sale"
            value={automation.elapsedMs / offer.intervalMs}
          />
        </div>
      )}
      <button
        className="wide-button"
        disabled={!offer.affordable}
        onClick={onUpgrade}
      >
        {offer.cost === null ? (
          <>
            <GameIcon name="check" />
            Max level
          </>
        ) : (
          <>
            {offer.level === 0 ? 'Hire' : 'Upgrade'}
            <GameIcon name="coin" />
            {offer.cost}
          </>
        )}
      </button>
      {offer.nextIntervalMs && (
        <small className="crew-next">
          {offer.level ? 'Next: ' : ''}one sale every{' '}
          {offer.nextIntervalMs / 1000}s
        </small>
      )}
      {automation && (
        <button
          className="secondary-button wide-button"
          onClick={onToggle}
          aria-pressed={automation.enabled}
        >
          {automation.enabled ? 'Take off duty' : 'Put on duty'}
        </button>
      )}
    </div>
  );
}
