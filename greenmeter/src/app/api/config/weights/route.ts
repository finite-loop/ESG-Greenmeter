import { withApiHandler } from '@/middleware';
import { configService } from '@/services/configService';
import { weightsBatchSchema } from '@/schemas/config';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/config/weights — Return merged category + pillar weights (platform + tenant).
 */
export const GET = withApiHandler(
  async (_req, ctx) => {
    const weights = await configService.getWeights(ctx.tenantId);
    return { data: weights };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

/**
 * PUT /api/config/weights — Save tenant-specific weight overrides.
 * Body: { weights: [{ pillar, category, weight }, ...] }
 * Validates weights sum to 100% per pillar level and per overall level.
 * Triggers score-recompute job on success.
 */
export const PUT = withApiHandler(
  async (req, ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400
      );
    }

    const parsed = weightsBatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid weights data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await configService.saveWeights(
      ctx.tenantId,
      ctx.userId,
      parsed.data.weights
    );

    return {
      data: result.newValues,
      _audit: {
        entityType: 'scoring_weight',
        entityId: ctx.tenantId,
        oldValue: result.oldValues,
        newValue: result.newValues,
      },
    };
  },
  { roles: ['admin'] }
);
