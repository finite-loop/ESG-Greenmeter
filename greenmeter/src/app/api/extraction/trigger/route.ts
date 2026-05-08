import { withApiHandler } from '@/middleware';
import { documentService } from '@/services/documentService';
import { AppError, ErrorCode } from '@/lib/errors';
import { uuidSchema } from '@/schemas/common';
import { z } from 'zod';

const triggerSchema = z.object({
  docId: uuidSchema,
});

export const POST = withApiHandler(
  async (req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400
      );
    }

    const parsed = triggerSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid trigger payload',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await documentService.triggerExtraction(parsed.data.docId);

    return {
      data: result,
      _audit: {
        entityType: 'document',
        entityId: parsed.data.docId,
        newValue: { docId: parsed.data.docId, jobId: result.jobId },
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
