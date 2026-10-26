import { ResourceGlyph } from '../world/ResourceGlyph';
import { LAYERS, LAYER_IDS } from '../../data/layers';
import type { LayerId } from '../../data/layers';
import { getUnlockOffer } from '../../domain/world';
import type { WorldState } from '../../domain/world';
import { GameIcon } from '../components/GameIcon';
export function DepthNavigation({
  world,
  onSelect,
  onUnlock,
}: {
  world: WorldState;
  onSelect: (id: LayerId) => void;
  onUnlock: (id: LayerId) => void;
}) {
  return (
    <nav className="depth-rail" aria-label="Depths">
      <span className="depth-line" />
      {LAYER_IDS.map((id, index) => {
        const layer = LAYERS[id];
        const offer = getUnlockOffer(world, id);
        const selected = id === world.selectedLayerId;
        return (
          <button
            key={id}
            className={`depth-node depth-${String(index)}${selected ? ' selected' : ''}${offer.canUnlock ? ' can-unlock' : ''}${offer.unlocked ? '' : ' locked'}`}
            onClick={() => {
              if (offer.unlocked) onSelect(id);
              else onUnlock(id);
            }}
            disabled={!offer.unlocked && !offer.canUnlock}
            aria-label={
              offer.unlocked
                ? layer.name
                : `Unlock ${layer.name}, ${String(offer.cost)} credits`
            }
            aria-current={selected ? 'location' : undefined}
            title={
              offer.unlocked
                ? layer.name
                : `${layer.name} · ${String(offer.cost)} CR${offer.prerequisiteMet ? '' : ' · unlock previous depth first'}`
            }
          >
            <span className="depth-orb">
              {offer.canUnlock && (
                <span className="depth-ready" aria-label="New depth available">
                  !
                </span>
              )}
              {offer.unlocked ? (
                <svg
                  className="depth-resource"
                  viewBox="-24 -24 48 48"
                  aria-hidden="true"
                >
                  <ResourceGlyph
                    resource={layer.production.resource}
                    x={0}
                    y={0}
                    scale={1}
                  />
                </svg>
              ) : (
                <GameIcon name="lock" />
              )}
            </span>
            <b>
              {layer.depthMeters}
              <small>m</small>
            </b>
            {!offer.unlocked && (
              <span className="depth-price">
                <GameIcon name="coin" />
                {offer.cost}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
