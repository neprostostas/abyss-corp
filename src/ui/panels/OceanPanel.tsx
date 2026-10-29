import { LAYERS, LAYER_IDS } from '../../data/layers';
import type { WorldState } from '../../domain/world';
import { GameIcon } from '../components/GameIcon';
import { OceanSurfaceArt } from '../world/OceanSurfaceArt';

export function OceanPanel({
  world,
  onDive,
}: {
  world: WorldState;
  onDive?: (() => void) | undefined;
}) {
  const count = LAYER_IDS.filter((id) => !!world.layers[id]).length;
  const current = LAYERS[world.selectedLayerId];
  return (
    <section className="ocean-world" aria-label="Ocean map">
      <header className="ocean-world-heading">
        <span className="ocean-heading-icon">
          <GameIcon name="map" />
        </span>
        <h1>Ocean</h1>
      </header>
      <div className="ocean-regions">
        <button
          className="surface-region ocean-home"
          aria-current="location"
          onClick={onDive}
          aria-label="Dive to current base"
        >
          <span className="ocean-region-topline">
            <span>01 / Home waters</span>
            <span className="ocean-region-status">
              <i aria-label="Active region" />
            </span>
          </span>
          <span className="ocean-region-art">
            <OceanSurfaceArt />
          </span>
          <span className="ocean-home-details">
            <span
              className="ocean-depth-progress"
              aria-label={`${String(count)} of ${String(LAYER_IDS.length)} depths unlocked`}
            >
              {LAYER_IDS.map((id) => (
                <span
                  key={id}
                  className={world.layers[id] ? 'is-discovered' : ''}
                />
              ))}
              <small>
                {count} / {LAYER_IDS.length} depths
              </small>
            </span>
            <strong className="ocean-current-base">{current.name}</strong>
            <span className="ocean-current-depth">{current.depthMeters} m</span>
          </span>
        </button>
        <div className="ocean-frontier">
          {(
            [
              ['polar', '02', 'Polar sea'],
              ['ember', '03', 'Ember basin'],
            ] as const
          ).map(([region, number, name]) => (
            <button
              key={region}
              className={`surface-region ocean-uncharted ocean-${region}`}
              aria-disabled="true"
              aria-label={`${name}, uncharted`}
            >
              <span className="ocean-region-art">
                <OceanSurfaceArt region={region} />
              </span>
              <span className="ocean-frontier-copy">
                <small>{number} / Uncharted</small>
                <strong>{name}</strong>
              </span>
              <span className="ocean-region-lock">
                <GameIcon name="lock" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
