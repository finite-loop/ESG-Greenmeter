import { withApiHandler } from '@/middleware';
import { AppError, ErrorCode } from '@/lib/errors';
import { uuidSchema } from '@/schemas/common';
import { mappingReviewService } from '@/services/mappingReviewService';

/**
 * GET /api/extraction/by-doc?docId=<uuid> — Find the most recent extraction for a document.
 * Returns the extraction summary so the frontend can load the mapping review table.
 */
export const GET = withApiHandler(
  async (req) => {
    const url = new URL(req.url);
    const docId = url.searchParams.get('docId');

    const parsed = uuidSchema.safeParse(docId);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid or missing docId parameter',
        400
      );
    }

    const extraction = await mappingReviewService.findExtractionByDocId(parsed.data);

    return { data: extraction };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
