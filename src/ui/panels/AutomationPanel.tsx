import { SPECIALIST_IDS, SPECIALISTS } from '../../data/automation';
import type { SpecialistId } from '../../data/automation';
import { getSpecialistOffer } from '../../domain/world';
import type { WorldState } from '../../domain/world';
import { getAutomationOffer } from '../../domain/world';
import { GameIcon } from '../components/GameIcon';
import { ProgressBar } from '../components/ProgressBar';
export function AutomationPanel({
  world,
  onUpgrade,
  onToggle,
  onSpecialist,
}: {
  world: WorldState;
  onUpgrade: () => void;
  onToggle: () => void;
  onSpecialist: (id: SpecialistId) => void;
}) {
  const offer = getAutomationOffer(world);
  const layer = world.layers[world.selectedLayerId];
  const automation = layer?.automation;
  return (
    <div className="crew-roster">
      <p className="crew-scope">Assigned to this base</p>
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
            {offer.level ? 'Next' : 'Sells every'} {offer.nextIntervalMs / 1000}
            s
          </small>
        )}
      </div>
      {SPECIALIST_IDS.map((id) => {
        const definition = SPECIALISTS[id];
        const specialist = getSpecialistOffer(world, id);
        return (
          <article className="crew-card specialist-card" key={id}>
            <div className="crew-intro">
              <GameIcon name={definition.icon} />
              <div className="crew-description">
                <h3>
                  {definition.name} <small>Lv {specialist.level}</small>
                </h3>
                <p>{definition.description}</p>
              </div>
            </div>
            <div className="specialist-benefit">
              <strong>
                +{specialist.bonus}
                {definition.unit}
              </strong>
              {specialist.cost !== null && (
                <span>
                  Next +{specialist.bonus + definition.bonusPerLevel}
                  {definition.unit}
                </span>
              )}
            </div>
            <div className="crew-actions">
              <button
                className="crew-upgrade"
                disabled={!specialist.affordable}
                onClick={() => {
                  onSpecialist(id);
                }}
                aria-label={
                  specialist.cost === null
                    ? `${definition.name}, max level`
                    : `${specialist.level === 0 ? 'Hire' : 'Train'} ${definition.name}`
                }
              >
                {specialist.cost === null ? (
                  <>
                    <GameIcon name="check" />
                    Max level
                  </>
                ) : (
                  <>
                    {specialist.level === 0 ? 'Hire' : 'Train'}
                    <GameIcon name="coin" />
                    {specialist.cost.toLocaleString('en-US')}
                  </>
                )}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
