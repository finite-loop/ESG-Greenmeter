import { withApiHandler } from '@/middleware';
import { scoringService } from '@/services/scoringService';
import { scoreRequestSchema } from '@/schemas/scoring';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/scores — Return ESG score breakdown (overall, per-pillar, per-category).
 * Query params: nodeId (required), periodId (required)
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = scoreRequestSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'nodeId and periodId query parameters are required (valid UUIDs)',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const breakdown = await scoringService.getScores(
      ctx.tenantId,
      parsed.data.nodeId,
      parsed.data.periodId
    );

    return { data: breakdown };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);
