import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLayer } from '../src/domain/world';
import { createProgression } from '../src/domain/progression';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';
import { gameSave } from './fixtures';

void test('account save versions 3–7 migrate without changing money, levels or production timers', () => {
  const layer = {
    ...createLayer(),
    levels: { mining: 2, transport: 1, processing: 1, storage: 1 },
    phaseElapsedMs: 1000,
    raw: 3,
    refined: 3,
  };
  for (const version of [3, 4, 5, 6, 7]) {
    const progression = createProgression();
    const migrated = validateSave({
      version,
      savedAt: 1_000_000,
      world: {
        credits: 123,
        selectedLayerId: 'shallows',
        layers: { shallows: layer },
        ...(version >= 5
          ? {
              progression: {
                research: progression.research,
                claimedMissions: [],
                ...(version >= 6 ? { claimedEvents: [] } : {}),
                ...(version >= 7 ? { expedition: progression.expedition } : {}),
              },
            }
          : {}),
      },
    });
    assert.equal(migrated.version, 7);
    assert.equal(migrated.world.credits, 123);
    assert.deepEqual(migrated.world.layers.shallows, layer);
    assert.equal(migrated.world.progression?.expedition?.completed, 0);
  }
});

void test('invalid money, storage, timers, selection and duplicate claims are rejected', () => {
  const save = gameSave();
  const layer = createLayer();
  for (const credits of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() =>
      validateSave({ ...save, world: { ...save.world, credits } }),
    );
  for (const invalid of [
    { ...layer, raw: 7 },
    { ...layer, refined: 7 },
    { ...layer, phaseElapsedMs: 4001 },
    { ...layer, processingElapsedMs: 6001 },
    { ...layer, automation: { level: 1, enabled: true, elapsedMs: 12000 } },
  ])
    assert.throws(() =>
      validateSave({
        ...save,
        world: { ...save.world, layers: { shallows: invalid } },
      }),
    );
  assert.throws(() =>
    validateSave({
      ...save,
      world: { ...save.world, selectedLayerId: 'pearl-caverns' },
    }),
  );
  assert.throws(() =>
    validateSave({
      ...save,
      world: {
        ...save.world,
        progression: {
          ...createProgression(),
          claimedMissions: ['improve', 'improve'],
        },
      },
    }),
  );
});
