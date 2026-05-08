import { z } from 'zod';
import { uuidSchema } from './common';

export const extractionTriggerSchema = z.object({
  docId: uuidSchema,
  standard: z.enum(['BRSR', 'ESRS', 'GRI']),
  peerId: uuidSchema.optional(),
});

export const mappingDecisionSchema = z.object({
  metricId: uuidSchema,
  paramId: uuidSchema.optional(),
  mappingStatus: z.enum(['auto_mapped', 'manual_mapped', 'rejected', 'unmatched']),
});

export const batchMappingSchema = z.object({
  decisions: z.array(mappingDecisionSchema).min(1),
});

export const mappingReviewDecisionSchema = z.object({
  metricId: uuidSchema,
  action: z.enum(['confirm', 'reassign', 'reject']),
  paramId: uuidSchema.optional(),
}).refine(
  (data) => data.action !== 'reassign' || data.paramId !== undefined,
  { message: 'paramId is required for reassign action', path: ['paramId'] }
);

export type ExtractionTrigger = z.infer<typeof extractionTriggerSchema>;
export type MappingDecision = z.infer<typeof mappingDecisionSchema>;
export type BatchMapping = z.infer<typeof batchMappingSchema>;
export type MappingReviewDecision = z.infer<typeof mappingReviewDecisionSchema>;
