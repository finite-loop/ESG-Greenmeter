import { withApiHandler } from '@/middleware';
import { coverageFilterSchema } from '@/schemas/reports';
import { reportService } from '@/services/reportService';
import { reportRepository } from '@/db/repositories/reportRepository';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/reports/render?framework=BRSR&periodId=<uuid>
 *
 * Returns a fully structured rendered report: sections → disclosures → parameters
 * with KPI values populated. Used by the report builder UI for the section-by-section view.
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
        'Invalid render query parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Resolve the root org node for this tenant
    const rootNode = await reportRepository.findRootNode(ctx.tenantId);
    if (!rootNode) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'No root organization node found. Complete onboarding first.',
        404
      );
    }

    const rendered = await reportService.renderReport(
      parsed.data.framework,
      ctx.tenantId,
      parsed.data.periodId,
      rootNode.nodeId
    );

    return { data: rendered };
  },
  { roles: ['admin', 'analyst'] }
);
