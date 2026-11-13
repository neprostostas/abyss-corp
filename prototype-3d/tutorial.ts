import type { GameState, UpgradeId } from '../src/domain/game';
import { UPGRADES, UPGRADE_IDS } from '../src/data/balance';

export function tutorialUpgradeTarget(game: GameState): UpgradeId | null {
  return (
    UPGRADE_IDS.find((id) => game.levels[id] < UPGRADES[id].levels.length) ??
    null
  );
}

export const tutorialKey = 'abyss-corp.prototype3d.tutorial-v1';
export type TutorialStep =
  'mining' | 'transport' | 'processing' | 'sell' | 'upgrade' | 'done';
export const tutorialSteps: TutorialStep[] = [
  'mining',
  'transport',
  'processing',
  'sell',
  'upgrade',
  'done',
];
export function readTutorial(value: string | null): TutorialStep | null {
  return tutorialSteps.includes(value as TutorialStep)
    ? (value as TutorialStep)
    : null;
}
export function nextTutorial(
  step: TutorialStep,
  game: GameState,
  inspected: UpgradeId | null,
): TutorialStep {
  if (step === 'upgrade' && tutorialUpgradeTarget(game) === null) return 'done';
  if (step === 'mining' && inspected === 'mining') return 'transport';
  if (step === 'transport' && inspected === 'transport') return 'processing';
  if (step === 'processing' && inspected === 'processing' && game.refined > 0)
    return 'sell';
  return step;
}
export const tutorialCopy = {
  mining: {
    target: 'mining',
    title: 'Meet your drill',
    text: 'The drill extracts crystals automatically. Tap it to inspect your first machine.',
    action: 'Inspect drill',
  },
  transport: {
    target: 'transport',
    title: 'Follow the cargo',
    text: 'Your submarine collects crystals and carries them to the outpost. Tap it to see its current trip.',
    action: 'Inspect submarine',
  },
  processing: {
    target: 'processing',
    title: 'Turn crystals into cargo',
    text: 'The refinery processes delivered crystals automatically. Inspect it, then wait for the first finished batch.',
    action: 'Inspect refinery',
  },
  sell: {
    target: 'storage',
    title: 'Make your first sale',
    text: 'Finished cargo waits in the depot. Sell a shipment to earn credits and make room for more.',
    action: 'Sell shipment',
  },
  upgrade: {
    target: 'mining',
    title: 'Build a faster outpost',
    text: 'Invest your credits in the drill. Open it and buy the next level. Sell more cargo if you need credits.',
    action: 'Upgrade drill',
  },
} as const;
