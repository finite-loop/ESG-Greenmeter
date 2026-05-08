import { withApiHandler } from '@/middleware';
import { mdsService } from '@/services/mdsService';
import { mdsRequestSchema } from '@/schemas/mds';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/benchmarks/mds
 *
 * Returns 2D MDS coordinates for the current tenant and all sector peers.
 *
 * Query params:
 *   - fiscalYear (required): e.g. "2023-24"
 *   - sector (optional): filter to specific sector
 *
 * Response: { data: MdsPoint[], meta: { metricsUsed, peerCount } }
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = mdsRequestSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid MDS request parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await mdsService.computeMds(
      ctx.tenantId,
      parsed.data.fiscalYear,
      parsed.data.sector
    );

    return {
      data: result.points,
      meta: {
        metricsUsed: result.metricsUsed,
        peerCount: result.peerCount,
      },
    };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
