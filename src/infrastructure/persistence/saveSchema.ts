import { createExpedition } from '../../domain/expeditions';
import { EXPEDITIONS } from '../../data/expeditions';
import { MISSION_IDS, RESEARCH } from '../../data/progression';
import {
  createProgression,
  getLayerProduction,
} from '../../domain/progression';
import { z } from 'zod';
import type { GameSave } from '../../application/ports';
import { AUTOMATION_LEVELS } from '../../data/automation';
import { UPGRADES } from '../../data/balance';
import { LAYER_IDS } from '../../data/layers';
import { getLayerGame } from '../../domain/world';
import {
  getPhaseDuration,
  getProcessingDuration,
  getStorageCapacity,
} from '../../domain/game';
import { parseLegacySave } from './legacySaveSchema';

const contentIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const level = (max: number) => z.number().int().min(1).max(max);
const layerSchema = z
  .object({
    phase: z.enum(['mining', 'delivering', 'returning']),
    phaseElapsedMs: integer,
    running: z.boolean(),
    levels: z
      .object({
        mining: level(UPGRADES.mining.levels.length),
        transport: level(UPGRADES.transport.levels.length),
        processing: level(UPGRADES.processing.levels.length),
        storage: level(UPGRADES.storage.levels.length),
      })
      .strict(),
    raw: integer,
    refined: integer,
    processingElapsedMs: integer.nullable(),
    automation: z
      .object({
        level: level(AUTOMATION_LEVELS.length),
        enabled: z.boolean(),
        elapsedMs: integer,
      })
      .strict()
      .optional(),
  })
  .strict();
const schema = z
  .object({
    version: z.union([
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
    ]),
    savedAt: integer,
    world: z
      .object({
        progression: z
          .object({
            expedition: z
              .object({
                completed: z.number().int().min(0).max(EXPEDITIONS.length),
                active: z.boolean(),
                delivered: z
                  .object({
                    shallows: integer,
                    'golden-trench': integer,
                    'pearl-caverns': integer,
                  })
                  .strict(),
              })
              .strict()
              .optional(),
            research: z
              .object({
                trade: z.number().int().min(0).max(RESEARCH.trade.costs.length),
                storage: z
                  .number()
                  .int()
                  .min(0)
                  .max(RESEARCH.storage.costs.length),
              })
              .strict(),
            claimedEvents: z
              .array(contentIdSchema)
              .max(1000)
              .refine(
                (ids) => new Set(ids).size === ids.length,
                'Duplicate event claims.',
              )
              .optional(),
            claimedMissions: z
              .array(z.enum(MISSION_IDS))
              .max(MISSION_IDS.length)
              .refine(
                (ids) => new Set(ids).size === ids.length,
                'Duplicate mission claims.',
              ),
          })
          .strict()
          .optional(),
        credits: integer,
        selectedLayerId: z.enum(LAYER_IDS),
        layers: z
          .object({
            shallows: layerSchema,
            'golden-trench': layerSchema.optional(),
            'pearl-caverns': layerSchema.optional(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export function validateSave(data: unknown): GameSave {
  const parsed = schema.parse(data);
  if (parsed.version >= 5 && !parsed.world.progression)
    throw new Error('Save requires progression state.');
  if (parsed.version < 5 && parsed.world.progression)
    throw new Error('Legacy save cannot contain progression.');
  if (
    parsed.version < 6 &&
    parsed.world.progression?.claimedEvents !== undefined
  )
    throw new Error('Legacy save cannot contain event claims.');
  if (
    parsed.version >= 6 &&
    parsed.world.progression?.claimedEvents === undefined
  )
    throw new Error('Save requires event claim history.');
  if (parsed.version === 7 && !parsed.world.progression?.expedition)
    throw new Error('Version 7 requires expedition state.');
  if (parsed.version < 7 && parsed.world.progression?.expedition)
    throw new Error('Legacy save cannot contain expeditions.');
  const normalizeLayer = (layer: z.infer<typeof layerSchema>) => {
    const { automation, ...production } = layer;
    if (parsed.version === 3 && automation)
      throw new Error('Version 3 cannot contain automation.');
    return automation ? { ...production, automation } : production;
  };
  const parsedLayers = parsed.world.layers;
  // Normalize optional fields to absent keys under exactOptionalPropertyTypes.
  const save: GameSave = {
    ...parsed,
    version: 7,
    world: {
      ...parsed.world,
      progression: {
        ...(parsed.world.progression ?? createProgression()),
        claimedEvents: parsed.world.progression?.claimedEvents ?? [],
        expedition: parsed.world.progression?.expedition ?? createExpedition(),
      },
      layers: {
        shallows: normalizeLayer(parsedLayers.shallows),
        ...(parsedLayers['golden-trench']
          ? { 'golden-trench': normalizeLayer(parsedLayers['golden-trench']) }
          : {}),
        ...(parsedLayers['pearl-caverns']
          ? { 'pearl-caverns': normalizeLayer(parsedLayers['pearl-caverns']) }
          : {}),
      },
    },
  };
  const world = save.world;
  const expedition = world.progression?.expedition;
  if (expedition) {
    const definition = EXPEDITIONS[expedition.completed];
    if (expedition.active && !definition)
      throw new Error('Completed campaign cannot be active.');
    for (const id of LAYER_IDS) {
      if (
        (!expedition.active && expedition.delivered[id] !== 0) ||
        expedition.delivered[id] > (definition?.targets[id] ?? 0)
      )
        throw new Error('Invalid expedition cargo.');
    }
    if (
      (expedition.active || expedition.completed > 0) &&
      LAYER_IDS.some((id) => !world.layers[id])
    )
      throw new Error('Expeditions require all outposts.');
  }

  if (!world.layers[world.selectedLayerId])
    throw new Error('Selected layer is locked.');
  for (const [index, id] of LAYER_IDS.entries()) {
    if (!world.layers[id]) continue;
    const previous = index > 0 ? LAYER_IDS[index - 1] : undefined;
    if (previous && !world.layers[previous])
      throw new Error('Unlocked layers must be sequential.');
    const automation = world.layers[id].automation;
    if (
      automation &&
      automation.elapsedMs >=
        (AUTOMATION_LEVELS[automation.level - 1]?.intervalMs ?? 0)
    )
      throw new Error('Invalid automation progress.');
    const game = getLayerGame(world, id);
    const config = getLayerProduction(world, id);
    const duration = getPhaseDuration(game, config);
    if (
      game.phaseElapsedMs > duration ||
      (game.phase !== 'delivering' && game.phaseElapsedMs === duration)
    )
      throw new Error('Invalid transport progress.');
    if (
      game.raw > getStorageCapacity(game, config) ||
      game.refined > getStorageCapacity(game, config)
    )
      throw new Error('Storage exceeds capacity.');
    if (
      game.processingElapsedMs !== null &&
      game.processingElapsedMs > getProcessingDuration(game, config)
    )
      throw new Error('Invalid refinery progress.');
  }
  return save;
}

export function parseSave(raw: string): GameSave {
  const data: unknown = JSON.parse(raw);
  const version = z.object({ version: z.number() }).parse(data).version;
  if (version !== 1 && version !== 2) return validateSave(data);
  const old = parseLegacySave(raw);
  const { credits, ...shallows } = old.game;
  return validateSave({
    version: 3,
    savedAt: old.savedAt,
    world: { credits, selectedLayerId: 'shallows', layers: { shallows } },
  });
}
