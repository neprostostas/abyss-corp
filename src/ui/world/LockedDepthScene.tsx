import { LAYERS, LAYER_IDS } from '../../data/layers';
import type { LayerId } from '../../data/layers';
import { getUnlockOffer } from '../../domain/world';
import type { WorldState } from '../../domain/world';
import { GameIcon } from '../components/GameIcon';

/** DepthScene owns travel; this view only presents the selected unlock gate. */
export function LockedDepthScene({
  depth,
  world,
  onClose,
  onUnlock,
  onExplore,
}: {
  depth: LayerId;
  world: WorldState;
  onClose: () => void;
  onUnlock: (id: LayerId) => void;
  onExplore?: ((id: LayerId) => void) | undefined;
}) {
  const definition = LAYERS[depth];
  const offer = getUnlockOffer(world, depth);
  const previous = LAYER_IDS[LAYER_IDS.indexOf(depth) - 1];
  const shortfall = Math.max(0, offer.cost - world.credits);
  return (
    <section
      className="locked-depth-scene"
      aria-label={`${definition.name}, locked depth`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="locked-depth-motion">
        <div className="locked-depth-frame">
          <div
            className="locked-depth-content"
            data-digits={String(definition.depthMeters).length}
          >
            <GameIcon name="lock" className="locked-depth-emblem" />
            <span
              className="locked-depth-number"
              aria-label={`${String(definition.depthMeters)} meters`}
            >
              {definition.depthMeters}
              <small>m</small>
            </span>

            <div className="locked-depth-actions">
              {!offer.prerequisiteMet && previous ? (
                <button
                  className="locked-depth-prerequisite"
                  disabled={!onExplore}
                  onClick={() => {
                    onExplore?.(previous);
                  }}
                >
                  <GameIcon name="depth" />
                  <span>{LAYERS[previous].name} first</span>
                  <GameIcon name="arrow" />
                </button>
              ) : (
                <>
                  <button
                    className="locked-depth-unlock"
                    disabled={!offer.canUnlock}
                    aria-label={`Unlock ${definition.name}, ${offer.cost.toLocaleString('en-US')} credits`}
                    aria-describedby={
                      shortfall > 0 ? `depth-shortfall-${depth}` : undefined
                    }
                    onClick={() => {
                      onUnlock(depth);
                    }}
                  >
                    <span>
                      <GameIcon name={offer.canUnlock ? 'depth' : 'lock'} />{' '}
                      Unlock
                    </span>
                    <span>
                      <GameIcon name="coin" />
                      {offer.cost.toLocaleString('en-US')}
                    </span>
                  </button>
                  {shortfall > 0 && (
                    <small
                      id={`depth-shortfall-${depth}`}
                      className="locked-depth-shortfall"
                    >
                      {shortfall.toLocaleString('en-US')} more credits
                    </small>
                  )}
                </>
              )}
              <button className="locked-depth-back" onClick={onClose}>
                <GameIcon name="arrow" /> Back to base
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
