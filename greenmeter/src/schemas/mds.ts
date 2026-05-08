import { z } from 'zod';

export const mdsRequestSchema = z.object({
  fiscalYear: z.string().regex(/^\d{4}(-\d{2})?$/, 'Must be a fiscal year like 2024 or 2023-24'),
  sector: z.string().optional(),
});

export type MdsRequest = z.infer<typeof mdsRequestSchema>;
