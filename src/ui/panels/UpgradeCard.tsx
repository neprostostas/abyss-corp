import { MachinePortrait } from '../components/MachinePortrait';
import type { ProductionConfig } from '../../data/layers';
import { getUpgradeOffer } from '../../domain/game';
import type { GameState, UpgradeId } from '../../domain/game';
import { GameIcon } from '../components/GameIcon';
const names = {
  mining: 'Drill',
  transport: 'Submarine',
  processing: 'Refinery',
  storage: 'Storage',
};
export function UpgradeCard({
  id,
  game,
  config,
  onUpgrade,
  selected = false,
  limiting = false,
  guided = false,
}: {
  id: UpgradeId;
  game: GameState;
  config: ProductionConfig;
  onUpgrade: (id: UpgradeId) => void;
  selected?: boolean;
  limiting?: boolean;
  guided?: boolean;
}) {
  const { current, next, affordable } = getUpgradeOffer(game, id, config);
  const format = (value: number) =>
    id === 'storage' ? String(value) : `${(value / 1000).toFixed(1)}s`;
  return (
    <article
      className={`upgrade-tile${selected ? ' selected' : ''}${affordable ? ' can-upgrade' : ''}${limiting ? ' production-limit' : ''}${guided ? ' first-step-target' : ''}`}
      aria-label={limiting ? `${names[id]}: production bottleneck` : names[id]}
      aria-describedby={limiting || guided ? 'production-status' : undefined}
    >
      <div className={`upgrade-art upgrade-art-${id}`}>
        <MachinePortrait
          id={id}
          level={game.levels[id]}
          color={config.resource.color}
        />
        <span key={game.levels[id]} className="machine-level">
          {game.levels[id]}
        </span>
      </div>
      <div className="upgrade-info">
        <h3>
          {limiting && <i className="bottleneck-dot" aria-hidden="true" />}
          {names[id]}
        </h3>
        <span>
          {format(current.value)}
          {next && (
            <>
              {' '}
              <b>→ {format(next.value)}</b>
            </>
          )}
        </span>
      </div>
      <button
        disabled={!affordable}
        aria-describedby={guided ? 'production-status' : undefined}
        onClick={() => {
          onUpgrade(id);
        }}
        aria-label={
          next
            ? `Upgrade ${names[id]} for ${String(next.cost)} credits`
            : `${names[id]} maximum level`
        }
        title={
          next && !affordable
            ? `${String(next.cost - game.credits)} more credits`
            : undefined
        }
      >
        {next ? (
          <>
            <GameIcon name="coin" />
            {next.cost}
          </>
        ) : (
          <>
            <GameIcon name="check" />
            MAX
          </>
        )}
      </button>
    </article>
  );
}
