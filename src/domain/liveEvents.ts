import type { LiveEvent } from '../data/liveOps';
import { LAYER_IDS } from '../data/layers';
import type { WorldState } from './world';
import { getProgression } from './progression';

export function getLiveEventOffer(
  world: WorldState,
  event: LiveEvent,
  now: number,
) {
  const outposts = LAYER_IDS.filter(
    (id) => world.layers[id] !== undefined,
  ).length;
  const modules = LAYER_IDS.filter(
    (id) => world.layers[id]?.automation !== undefined,
  ).length;
  const claimed = (getProgression(world).claimedEvents ?? []).includes(
    event.id,
  );
  const active = now >= event.startsAt && now < event.endsAt;
  const complete =
    outposts >= event.requiredOutposts && modules >= event.requiredModules;
  const rewardFits = world.credits <= Number.MAX_SAFE_INTEGER - event.reward;
  const claimHistoryFull =
    (getProgression(world).claimedEvents?.length ?? 0) >= 1000;
  return {
    outposts,
    modules,
    claimed,
    active,
    complete,
    rewardFits,
    claimHistoryFull,
    canClaim: active && complete && !claimed && rewardFits && !claimHistoryFull,
  };
}
export function claimLiveEvent(
  world: WorldState,
  event: LiveEvent,
  now: number,
): WorldState {
  if (!getLiveEventOffer(world, event, now).canClaim) return world;
  const progression = getProgression(world);
  return {
    ...world,
    credits: world.credits + event.reward,
    progression: {
      ...progression,
      claimedEvents: [...(progression.claimedEvents ?? []), event.id],
    },
  };
}
