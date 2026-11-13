import { PRESTIGE_RESEARCH_IDS } from '../../data/campaign';
import { LAYERS } from '../../data/layers';
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
  research: 'Complete 6 research levels',
  vents: 'Open the 900 m outpost',
  rift: 'Open the 1,900 m outpost',
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
    const missions = (ids: readonly MissionId[]) => (
      <div className="mission-list">
        {ids.map((id) => {
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
    const pending = MISSION_IDS.filter(
      (id) => !getMissionProgress(world, id).claimed,
    );
    const completed = MISSION_IDS.filter(
      (id) => getMissionProgress(world, id).claimed,
    );
    return (
      <>
        {expeditions}
        {pending.length > 0 && missions(pending)}
        {completed.length > 0 && (
          <details className="mission-history">
            <summary>Completed missions</summary>
            {missions(completed)}
          </details>
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
                name={
                  id === 'trade'
                    ? 'trade-network'
                    : id === 'storage'
                      ? 'modular-storage'
                      : id === 'engineering'
                        ? 'mining'
                        : 'sonar'
                }
              />
            </div>
            <h3>{definition.name}</h3>
            {!offer.unlocked && offer.requiredDepth && (
              <small className="research-requirement">
                <GameIcon name="lock" />
                Reach{' '}
                {LAYERS[offer.requiredDepth].depthMeters.toLocaleString(
                  'en-US',
                )}{' '}
                m
              </small>
            )}
            <div
              className="level-pips"
              aria-label={`Level ${String(offer.level)} of ${String(definition.costs.length)}`}
            >
              {definition.costs.map((_, i) => (
                <i key={i} className={i < offer.level ? 'filled' : ''} />
              ))}
            </div>
            <strong className="research-bonus">
              {id === 'engineering' || id === 'surveying' ? '−' : '+'}
              {offer.bonus}
              {id === 'storage' ? ' slots' : '%'}
              {offer.nextBonus !== null && (
                <span>
                  {' '}
                  → {id === 'engineering' || id === 'surveying' ? '−' : '+'}
                  {offer.nextBonus}
                  {id === 'storage' ? '' : '%'}
                </span>
              )}
            </strong>
            <p>
              {id === 'trade'
                ? 'Sale value · all depths'
                : id === 'storage'
                  ? 'Storage · all depths'
                  : definition.description}
              {!PRESTIGE_RESEARCH_IDS.some((required) => required === id) && (
                <>
                  <br />
                  <span>Optional for prestige</span>
                </>
              )}
            </p>
            <button
              disabled={!offer.affordable}
              onClick={() => {
                onResearch(id);
              }}
              title={
                !offer.unlocked && offer.requiredDepth
                  ? `Reach ${String(LAYERS[offer.requiredDepth].depthMeters)} m to unlock`
                  : offer.cost !== null && !offer.affordable
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

export function ClaimAllMissions({
  world,
  onClaim,
}: {
  world: WorldState;
  onClaim: (id: MissionId) => void;
}) {
  const ready = MISSION_IDS.filter(
    (id) => getMissionProgress(world, id).canClaim,
  );
  return (
    <button
      className="claim-all"
      disabled={ready.length === 0}
      onClick={() => {
        for (const id of ready) onClaim(id);
      }}
    >
      Claim all
    </button>
  );
}
