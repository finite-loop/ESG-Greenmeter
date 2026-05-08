import { withApiHandler } from '@/middleware';
import { configService } from '@/services/configService';
import { thresholdUpdateSchema } from '@/schemas/config';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/config/thresholds — Return merged thresholds (platform defaults + tenant overrides).
 */
export const GET = withApiHandler(
  async (_req, ctx) => {
    const thresholds = await configService.getThresholds(ctx.tenantId);
    return { data: thresholds };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

/**
 * PUT /api/config/thresholds — Save a tenant-specific threshold override.
 * Body: { paramId?, category?, pillar?, redMax, amberMax, unit? }
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

    const parsed = thresholdUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid threshold data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await configService.upsertThreshold(ctx.tenantId, {
      paramId: parsed.data.paramId ?? null,
      category: parsed.data.category ?? null,
      pillar: parsed.data.pillar ?? null,
      redMax: parsed.data.redMax,
      amberMax: parsed.data.amberMax,
      unit: parsed.data.unit ?? null,
    });

    return {
      data: result.newValue,
      _audit: {
        entityType: 'threshold',
        entityId: result.newValue.thresholdId,
        oldValue: result.oldValue,
        newValue: result.newValue,
      },
    };
  },
  { roles: ['admin'] }
);
