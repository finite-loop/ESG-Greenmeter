import { withApiHandler } from '@/middleware';
import { benchmarkService } from '@/services/benchmarkService';
import { benchmarkRequestSchema, benchmarkListRequestSchema } from '@/schemas/benchmark';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/benchmarks — Return benchmark data for a canonical metric.
 *
 * Query params:
 *   canonicalId (required) — UUID of the canonical metric
 *   fiscalYear (required) — e.g. "2023-24"
 *   periodId (optional) — UUID of tenant's reporting period (for tenant rank)
 *   sector (optional) — sector filter for peer selection
 *
 * When canonicalId is omitted, returns list of available metrics with peer counts.
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    // If no canonicalId, return available metrics list
    if (!rawParams.canonicalId) {
      const listParsed = benchmarkListRequestSchema.safeParse(rawParams);
      if (!listParsed.success) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'fiscalYear query parameter is required',
          400,
          listParsed.error.flatten().fieldErrors as Record<string, string[]>
        );
      }

      const peerIdArray = listParsed.data.peerIds
        ? listParsed.data.peerIds.split(',').filter(Boolean)
        : undefined;

      const metrics = await benchmarkService.listAvailableMetrics(
        ctx.tenantId,
        listParsed.data.fiscalYear,
        listParsed.data.sector,
        peerIdArray
      );

      return { data: metrics };
    }

    // Single metric benchmark
    const parsed = benchmarkRequestSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'canonicalId (UUID) and fiscalYear are required',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const peerIdArray = parsed.data.peerIds
      ? parsed.data.peerIds.split(',').filter(Boolean)
      : undefined;

    const result = await benchmarkService.getBenchmark(
      ctx.tenantId,
      parsed.data.canonicalId,
      parsed.data.fiscalYear,
      parsed.data.periodId,
      parsed.data.sector,
      peerIdArray
    );

    if (!result) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'No benchmark data found for the specified metric and filters',
        404
      );
    }

    return { data: result };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);
