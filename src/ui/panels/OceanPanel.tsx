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
import { getUnlockOffer } from '../../domain/world';
import type { WorldState } from '../../domain/world';
import { GameIcon } from '../components/GameIcon';
import { ResourceGlyph } from '../world/ResourceGlyph';

const number = new Intl.NumberFormat('en-US');
type OceanView = 'map' | 'network' | 'prestige';
export function OceanPanel({
  world,
  session,
}: {
  world: WorldState;
  session: GameSession;
}) {
  const [view, setView] = useState<OceanView>('map');
  return (
    <div className="ocean-command">
      <nav className="ocean-views" aria-label="Ocean views">
        {(['map', 'network', 'prestige'] as const).map((id) => (
          <button
            key={id}
            aria-pressed={view === id}
            onClick={() => {
              setView(id);
            }}
          >
            {id === 'map' ? 'Map' : id === 'network' ? 'Network' : 'Prestige'}
          </button>
        ))}
      </nav>
      {view === 'map' && <OceanMap world={world} session={session} />}
      {view === 'network' && <Infrastructure world={world} session={session} />}
      {view === 'prestige' && <Prestige world={world} session={session} />}
    </div>
  );
}
function OceanMap({
  world,
  session,
}: {
  world: WorldState;
  session: GameSession;
}) {
  const count = LAYER_IDS.filter((id) => !!world.layers[id]).length;
  return (
    <section aria-label="Ocean map">
      <div className="ocean-section-meta">
        <span>SECTOR 01</span>
        <span>
          {count} / {LAYER_IDS.length} bases
        </span>
      </div>
      <div className="ocean-map">
        <svg
          className="ocean-map-contours"
          viewBox="0 0 320 450"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M-60 70Q190-90 380 80M-70 95Q190-60 380 105M-70 120Q190-30 380 130M-50 280Q70 150 250 290T380 250M-50 305Q70 175 250 315T380 275M-50 330Q70 200 250 340T380 300M-50 355Q70 225 250 365T380 325" />
          <path
            className="ocean-map-route"
            d="M48 45C48 90 94 80 94 133S48 170 48 221 94 260 94 309 48 350 48 397"
          />
        </svg>
        {LAYER_IDS.map((id, index) => {
          const definition = LAYERS[id];
          const offer = getUnlockOffer(world, id);
          const selected = world.selectedLayerId === id;
          return (
            <button
              key={id}
              className={`ocean-map-node${index % 2 ? ' offset' : ''}${selected ? ' current' : ''}${offer.unlocked ? ' established' : ' uncharted'}`}
              disabled={!offer.unlocked && !offer.canUnlock}
              aria-current={selected ? 'location' : undefined}
              aria-label={
                offer.unlocked
                  ? `Visit ${definition.name}`
                  : `Unlock ${definition.name}, ${number.format(offer.cost)} credits${offer.prerequisiteMet ? '' : ', previous depth required'}`
              }
              onClick={() => {
                if (offer.unlocked) session.select(id);
                else session.unlock(id);
              }}
            >
              <span className="ocean-map-marker">
                {offer.unlocked ? (
                  <svg viewBox="-24 -24 48 48" aria-hidden="true">
                    <ResourceGlyph
                      resource={definition.production.resource}
                      x={0}
                      y={0}
                      scale={0.8}
                    />
                  </svg>
                ) : (
                  <GameIcon name="lock" />
                )}
              </span>
              <span className="ocean-map-label">
                <small>
                  {number.format(definition.depthMeters)} m ·{' '}
                  {definition.production.resource.name}
                </small>
                <strong>{definition.name}</strong>
                <span>
                  {selected
                    ? 'Current base'
                    : offer.unlocked
                      ? 'Visit base'
                      : !offer.prerequisiteMet
                        ? 'Open previous depth'
                        : 'Establish base'}
                </span>
              </span>
              <span className="ocean-map-action">
                {offer.unlocked ? (
                  <GameIcon name={selected ? 'check' : 'arrow'} />
                ) : (
                  <>
                    <GameIcon name="coin" />
                    <b>{number.format(offer.cost)}</b>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
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
      <p className="ocean-note">Shared by every base. Resets on prestige.</p>
      {INFRASTRUCTURE_IDS.map((id) => {
        const definition = INFRASTRUCTURE[id];
        const offer = getInfrastructureOffer(world, id);
        return (
          <article
            className={`infrastructure-card${offer.affordable ? ' available' : ''}`}
            key={id}
          >
            <span className="infrastructure-symbol">
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
            <div className="infrastructure-info">
              <h3>{definition.name}</h3>
              <span>{definition.effect}</span>
            </div>
            <span className="infrastructure-level">
              {infrastructure[id]}/{definition.costs.length}
            </span>
            <div className="infrastructure-effect">
              <strong>
                {id === 'sonar' ? '−' : '+'}
                {offer.bonus}
                {definition.unit === '%' ? '%' : ` ${definition.unit}`}
              </strong>
              {offer.cost !== null && (
                <span>
                  → {id === 'sonar' ? '−' : '+'}
                  {offer.bonus + definition.bonusPerLevel}
                  {definition.unit === '%' ? '%' : ` ${definition.unit}`}
                </span>
              )}
            </div>
            <button
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
              {!offer.unlocked ? (
                <>
                  <GameIcon name="lock" />
                  Reach 180 m
                </>
              ) : offer.cost === null ? (
                <>
                  <GameIcon name="check" />
                  Complete
                </>
              ) : (
                <>
                  <span>Upgrade</span>
                  <span className="ocean-price">
                    <GameIcon name="coin" />
                    {number.format(offer.cost)}
                  </span>
                </>
              )}
            </button>
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
  return (
    <section className="prestige-panel" aria-label="Prestige">
      <div className="prestige-crest">
        <GameIcon name="prestige" />
        <span>RANK {offer.rank}</span>
      </div>
      <h3>A new descent</h3>
      <p className="ocean-note">Start fresh. Build a stronger ocean network.</p>
      <div className="prestige-bonus">
        <small>Permanent sale bonus</small>
        <strong>
          +{offer.bonus}%
          {offer.rank < PRESTIGE.maxRank && <span> → +{offer.nextBonus}%</span>}
        </strong>
      </div>
      <div className="prestige-requirements">
        <div>
          <GameIcon name={offer.depthReady ? 'check' : 'depth'} />
          <span>
            Reach {number.format(LAYERS[PRESTIGE.requiredLayer].depthMeters)} m
          </span>
        </div>
        <div>
          <GameIcon
            name={world.credits >= PRESTIGE.requiredCredits ? 'check' : 'coin'}
          />
          <span>Keep {number.format(PRESTIGE.requiredCredits)} credits</span>
        </div>
      </div>
      <div className="prestige-policy">
        <div>
          <small>Resets</small>
          <p>
            Credits, depths, upgrades, crew, research, missions, expeditions and
            infrastructure.
          </p>
        </div>
        <div>
          <small>Keeps</small>
          <p>Prestige rank, profile and sign-in methods.</p>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {offer.rank >= PRESTIGE.maxRank ? (
        <p className="ocean-note">Maximum rank reached.</p>
      ) : !confirming ? (
        <button
          className="wide-button"
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
          className="prestige-confirm"
          role="group"
          aria-label="Confirm prestige"
        >
          <strong>Reset this run?</strong>
          <p>Everything in “Resets” will be cleared.</p>
          <button
            className="wide-button"
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
            className="text-button"
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
