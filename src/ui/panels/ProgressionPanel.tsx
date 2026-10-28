import type { ReactNode } from 'react';
import {
  MISSION_IDS,
  MISSIONS,
  RESEARCH,
  RESEARCH_IDS,
} from '../../data/progression';
import type { MissionId, ResearchId } from '../../data/progression';
import { getMissionProgress, getResearchOffer } from '../../domain/progression';
import type { WorldState } from '../../domain/world';
import { ProgressBar } from '../components/ProgressBar';
import { GameIcon } from '../components/GameIcon';
const goals: Record<MissionId, string> = {
  improve: 'Buy 4 production upgrades',
  automate: 'Install a sales module',
  expand: 'Open 2 outposts',
  discover: 'Complete your first research',
  explore: 'Open 3 depths',
  network: 'Automate 3 outposts',
  research: 'Complete all 6 research levels',
};
export function ProgressionPanel({
  world,
  expeditions,
  onResearch,
  onClaim,
  mode = 'research',
}: {
  world: WorldState;
  expeditions?: ReactNode;
  onResearch: (id: ResearchId) => void;
  onClaim: (id: MissionId) => void;
  mode?: 'research' | 'missions';
}) {
  if (mode === 'missions') {
    const missions = (
      <div className="mission-list">
        {MISSION_IDS.map((id) => {
          const definition = MISSIONS[id];
          const progress = getMissionProgress(world, id);
          return (
            <article
              className={`mission-row${progress.claimed ? ' claimed' : progress.complete ? ' ready' : ''}`}
              key={id}
            >
              <span className="mission-medal">
                <GameIcon name={progress.claimed ? 'check' : 'missions'} />
              </span>
              <div className="mission-content">
                <h3>{definition.name}</h3>
                <p>
                  {goals[id]}{' '}
                  <b>
                    {progress.current}/{progress.target}
                  </b>
                </p>
                <ProgressBar
                  label={definition.name}
                  value={progress.current / progress.target}
                />
              </div>
              <button
                disabled={!progress.canClaim}
                onClick={() => {
                  onClaim(id);
                }}
                aria-label={`Claim ${String(definition.reward)} credits for ${definition.name}`}
                title={
                  !progress.rewardFits
                    ? 'Spend credits before claiming'
                    : undefined
                }
              >
                {progress.claimed ? (
                  <GameIcon name="check" />
                ) : (
                  <>
                    <GameIcon name="coin" />
                    {definition.reward}
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>
    );
    const allClaimed =
      world.progression?.claimedMissions.length === MISSION_IDS.length;
    return (
      <>
        {expeditions}
        {allClaimed ? (
          <details className="mission-history">
            <summary>Completed missions</summary>
            {missions}
          </details>
        ) : (
          missions
        )}
      </>
    );
  }
  return (
    <div className="research-grid">
      {RESEARCH_IDS.map((id) => {
        const definition = RESEARCH[id];
        const offer = getResearchOffer(world, id);
        return (
          <article
            className={`research-card research-${id}${offer.affordable ? ' can-upgrade' : ''}`}
            key={id}
          >
            <div className="research-illustration">
              <GameIcon
                name={id === 'trade' ? 'trade-network' : 'modular-storage'}
              />
            </div>
            <h3>{id === 'trade' ? 'Deep-sea trade' : 'Warehousing'}</h3>
            <div
              className="level-pips"
              aria-label={`Level ${String(offer.level)} of 3`}
            >
              {definition.costs.map((_, i) => (
                <i key={i} className={i < offer.level ? 'filled' : ''} />
              ))}
            </div>
            <strong className="research-bonus">
              +{offer.bonus}
              {id === 'trade' ? '%' : ' slots'}
              {offer.nextBonus !== null && (
                <span>
                  {' '}
                  → +{offer.nextBonus}
                  {id === 'trade' ? '%' : ''}
                </span>
              )}
            </strong>
            <p>
              {id === 'trade'
                ? 'Sale value · all depths'
                : 'Storage · all depths'}
            </p>
            <button
              disabled={!offer.affordable}
              onClick={() => {
                onResearch(id);
              }}
              title={
                offer.cost !== null && !offer.affordable
                  ? `${String(offer.cost - world.credits)} more credits`
                  : undefined
              }
            >
              {offer.cost === null ? (
                <>
                  <GameIcon name="check" />
                  Complete
                </>
              ) : (
                <>
                  <span>↑ Upgrade</span>
                  <GameIcon name="coin" />
                  {offer.cost}
                </>
              )}
            </button>
          </article>
        );
      })}
    </div>
  );
}
