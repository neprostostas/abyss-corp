import { EXPEDITIONS, EXPEDITION_TRADE_BONUS } from '../../data/expeditions';
import { LAYERS } from '../../data/layers';
import { getExpeditionOffer } from '../../domain/expeditions';
import type { WorldState } from '../../domain/world';
import { ProgressBar } from '../components/ProgressBar';
import { GameIcon } from '../components/GameIcon';
export function ExpeditionsPanel({
  world,
  onStart,
  onClaim,
}: {
  world: WorldState;
  onStart: () => void;
  onClaim: () => void;
}) {
  const offer = getExpeditionOffer(world);
  if (!offer.unlocked && offer.state.completed === 0 && !offer.state.active)
    return null;
  if (!offer.definition)
    return (
      <section className="expedition-card expedition-complete">
        <GameIcon name="trophy" />
        <h3>Midnight rift charted</h3>
        <p>
          {EXPEDITIONS.length} expeditions completed · Cargo +
          {EXPEDITIONS.length * EXPEDITION_TRADE_BONUS}%
        </p>
      </section>
    );
  return (
    <section className="expedition-card" aria-label="Deep-sea expedition">
      <small>
        Expedition {offer.state.completed + 1} / {EXPEDITIONS.length}
      </small>
      <h3>{offer.definition.name}</h3>
      <p>
        {offer.state.active
          ? 'Pilots supply the expedition before selling cargo.'
          : 'Send cargo from the listed bases.'}
      </p>
      {offer.sourceIds.map((id) => (
        <div className="expedition-cargo" key={id}>
          <span>{LAYERS[id].production.resource.name}</span>
          <b>
            {offer.state.delivered[id] ?? 0} / {offer.definition?.targets[id]}
          </b>
          <ProgressBar
            label={`${LAYERS[id].production.resource.name} delivered`}
            value={
              (offer.state.delivered[id] ?? 0) /
              (offer.definition?.targets[id] ?? 1)
            }
          />
        </div>
      ))}
      {!offer.unlocked && offer.state.completed >= 3 && (
        <p className="form-notice">
          {offer.sourceIds
            .filter((id) => !world.layers[id])
            .map(
              (id) =>
                `Reach ${LAYERS[id].depthMeters.toLocaleString('en-US')} m`,
            )
            .join(' · ') || 'Hire cargo pilots at the listed bases.'}
        </p>
      )}
      {!offer.pilotsReady && !offer.ready && offer.unlocked && (
        <p className="form-notice">
          Put the listed pilots on duty to supply cargo.
        </p>
      )}
      {offer.ready ? (
        <button className="wide-button" onClick={onClaim}>
          Claim · Cargo +{EXPEDITION_TRADE_BONUS}%
        </button>
      ) : !offer.state.active ? (
        <button
          className="wide-button"
          disabled={!offer.canStart}
          onClick={onStart}
        >
          Start expedition
        </button>
      ) : (
        <span className="expedition-status" role="status">
          {offer.pilotsReady ? 'Supplying cargo' : 'Waiting for pilots'}
        </span>
      )}
      {offer.state.completed > 0 && (
        <small>
          Run cargo bonus: +{offer.state.completed * EXPEDITION_TRADE_BONUS}%
        </small>
      )}
    </section>
  );
}
