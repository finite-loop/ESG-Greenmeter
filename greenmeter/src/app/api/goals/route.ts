import { withApiHandler } from '@/middleware';
import { goalService } from '@/services/goalService';
import { goalListFilterSchema, goalCreateSchema } from '@/schemas/goals';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/goals — List goals for tenant with status, target, progress, component count.
 * Query params: status, page, pageSize
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = goalListFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await goalService.list(ctx.tenantId, parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin', 'analyst', 'viewer'], audit: false }
);

/**
 * POST /api/goals — Create a new goal.
 * Body: { paramId, canonicalId?, name, description?, targetValue, baselineValue?,
 *         baselineYear?, targetYear, unit?, direction? }
 */
export const POST = withApiHandler(
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

    const parsed = goalCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid goal data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const created = await goalService.create(ctx.tenantId, ctx.userId, parsed.data);

    return {
      data: created,
      _audit: {
        entityType: 'goal',
        entityId: created.goalId,
        newValue: created,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
