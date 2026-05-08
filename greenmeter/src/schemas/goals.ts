import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

export const goalCreateSchema = z.object({
  paramId: uuidSchema,
  canonicalId: uuidSchema.optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetValue: z.string().refine((v) => !isNaN(Number(v)), { message: 'Must be a number' }),
  baselineValue: z.string().refine((v) => !isNaN(Number(v)), { message: 'Must be a number' }).optional(),
  baselineYear: z.string().regex(/^\d{4}$/, { message: 'Must be a 4-digit year' }).optional(),
  targetYear: z.string().regex(/^\d{4}$/, { message: 'Must be a 4-digit year' }),
  unit: z.string().optional(),
  direction: z.enum(['lower_is_better', 'higher_is_better']).default('lower_is_better'),
});

export const goalUpdateSchema = goalCreateSchema.partial();

export const goalListFilterSchema = paginationSchema.extend({
  status: z.enum(['active', 'achieved', 'at_risk', 'missed', 'archived']).optional(),
});

export const goalComponentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  targetValue: z.string().refine((v) => !isNaN(Number(v)), { message: 'Must be a number' }).optional(),
  weight: z.string().refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n > 0 && n <= 1;
  }, { message: 'Weight must be between 0 (exclusive) and 1 (inclusive)' }),
  paramId: uuidSchema.optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const milestoneCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetValue: z.string().refine((v) => !isNaN(Number(v)), { message: 'Must be a number' }).optional(),
  targetDate: z.coerce.date().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const milestoneUpdateSchema = milestoneCreateSchema.partial().extend({
  status: z.enum(['pending', 'achieved', 'missed']).optional(),
});

export type GoalCreate = z.infer<typeof goalCreateSchema>;
export type GoalUpdate = z.infer<typeof goalUpdateSchema>;
export type GoalListFilter = z.infer<typeof goalListFilterSchema>;
export type GoalComponentCreate = z.infer<typeof goalComponentCreateSchema>;
export type MilestoneCreate = z.infer<typeof milestoneCreateSchema>;
export type MilestoneUpdate = z.infer<typeof milestoneUpdateSchema>;
