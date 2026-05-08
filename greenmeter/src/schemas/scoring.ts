import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

export const scoreRequestSchema = z.object({
  nodeId: uuidSchema,
  periodId: uuidSchema,
});

export const scoreRecomputeRequestSchema = z.object({
  periodId: uuidSchema,
  nodeId: uuidSchema.optional(),
});

export const scoreListFilterSchema = paginationSchema.extend({
  nodeId: uuidSchema.optional(),
  periodId: uuidSchema.optional(),
  pillar: z.enum(['E', 'S', 'G']).optional(),
});

export type ScoreRequest = z.infer<typeof scoreRequestSchema>;
export type ScoreRecomputeRequest = z.infer<typeof scoreRecomputeRequestSchema>;
export type ScoreListFilter = z.infer<typeof scoreListFilterSchema>;
