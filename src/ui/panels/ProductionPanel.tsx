import { RESOURCE, UPGRADES } from '../../data/balance';
import {
  getProcessingDuration,
  getProductionSummary,
  getSaleValue,
  getUpgradeOffer,
} from '../../domain/game';
import type { GameState } from '../../domain/game';
import { ProgressBar } from '../components/ProgressBar';

export function ProductionPanel({
  game,
  onSell,
}: {
  game: GameState;
  onSell: () => void;
}) {
  const production = getProductionSummary(game);
  const saleValue = getSaleValue(game);
  const canUpgradeLimit =
    getUpgradeOffer(game, production.bottleneck).next !== undefined;
  const processProgress =
    game.processingElapsedMs === null
      ? 0
      : game.processingElapsedMs / getProcessingDuration(game);
  const processingStatus = production.processorBlocked
    ? 'Waiting for storage space'
    : game.processingElapsedMs === null
      ? 'Waiting for raw crystals'
      : game.running
        ? 'Refining cargo'
        : 'Refinery paused';
  return (
    <section className="pipeline" aria-label="Production chain">
      <p className="pipeline-route">
        Extract → Transport → Refine → Store → Sell
      </p>
      <div className="pipeline-grid">
        <article className="pipeline-stage">
          <h3>Raw intake</h3>
          <strong data-testid="raw-stock">
            {game.raw} / {production.capacity}
          </strong>
          <p>
            {production.dockBlocked
              ? 'Full · submarine waiting at dock'
              : 'Delivered crystals waiting to be refined'}
          </p>
          <ProgressBar
            label="Raw intake capacity"
            value={game.raw / production.capacity}
          />
        </article>
        <article className="pipeline-stage">
          <h3>Crystal refinery</h3>
          <strong>
            {game.processingElapsedMs === null ? 0 : RESOURCE.batchSize}{' '}
            <small>in process</small>
          </strong>
          <p>{processingStatus}</p>
          <ProgressBar label="Refinery progress" value={processProgress} />
        </article>
        <article className="pipeline-stage">
          <h3>Refined warehouse</h3>
          <strong data-testid="refined-stock">
            {game.refined} / {production.capacity}
          </strong>
          <p>
            {RESOURCE.refinedValue} CR per refined crystal · sell to free space
          </p>
          <ProgressBar
            label="Refined warehouse capacity"
            value={game.refined / production.capacity}
          />
        </article>
      </div>
      <div className="pipeline-action">
        <p>
          {production.storageFull
            ? `Storage is limiting output. Sell refined crystals${canUpgradeLimit ? ' or expand the warehouse' : ''}.`
            : `Current production limit: ${UPGRADES[production.bottleneck].name}${canUpgradeLimit ? '' : ' (maximum level)'}. ${production.bottleneck === 'processing' ? 'The refinery is slower than incoming deliveries.' : 'Extraction and transport limit the supply to your refinery.'}`}
        </p>
        <button disabled={saleValue === 0} onClick={onSell}>
          Sell refined · {saleValue} CR
        </button>
      </div>
    </section>
  );
}
