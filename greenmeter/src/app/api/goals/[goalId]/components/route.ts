import { withApiHandler } from '@/middleware';
import { goalService } from '@/services/goalService';
import { goalComponentCreateSchema } from '@/schemas/goals';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * POST /api/goals/[goalId]/components — Add a weighted component to a goal.
 * Body: { name, targetValue?, weight, paramId?, sortOrder? }
 */
export const POST = withApiHandler(
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

    const parsed = goalComponentCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid component data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const component = await goalService.addComponent(goalId, ctx.tenantId, parsed.data);

    return {
      data: component,
      _audit: {
        entityType: 'goal_component',
        entityId: component.componentId,
        newValue: component,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
