import { withApiHandler } from '@/middleware';
import { coverageFilterSchema } from '@/schemas/reports';
import { reportService } from '@/services/reportService';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/reports/coverage
 *
 * Returns coverage summary for a given framework and period.
 * Includes total params, entered, verified, not-applicable, % complete,
 * per-section breakdown, and warning threshold.
 *
 * Query params:
 *   - framework: 'BRSR' | 'ESRS' | 'GRI' | 'IFRS_S2' (required)
 *   - periodId: UUID (required)
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = coverageFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid coverage query parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const coverage = await reportService.getCoverage(
      parsed.data.framework,
      ctx.tenantId,
      parsed.data.periodId
    );

    return { data: coverage };
  },
  { roles: ['admin', 'analyst'] }
);
