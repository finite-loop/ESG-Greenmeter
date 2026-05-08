import { z } from 'zod';
import { uuidSchema } from './common';

export const thresholdSchema = z.object({
  paramId: uuidSchema.optional(),
  category: z.string().optional(),
  pillar: z.enum(['E', 'S', 'G']).optional(),
  redMax: z.string().refine((v) => !isNaN(Number(v)), { message: 'Must be a number' }),
  amberMax: z.string().refine((v) => !isNaN(Number(v)), { message: 'Must be a number' }),
  unit: z.string().optional(),
}).refine(
  (data) => Number(data.redMax) <= Number(data.amberMax),
  { message: 'Red threshold must be less than or equal to amber threshold' }
);

export const thresholdUpdateSchema = z.object({
  paramId: uuidSchema.nullable().optional(),
  category: z.string().nullable().optional(),
  pillar: z.enum(['E', 'S', 'G']).nullable().optional(),
  redMax: z.string().refine((v) => !isNaN(Number(v)), { message: 'Must be a number' }),
  amberMax: z.string().refine((v) => !isNaN(Number(v)), { message: 'Must be a number' }),
  unit: z.string().nullable().optional(),
}).refine(
  (data) => Number(data.redMax) <= Number(data.amberMax),
  { message: 'Red threshold must be less than or equal to amber threshold' }
);

export const weightSchema = z.object({
  pillar: z.enum(['E', 'S', 'G']),
  category: z.string().min(1),
  weight: z.string().refine(
    (v) => { const n = Number(v); return !isNaN(n) && n >= 0 && n <= 100; },
    { message: 'Weight must be between 0 and 100' }
  ),
});

export const weightsBatchSchema = z.object({
  weights: z.array(weightSchema).min(1),
});

export const tenantConfigSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export type Threshold = z.infer<typeof thresholdSchema>;
export type ThresholdUpdate = z.infer<typeof thresholdUpdateSchema>;
export type Weight = z.infer<typeof weightSchema>;
export type WeightsBatch = z.infer<typeof weightsBatchSchema>;
export type TenantConfig = z.infer<typeof tenantConfigSchema>;
