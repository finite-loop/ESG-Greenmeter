import { withApiHandler } from '@/middleware';
import { goalService } from '@/services/goalService';
import { milestoneUpdateSchema } from '@/schemas/goals';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * PUT /api/goals/[goalId]/milestones/[milestoneId] — Update a milestone.
 * Body: partial of { name, description, targetValue, targetDate, status, sortOrder }
 */
export const PUT = withApiHandler(
  async (req, ctx) => {
    // Segment layout: ['', 'api', 'goals', '{goalId}', 'milestones', '{milestoneId}']
    const goalId = extractUuidParam(req, 3, 'goal ID');
    const milestoneId = extractUuidParam(req, 5, 'milestone ID');

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

    const parsed = milestoneUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid milestone update data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { oldValue, newValue } = await goalService.updateMilestone(
      milestoneId,
      ctx.tenantId,
      parsed.data,
      goalId
    );

    return {
      data: newValue,
      _audit: {
        entityType: 'milestone',
        entityId: milestoneId,
        oldValue,
        newValue,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);

/**
 * DELETE /api/goals/[goalId]/milestones/[milestoneId] — Delete a milestone.
 */
export const DELETE = withApiHandler(
  async (req, ctx) => {
    const goalId = extractUuidParam(req, 3, 'goal ID');
    const milestoneId = extractUuidParam(req, 5, 'milestone ID');

    const deleted = await goalService.deleteMilestone(milestoneId, ctx.tenantId, goalId);

    return {
      data: null,
      _audit: {
        entityType: 'milestone',
        entityId: milestoneId,
        oldValue: deleted,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
