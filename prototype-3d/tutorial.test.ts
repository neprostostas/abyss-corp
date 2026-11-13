import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/domain/game';
import {
  nextTutorial,
  readTutorial,
  tutorialSteps,
  tutorialUpgradeTarget,
} from './tutorial';

test('inspection follows the production chain and requires finished cargo before selling', () => {
  const game = createGame();
  assert.equal(nextTutorial('mining', game, 'storage'), 'mining');
  assert.equal(nextTutorial('mining', game, 'mining'), 'transport');
  assert.equal(nextTutorial('transport', game, 'transport'), 'processing');
  assert.equal(nextTutorial('processing', game, 'processing'), 'processing');
  assert.equal(
    nextTutorial('processing', { ...game, refined: 3 }, null),
    'processing',
  );
  assert.equal(
    nextTutorial('processing', { ...game, refined: 3 }, 'processing'),
    'sell',
  );
  assert.equal(
    nextTutorial('sell', { ...game, credits: 100 }, 'storage'),
    'sell',
  );
  assert.equal(
    nextTutorial('upgrade', { ...game, credits: 100 }, 'mining'),
    'upgrade',
  );
});
test('all saved steps resume and unknown saved values restart safely', () => {
  for (const step of tutorialSteps) assert.equal(readTutorial(step), step);
  assert.equal(readTutorial(null), null);
  assert.equal(readTutorial('invalid'), null);
});
test('replaying the tutorial does not get stuck on max-level equipment', () => {
  const game = createGame();
  assert.equal(
    tutorialUpgradeTarget({ ...game, levels: { ...game.levels, mining: 5 } }),
    'transport',
  );
  const maxed = {
    ...game,
    levels: { mining: 5, transport: 5, processing: 5, storage: 5 },
  };
  assert.equal(tutorialUpgradeTarget(maxed), null);
  assert.equal(nextTutorial('upgrade', maxed, null), 'done');
});
