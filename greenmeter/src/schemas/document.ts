import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50 MB

export const documentUploadSchema = z.object({
  peerId: uuidSchema,
  standard: z.enum(['BRSR', 'ESRS', 'GRI']),
  fiscalYear: z.string().min(1, 'Fiscal year is required'),
});

export const documentListFilterSchema = paginationSchema.extend({
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  peerId: uuidSchema.optional(),
  standard: z.enum(['BRSR', 'ESRS', 'GRI']).optional(),
});

export type DocumentUpload = z.infer<typeof documentUploadSchema>;
export type DocumentListFilter = z.infer<typeof documentListFilterSchema>;
