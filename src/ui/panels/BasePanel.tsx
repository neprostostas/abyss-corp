import { useRef, useState } from 'react';
import type { GameSession } from '../../application/GameSession';
import {
  INFRASTRUCTURE,
  INFRASTRUCTURE_IDS,
  PRESTIGE,
} from '../../data/campaign';
import { LAYERS, LAYER_IDS } from '../../data/layers';
import {
  getCampaign,
  getInfrastructureOffer,
  getPrestigeOffer,
} from '../../domain/campaign';
import type { WorldState } from '../../domain/world';
import { GameIcon } from '../components/GameIcon';
import { ProgressBar } from '../components/ProgressBar';

const number = new Intl.NumberFormat('en-US');
export function BasePanel({
  world,
  session,
  children,
}: {
  world: WorldState;
  session: GameSession;
  children?: React.ReactNode;
}) {
  const [view, setView] = useState<'crew' | 'network' | 'prestige'>(
    children ? 'crew' : 'network',
  );
  return (
    <div className="base-workshop">
      <nav className="base-tabs" aria-label="Base management">
        {(['crew', 'network', 'prestige'] as const)
          .filter((id) => id !== 'crew' || Boolean(children))
          .map((id) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => {
                setView(id);
              }}
            >
              <GameIcon
                name={
                  id === 'crew'
                    ? 'robot'
                    : id === 'network'
                      ? 'trade-network'
                      : 'prestige'
                }
              />
              {id === 'crew'
                ? 'Crew'
                : id === 'network'
                  ? 'Network'
                  : 'Prestige'}
            </button>
          ))}
      </nav>
      {view === 'crew' && children}
      {view === 'network' && <Infrastructure world={world} session={session} />}
      {view === 'prestige' && <Prestige world={world} session={session} />}
    </div>
  );
}
function Infrastructure({
  world,
  session,
}: {
  world: WorldState;
  session: GameSession;
}) {
  const { infrastructure } = getCampaign(world);
  return (
    <section className="infrastructure-list" aria-label="Shared infrastructure">
      <header className="network-heading">
        <span>All bases</span>
        <small>Shared upgrades</small>
      </header>
      {!world.layers['golden-trench'] && (
        <div className="network-unlock">
          <GameIcon name="lock" />
          <span>Unlock at 180 m</span>
        </div>
      )}
      {INFRASTRUCTURE_IDS.map((id) => {
        const definition = INFRASTRUCTURE[id];
        const offer = getInfrastructureOffer(world, id);
        return (
          <article
            className={`infrastructure-card${offer.affordable ? ' available' : ''}`}
            key={id}
          >
            <div className="network-facility">
              <span className={`network-icon network-icon-${id}`}>
                <GameIcon
                  name={
                    id === 'depot'
                      ? 'storage'
                      : id === 'exchange'
                        ? 'trade-network'
                        : 'sonar'
                  }
                />
              </span>
              <div className="network-name">
                <h3>{definition.name}</h3>
                <span>
                  {id === 'depot'
                    ? 'Storage'
                    : id === 'exchange'
                      ? 'Sale value'
                      : 'Depth unlock cost'}
                </span>
              </div>
              <span
                className="network-level"
                aria-label={`Level ${String(offer.level)} of ${String(definition.costs.length)}`}
              >
                {definition.costs.map((_, index) => (
                  <i
                    key={index}
                    className={index < infrastructure[id] ? 'is-filled' : ''}
                  />
                ))}
              </span>
            </div>
            {offer.unlocked && (
              <div className="network-gain">
                <span className="network-current">
                  {id === 'sonar' ? '−' : '+'}
                  {offer.bonus}
                  {definition.unit === '%' ? '%' : ' slots'}
                </span>
                {offer.cost !== null && (
                  <>
                    <GameIcon name="arrow" />
                    <strong>
                      {id === 'sonar' ? '−' : '+'}
                      {offer.bonus + definition.bonusPerLevel}
                      {definition.unit === '%' ? '%' : ' slots'}
                    </strong>
                  </>
                )}
              </div>
            )}
            {offer.unlocked && (
              <button
                className={`network-buy${offer.cost === null ? ' network-complete' : ''}`}
                disabled={!offer.affordable}
                onClick={() => {
                  session.infrastructure(id);
                }}
                aria-label={
                  offer.cost === null
                    ? `${definition.name} complete`
                    : `Upgrade ${definition.name}, ${number.format(offer.cost)} credits`
                }
              >
                {offer.cost === null ? (
                  <>
                    <GameIcon name="check" />
                    Complete
                  </>
                ) : (
                  <>
                    <span>Upgrade</span>
                    <span className="network-price">
                      <GameIcon name="coin" />
                      {number.format(offer.cost)}
                    </span>
                  </>
                )}
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
function Prestige({
  world,
  session,
}: {
  world: WorldState;
  session: GameSession;
}) {
  const offer = getPrestigeOffer(world);
  const [confirmation, setConfirmation] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const confirming = confirmation === offer.rank;
  const maxed = offer.rank >= PRESTIGE.maxRank;
  const deepest = Math.max(
    ...LAYER_IDS.filter((id) => world.layers[id]).map(
      (id) => LAYERS[id].depthMeters,
    ),
  );
  const requiredDepth = LAYERS[PRESTIGE.requiredLayer].depthMeters;
  return (
    <section className="rank-panel" aria-label="Prestige">
      <div className="rank-hero">
        <span className="rank-emblem">
          <GameIcon name="prestige" />
        </span>
        <div className="rank-title">
          <small>Prestige rank</small>
          <strong>{String(offer.rank).padStart(2, '0')}</strong>
        </div>
        {!maxed && (
          <span className="rank-next">
            Next <b>{String(offer.rank + 1).padStart(2, '0')}</b>
          </span>
        )}
      </div>
      <div className="rank-reward">
        <span>Permanent sale bonus</span>
        <div>
          <strong className={maxed ? 'rank-reward-max' : ''}>
            +{offer.bonus}%
          </strong>
          {!maxed && (
            <>
              <GameIcon name="arrow" />
              <strong className="rank-reward-next">+{offer.nextBonus}%</strong>
            </>
          )}
        </div>
        {!maxed && <small>+{PRESTIGE.bonusPerRank}% every new run</small>}
      </div>
      {!maxed && (
        <div className="rank-goals">
          <div className={`rank-goal${offer.depthReady ? ' is-ready' : ''}`}>
            <GameIcon name={offer.depthReady ? 'check' : 'depth'} />
            <div>
              <span>Reach {number.format(requiredDepth)} m</span>
              <ProgressBar
                label="Prestige depth"
                value={deepest / requiredDepth}
              />
            </div>
            <small>{number.format(Math.min(deepest, requiredDepth))} m</small>
          </div>
          <div
            className={`rank-goal${world.credits >= offer.requiredCredits ? ' is-ready' : ''}`}
          >
            <GameIcon
              name={world.credits >= offer.requiredCredits ? 'check' : 'coin'}
            />
            <div>
              <span>{number.format(offer.requiredCredits)} credits</span>
              <ProgressBar
                label="Prestige credits"
                value={world.credits / offer.requiredCredits}
              />
            </div>
            <small>
              {number.format(Math.min(world.credits, offer.requiredCredits))}
            </small>
          </div>
        </div>
      )}
      {!maxed && (
        <div
          className="prestige-checklist"
          aria-label="Full completion required"
        >
          <h3>Complete this run</h3>
          <p>
            Max every base and collect every reward. Each new rank raises the
            credit goal by 60%.
          </p>
          {offer.requirements.map((item) => (
            <div
              key={item.id}
              className={item.current === item.total ? 'is-ready' : ''}
            >
              <GameIcon name={item.current === item.total ? 'check' : 'lock'} />
              <span>{item.label}</span>
              <b>
                {item.current}/{item.total}
              </b>
            </div>
          ))}
        </div>
      )}
      {!maxed && !confirming && (
        <details className="rank-details">
          <summary>
            What resets? <GameIcon name="refresh" />
          </summary>
          <p>
            Resets credits, depths, upgrades, crew, research, missions,
            expeditions and infrastructure.
          </p>
          <p>Keeps prestige rank, profile and sign-in methods.</p>
        </details>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {maxed ? (
        <div className="rank-complete">
          <GameIcon name="check" /> Maximum rank
        </div>
      ) : !confirming ? (
        <button
          className="rank-action"
          disabled={!offer.canPrestige}
          onClick={() => {
            setConfirmation(offer.rank);
            setError(null);
          }}
        >
          Prepare new run
        </button>
      ) : (
        <div
          className="rank-confirm"
          role="group"
          aria-label="Confirm prestige"
        >
          <strong>Reset this run?</strong>
          <p>
            Credits, depths, upgrades, crew, research, missions, expeditions and
            infrastructure will reset. Your rank and profile stay.
          </p>
          <button
            className="rank-action"
            disabled={busy || !offer.canPrestige}
            onClick={() => {
              if (running.current) return;
              running.current = true;
              setBusy(true);
              setError(null);
              void session
                .prestige(confirmation)
                .then(() => {
                  setConfirmation(null);
                })
                .catch((failure: unknown) => {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : 'Could not start a new run. Try again.',
                  );
                })
                .finally(() => {
                  running.current = false;
                  setBusy(false);
                });
            }}
          >
            {busy
              ? 'Saving new run…'
              : `Reset & gain +${String(PRESTIGE.bonusPerRank)}%`}
          </button>
          <button
            className="rank-cancel"
            disabled={busy}
            onClick={() => {
              setConfirmation(null);
            }}
          >
            Keep playing
          </button>
        </div>
      )}
    </section>
  );
}
