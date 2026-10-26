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
  return (
    <article className="upgrade-card" aria-labelledby={titleId}>
      <div className="upgrade-heading">
        <span className="upgrade-icon" aria-hidden="true">
          {id === 'mining' ? '◆' : '➜'}
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
          {(current.durationMs / 1000).toFixed(1)}s{' '}
          {next && (
            <>
              → <span>{(next.durationMs / 1000).toFixed(1)}s</span>
            </>
          )}
        </strong>
        <small>
          {id === 'mining' ? 'per cargo extracted' : 'per one-way trip'}
        </small>
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
