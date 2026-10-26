import { UPGRADE_IDS } from '../data/balance';
import { LAYER_IDS } from '../data/layers';
import { RESEARCH_IDS } from '../data/progression';
import { getLayerGame } from './world';
import type { WorldState } from './world';
import { getLayerProduction, getProgression } from './progression';
import { getProductionSummary, getSaleValue, getUpgradeOffer } from './game';
import type { UpgradeId } from './game';

export type FirstStep =
  | { readonly kind: 'produce' | 'sell' }
  | { readonly kind: 'upgrade'; readonly upgradeId: UpgradeId };

/** Existing progression is sufficient to resume or finish the introduction on any device. */
export function getFirstStep(world: WorldState): FirstStep | null {
  const progression = getProgression(world);
  const shallows = world.layers.shallows;
  const established =
    world.selectedLayerId !== 'shallows' ||
    LAYER_IDS.some((id) => id !== 'shallows' && world.layers[id]) ||
    !shallows ||
    shallows.automation !== undefined ||
    UPGRADE_IDS.some((id) => shallows.levels[id] > 1) ||
    RESEARCH_IDS.some((id) => progression.research[id] > 0) ||
    progression.claimedMissions.length > 0 ||
    (progression.claimedEvents?.length ?? 0) > 0;
  if (established) return null;
  const game = getLayerGame(world);
  const config = getLayerProduction(world);
  const { bottleneck, storageFull } = getProductionSummary(game, config);
  // Selling a full warehouse takes priority over spending on an upgrade.
  if (storageFull && getSaleValue(game, config) > 0) return { kind: 'sell' };
  const upgradeId = [bottleneck, ...UPGRADE_IDS].find(
    (id) => getUpgradeOffer(game, id, config).affordable,
  );
  if (upgradeId) return { kind: 'upgrade', upgradeId };
  return { kind: getSaleValue(game, config) > 0 ? 'sell' : 'produce' };
}
