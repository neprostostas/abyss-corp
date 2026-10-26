import { z } from 'zod';
import { LAYER_IDS } from './layers';
import { UPGRADE_IDS } from './balance';
import { RESEARCH_IDS, MISSION_IDS } from './progression';

export const contentIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
export const liveEventSchema = z
  .object({
    id: contentIdSchema,
    name: z.string().min(1).max(80),
    description: z.string().min(1).max(240),
    startsAt: z.number().int().nonnegative().max(8640000000000000),
    endsAt: z.number().int().nonnegative().max(8640000000000000),
    requiredOutposts: z.number().int().min(1).max(LAYER_IDS.length),
    requiredModules: z.number().int().min(0).max(LAYER_IDS.length),
    reward: z.number().int().min(1).max(10000),
  })
  .strict()
  .refine((event) => event.endsAt > event.startsAt, 'Invalid event window.');
export type LiveEvent = z.infer<typeof liveEventSchema>;
export const liveOpsConfigSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().positive(),
    announcement: z.string().max(240),
    analyticsEnabled: z.boolean(),
    event: liveEventSchema.nullable(),
    experiment: z
      .object({
        id: contentIdSchema,
        enabled: z.boolean(),
        challengerPercent: z.number().int().min(0).max(100),
      })
      .strict(),
  })
  .strict();
export type LiveOpsConfig = z.infer<typeof liveOpsConfigSchema>;
export const TELEMETRY_NAMES = [
  'session_started',
  'operation_toggled',
  'upgrade_purchased',
  'cargo_sold',
  'depth_unlocked',
  'automation_upgraded',
  'research_purchased',
  'mission_claimed',
  'event_claimed',
  'experiment_exposed',
] as const;
export type TelemetryName = (typeof TELEMETRY_NAMES)[number];
export const telemetryEventSchema = z
  .object({
    id: z.string().uuid(),
    name: z.enum(TELEMETRY_NAMES),
    occurredAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    layerId: z.enum(LAYER_IDS).optional(),
    itemId: z
      .enum([...UPGRADE_IDS, ...RESEARCH_IDS, ...MISSION_IDS])
      .optional(),
    contentId: contentIdSchema.optional(),
    experimentId: contentIdSchema.optional(),
    variant: z.enum(['control', 'challenger']).optional(),
  })
  .strict();
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type GameplayEvent = Pick<
  TelemetryEvent,
  'name' | 'layerId' | 'itemId' | 'contentId'
>;
export const telemetryBatchSchema = z
  .object({
    consent: z.literal(true),
    installationId: z.string().uuid(),
    events: z.array(telemetryEventSchema).min(1).max(20),
  })
  .strict();
export const LIVE_OPS_POLL_MS = 60000;
export const TELEMETRY_FLUSH_MS = 10000;
