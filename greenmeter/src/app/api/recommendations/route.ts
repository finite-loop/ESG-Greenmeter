import { withApiHandler } from '@/middleware/handler';
import { recommendationService } from '@/services/recommendationService';

/**
 * GET /api/recommendations
 * Fetch recommendations for the current tenant.
 * Query params: limit (default 20)
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? '20');
    const clampedLimit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(1, rawLimit), 100);

    const data = await recommendationService.getRecommendations(
      ctx.tenantId,
      clampedLimit
    );

    return {
      data: data.map((r) => ({
        recommendationId: r.recommendationId,
        paramId: r.paramId,
        metric: r.metric,
        recommendationText: r.recommendationText,
        priority: r.priority,
        confidence: r.confidence != null ? Number(r.confidence) : null,
        source: r.source,
        currentValue: r.currentValue != null ? Number(r.currentValue) : null,
        thresholdValue: r.thresholdValue != null ? Number(r.thresholdValue) : null,
        pillar: r.pillar,
        category: r.category,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  },
  { roles: ['admin', 'analyst', 'viewer'], audit: false }
);
