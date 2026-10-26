import { ResourceGlyph } from '../world/ResourceGlyph';
import type { ProductionConfig } from '../../data/layers';
import { getProcessingDuration, getProductionSummary } from '../../domain/game';
import type { GameState } from '../../domain/game';
import { GameIcon } from '../components/GameIcon';
import { ProgressBar } from '../components/ProgressBar';
export function ProductionPanel({
  game,
  config,
}: {
  game: GameState;
  config: ProductionConfig;
}) {
  const production = getProductionSummary(game, config);
  const fraction =
    game.processingElapsedMs === null
      ? 0
      : game.processingElapsedMs / getProcessingDuration(game, config);
  return (
    <div className="production-readout" aria-label="Production stock">
      <div title={config.resource.name}>
        <svg className="game-icon" viewBox="-24 -24 48 48" aria-hidden="true">
          <ResourceGlyph resource={config.resource} x={0} y={0} />
        </svg>
        <span>
          <small>Raw</small>
          <b>
            {game.raw}
            <em>/{production.capacity}</em>
          </b>
        </span>
      </div>
      <GameIcon name="arrow" className="flow-arrow" />
      <div
        className="refinery-readout"
        title={
          production.processorBlocked ? 'Storage full' : 'Refinery progress'
        }
      >
        <GameIcon name="processing" />
        <ProgressBar label="Refinery" value={fraction} />
      </div>
      <GameIcon name="arrow" className="flow-arrow" />
      <div title={config.resource.refinedName}>
        <GameIcon name="storage" />
        <span>
          <small>Ready</small>
          <b>
            {game.refined}
            <em>/{production.capacity}</em>
          </b>
        </span>
      </div>
    </div>
  );
}
