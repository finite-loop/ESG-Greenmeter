import { withApiHandler } from '@/middleware';
import { mappingReviewService } from '@/services/mappingReviewService';
import { mappingReviewDecisionSchema } from '@/schemas/extraction';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/extraction/[extractionId]/mappings — List flagged metrics for review.
 */
export const GET = withApiHandler(
  async (req) => {
    const extractionId = extractUuidParam(req, 3, 'extraction ID');

    const metrics = await mappingReviewService.listFlaggedMetrics(extractionId);

    return { data: metrics };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

/**
 * PUT /api/extraction/[extractionId]/mappings — Update a single mapping decision.
 * Body: { metricId, action: 'confirm'|'reassign'|'reject', paramId? }
 */
export const PUT = withApiHandler(
  async (req, ctx) => {
    const extractionId = extractUuidParam(req, 3, 'extraction ID');

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

    const parsed = mappingReviewDecisionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid mapping decision',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await mappingReviewService.processDecision(
      ctx.userId,
      extractionId,
      parsed.data
    );

    return {
      data: result,
      _audit: {
        entityType: 'extracted_metric',
        entityId: parsed.data.metricId,
        newValue: {
          action: parsed.data.action,
          extractionId,
          metricId: parsed.data.metricId,
          paramId: result.paramId,
          mappingStatus: result.mappingStatus,
        },
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
