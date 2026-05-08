import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

export const standardEnum = z.enum(['BRSR', 'ESRS', 'GRI', 'IFRS_S2']);

export const kpiValueCreateSchema = z.object({
  paramId: uuidSchema,
  nodeId: uuidSchema,
  periodId: uuidSchema,
  value: z.string().optional(),
  valueText: z.string().optional(),
  unit: z.string().optional(),
  sourceType: z.enum(['manual', 'import', 'api', 'extraction']),
  sourceRef: z.string().optional(),
  notApplicable: z.boolean().default(false),
});

export const kpiValueUpdateSchema = kpiValueCreateSchema.partial().omit({
  paramId: true,
  nodeId: true,
  periodId: true,
});

export const kpiValueVerifySchema = z.object({
  valueId: uuidSchema,
  verified: z.boolean(),
});

export const kpiValueListFilterSchema = paginationSchema.extend({
  periodId: uuidSchema.optional(),
  standard: standardEnum.optional(),
  pillar: z.enum(['E', 'S', 'G']).optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  nodeId: uuidSchema.optional(),
});

export const kpiBatchVerifySchema = z.object({
  valueIds: z.array(uuidSchema).min(1, 'At least one value ID is required').max(100, 'Maximum 100 values per batch'),
});

export const kpiBatchMarkNotApplicableSchema = z.object({
  valueIds: z.array(uuidSchema).min(1, 'At least one value ID is required').max(100, 'Maximum 100 values per batch'),
});

export type KpiValueCreate = z.input<typeof kpiValueCreateSchema>;
export type KpiValueUpdate = z.input<typeof kpiValueUpdateSchema>;
export type KpiValueVerify = z.infer<typeof kpiValueVerifySchema>;
export type KpiValueListFilter = z.infer<typeof kpiValueListFilterSchema>;
export type KpiBatchVerify = z.infer<typeof kpiBatchVerifySchema>;
export type KpiBatchMarkNotApplicable = z.infer<typeof kpiBatchMarkNotApplicableSchema>;
