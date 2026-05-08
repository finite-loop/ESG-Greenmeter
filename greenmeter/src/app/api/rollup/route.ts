import { withApiHandler } from '@/middleware';
import { rollupService } from '@/services/rollupService';
import { rollupQuerySchema } from '@/schemas/rollup';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/rollup?nodeId=...&periodId=...
 * Returns rollup aggregation summary for a given node and period.
 * Computes fresh rollup values from child nodes.
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = rollupQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'nodeId and periodId query parameters are required',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const summary = await rollupService.getRollupSummary(
      ctx.tenantId,
      parsed.data.nodeId,
      parsed.data.periodId
    );

    return { data: summary };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);
