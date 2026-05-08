import { withApiHandler } from '@/middleware';
import { goalService } from '@/services/goalService';
import { goalUpdateSchema } from '@/schemas/goals';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/goals/[goalId] — Get a single goal with components.
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const goalId = extractUuidParam(req, 3, 'goal ID');
    const goal = await goalService.getById(goalId, ctx.tenantId);

    return { data: goal };
  },
  { roles: ['admin', 'analyst', 'viewer'], audit: false }
);

/**
 * PUT /api/goals/[goalId] — Update a goal.
 * Body: partial of { paramId, canonicalId, name, description, targetValue,
 *        baselineValue, baselineYear, targetYear, unit, direction }
 */
export const PUT = withApiHandler(
  async (req, ctx) => {
    const goalId = extractUuidParam(req, 3, 'goal ID');

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

    const parsed = goalUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid goal update data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { oldValue, newValue } = await goalService.update(
      goalId,
      ctx.tenantId,
      parsed.data
    );

    return {
      data: newValue,
      _audit: {
        entityType: 'goal',
        entityId: goalId,
        oldValue,
        newValue,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);

/**
 * DELETE /api/goals/[goalId] — Delete a goal and its cascaded components.
 */
export const DELETE = withApiHandler(
  async (req, ctx) => {
    const goalId = extractUuidParam(req, 3, 'goal ID');
    const deleted = await goalService.deleteGoal(goalId, ctx.tenantId);

    return {
      data: null,
      _audit: {
        entityType: 'goal',
        entityId: goalId,
        oldValue: deleted,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
