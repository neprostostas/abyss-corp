import { UPGRADES } from '../../data/balance';
import { getUpgradeOffer } from '../../domain/game';
import type { GameState, UpgradeId } from '../../domain/game';

export function UpgradeCard({
  id,
  game,
  onUpgrade,
}: {
  id: UpgradeId;
  game: GameState;
  onUpgrade: (id: UpgradeId) => void;
}) {
  const definition = UPGRADES[id];
  const { current, next, affordable } = getUpgradeOffer(game, id);
  const titleId = `${id}-title`;
  const formatValue = (value: number) =>
    id === 'storage'
      ? `${String(value)} slots`
      : `${(value / 1000).toFixed(1)}s`;
  const units = {
    mining: 'per cargo extracted',
    transport: 'per one-way trip',
    processing: 'per cargo refined',
    storage: 'in each buffer',
  };
  const icons = { mining: '◆', transport: '➜', processing: '✦', storage: '▣' };
  return (
    <article className="upgrade-card" aria-labelledby={titleId}>
      <div className="upgrade-heading">
        <span className="upgrade-icon" aria-hidden="true">
          {icons[id]}
        </span>
        <div>
          <h3 id={titleId}>{definition.name}</h3>
          <span>
            Level {game.levels[id]} / {definition.levels.length}
          </span>
        </div>
      </div>
      <p>{definition.description}</p>
      <div className="upgrade-effect">
        <strong>
          {formatValue(current.value)}{' '}
          {next && (
            <>
              → <span>{formatValue(next.value)}</span>
            </>
          )}
        </strong>
        <small>{units[id]}</small>
      </div>
      <button
        disabled={!affordable}
        onClick={() => {
          onUpgrade(id);
        }}
        aria-label={
          next
            ? `Upgrade ${definition.name} for ${String(next.cost)} credits`
            : `${definition.name} fully upgraded`
        }
      >
        {next ? `Upgrade · ${String(next.cost)} CR` : 'Fully upgraded'}
      </button>
      <p className="upgrade-hint">
        {next
          ? affordable
            ? 'Ready to upgrade'
            : `${String(next.cost - game.credits)} more credits needed`
          : 'Maximum level for this outpost'}
      </p>
    </article>
  );
}
