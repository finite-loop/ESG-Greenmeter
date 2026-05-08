import { withApiHandler } from '@/middleware';
import { correlationService } from '@/services/correlationService';
import { correlationRequestSchema } from '@/schemas/correlation';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/benchmarks/correlations
 *
 * Returns a pairwise Pearson correlation matrix across ESG metrics
 * computed from peer data for the current tenant's sector.
 *
 * Query params:
 *   - fiscalYear (required): e.g. "2023-24"
 *   - sector (optional): filter to specific sector
 *
 * Response: { data: { metrics, matrix }, meta: { peerCount, metricsUsed } }
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = correlationRequestSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid correlation request parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await correlationService.computeCorrelations(
      ctx.tenantId,
      parsed.data.fiscalYear,
      parsed.data.sector
    );

    return {
      data: {
        metrics: result.metrics,
        matrix: result.matrix,
      },
      meta: {
        peerCount: result.peerCount,
        metricsUsed: result.metricsUsed,
      },
    };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
