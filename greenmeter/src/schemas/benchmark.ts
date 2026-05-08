import { z } from 'zod';
import { uuidSchema } from './common';

export const benchmarkRequestSchema = z.object({
  canonicalId: uuidSchema,
  fiscalYear: z.string().min(1).max(20),
  periodId: uuidSchema.optional(),
  sector: z.string().min(1).optional(),
  peerIds: z.string().min(1).optional(),
});

export const benchmarkListRequestSchema = z.object({
  fiscalYear: z.string().min(1).max(20),
  sector: z.string().min(1).optional(),
  peerIds: z.string().min(1).optional(),
});

export type BenchmarkRequest = z.infer<typeof benchmarkRequestSchema>;
export type BenchmarkListRequest = z.infer<typeof benchmarkListRequestSchema>;
