import { withApiHandler } from '@/middleware/handler';
import { insightService } from '@/services/insightService';

/**
 * GET /api/insights
 * Generate an executive insight briefing for the current tenant.
 * Query params: periodId (optional)
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const periodId = req.nextUrl.searchParams.get('periodId') ?? undefined;

    const briefing = await insightService.generateBriefing(
      ctx.tenantId,
      periodId
    );

    return { data: briefing };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);
