import { INFRASTRUCTURE, PRESTIGE } from '../../data/campaign';
import { createCampaign } from '../../domain/campaign';
import { createExpedition } from '../../domain/expeditions';
import { EXPEDITIONS } from '../../data/expeditions';
import { MISSION_IDS, RESEARCH } from '../../data/progression';
import {
  createProgression,
  getLayerProduction,
} from '../../domain/progression';
import { z } from 'zod';
import type { GameSave } from '../../application/ports';
import { SPECIALISTS, AUTOMATION_LEVELS } from '../../data/automation';
import { UPGRADES } from '../../data/balance';
import { LAYER_IDS, CORE_LAYER_IDS } from '../../data/layers';
import { getLayerGame } from '../../domain/world';
import {
  getPhaseDuration,
  getProcessingDuration,
  getStorageCapacity,
} from '../../domain/game';

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
    specialists: z
      .object({
        quartermaster: z
          .number()
          .int()
          .min(0)
          .max(SPECIALISTS.quartermaster.costs.length)
          .optional(),
        broker: z
          .number()
          .int()
          .min(0)
          .max(SPECIALISTS.broker.costs.length)
          .optional(),
      })
      .strict()
      .optional(),
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
      z.literal(8),
    ]),
    savedAt: integer,
    world: z
      .object({
        campaign: z
          .object({
            rank: z.number().int().min(0).max(PRESTIGE.maxRank),
            infrastructure: z
              .object({
                depot: z
                  .number()
                  .int()
                  .min(0)
                  .max(INFRASTRUCTURE.depot.costs.length),
                exchange: z
                  .number()
                  .int()
                  .min(0)
                  .max(INFRASTRUCTURE.exchange.costs.length),
                sonar: z
                  .number()
                  .int()
                  .min(0)
                  .max(INFRASTRUCTURE.sonar.costs.length),
              })
              .strict(),
          })
          .strict()
          .optional(),
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
                engineering: z
                  .number()
                  .int()
                  .min(0)
                  .max(RESEARCH.engineering.costs.length)
                  .optional(),
                surveying: z
                  .number()
                  .int()
                  .min(0)
                  .max(RESEARCH.surveying.costs.length)
                  .optional(),
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
            'thermal-vents': layerSchema.optional(),
            'midnight-rift': layerSchema.optional(),
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
  if (parsed.version >= 7 && !parsed.world.progression?.expedition)
    throw new Error('Version 7 requires expedition state.');
  if (parsed.version < 7 && parsed.world.progression?.expedition)
    throw new Error('Legacy save cannot contain expeditions.');
  if (parsed.version >= 8 && !parsed.world.campaign)
    throw new Error('Save requires campaign state.');
  if (
    parsed.version < 8 &&
    (parsed.world.campaign ||
      parsed.world.layers['thermal-vents'] ||
      parsed.world.layers['midnight-rift'])
  )
    throw new Error('Legacy save cannot contain campaign content.');
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
    version: 8,
    world: {
      ...parsed.world,
      campaign: parsed.world.campaign ?? createCampaign(),
      progression: {
        ...(parsed.world.progression ?? createProgression()),
        claimedEvents: parsed.world.progression?.claimedEvents ?? [],
        expedition: parsed.world.progression?.expedition ?? createExpedition(),
      },
      layers: Object.fromEntries(
        LAYER_IDS.flatMap((id) => {
          const layer = parsedLayers[id];
          return layer ? [[id, normalizeLayer(layer)]] : [];
        }),
      ),
    },
  };
  const world = save.world;
  const expedition = world.progression?.expedition;
  if (expedition) {
    const definition = EXPEDITIONS[expedition.completed];
    if (expedition.active && !definition)
      throw new Error('Completed campaign cannot be active.');
    for (const id of CORE_LAYER_IDS) {
      if (
        (!expedition.active && expedition.delivered[id] !== 0) ||
        expedition.delivered[id] > (definition?.targets[id] ?? 0)
      )
        throw new Error('Invalid expedition cargo.');
    }
    if (
      (expedition.active || expedition.completed > 0) &&
      CORE_LAYER_IDS.some((id) => !world.layers[id])
    )
      throw new Error('Expeditions require all outposts.');
  }

  if (
    !world.layers['golden-trench'] &&
    Object.values(world.campaign?.infrastructure ?? {}).some(
      (level) => level > 0,
    )
  )
    throw new Error('Infrastructure requires the trench outpost.');
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
