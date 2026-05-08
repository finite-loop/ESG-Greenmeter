import { z } from 'zod';
import { paginationSchema } from './common';

export const standardEnum = z.enum(['BRSR', 'ESRS', 'GRI', 'IFRS_S2']);
export const pillarEnum = z.enum(['E', 'S', 'G']);

export const parameterListFilterSchema = paginationSchema.extend({
  standard: standardEnum.optional(),
  pillar: pillarEnum.optional(),
  category: z.string().max(100).optional(),
  search: z.string().max(255).optional(),
});

export const parameterOverrideSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  unit: z.string().min(1).max(50).optional(),
  category: z.string().max(100).nullable().optional(),
  direction: z.enum(['lower_is_better', 'higher_is_better']).optional(),
  rollupMethod: z.enum(['SUM', 'AVG', 'WEIGHTED_AVG', 'LATEST', 'NONE']).optional(),
  howToMeasure: z.string().max(2000).nullable().optional(),
  howToCompute: z.string().max(2000).nullable().optional(),
  howToReport: z.string().max(2000).nullable().optional(),
  depts: z.array(z.string().min(1).max(100)).max(50).optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one override field must be provided' }
);

export type ParameterListFilter = z.infer<typeof parameterListFilterSchema>;
export type ParameterOverride = z.infer<typeof parameterOverrideSchema>;
