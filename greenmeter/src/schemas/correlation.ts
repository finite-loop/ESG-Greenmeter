import { z } from 'zod';

export const correlationRequestSchema = z.object({
  fiscalYear: z.string().regex(/^\d{4}(-\d{2})?$/, 'Must be a fiscal year like 2024 or 2023-24'),
  sector: z.string().max(100).trim().optional(),
});

export type CorrelationRequest = z.infer<typeof correlationRequestSchema>;
