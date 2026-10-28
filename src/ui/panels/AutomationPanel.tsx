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
      <div className="crew-intro">
        <div className="crew-description">
          <h3>
            Cargo pilot <small>Lv {offer.level}</small>
          </h3>
          <p>Automatic sales · works offline</p>
        </div>
      </div>
      {automation && offer.intervalMs && (
        <div className="crew-status">
          <span
            className={
              automation.enabled && layer.running ? 'active-status' : ''
            }
          >
            {!automation.enabled
              ? 'Off duty'
              : !layer.running
                ? 'Paused'
                : 'On duty'}
          </span>
          <b>{offer.intervalMs / 1000}s / sale</b>
          <ProgressBar
            label="Next sale"
            value={automation.elapsedMs / offer.intervalMs}
          />
        </div>
      )}
      <div className="crew-actions">
        <button
          className="crew-upgrade"
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
        {automation && (
          <button
            className="crew-toggle"
            onClick={onToggle}
            aria-pressed={automation.enabled}
            aria-label="Automatic sales"
          >
            <span>{automation.enabled ? 'On' : 'Off'}</span>
            <i aria-hidden="true" />
          </button>
        )}
      </div>
      {offer.nextIntervalMs && (
        <small className="crew-next">
          {offer.level ? 'Next' : 'Sells every'} {offer.nextIntervalMs / 1000}s
        </small>
      )}
    </div>
  );
}
