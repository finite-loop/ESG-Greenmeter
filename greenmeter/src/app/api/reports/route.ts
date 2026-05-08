import { withApiHandler } from '@/middleware';
import { reportFilterSchema } from '@/schemas/reports';
import { reportRepository } from '@/db/repositories/reportRepository';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/reports
 *
 * Lists generated reports for the current tenant.
 * Accepts optional query params: standard, periodId, status.
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = reportFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid report filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const reports = await reportRepository.listGeneratedReports(
      ctx.tenantId,
      parsed.data
    );

    return { data: reports };
  },
  { roles: ['admin', 'analyst'] }
);
