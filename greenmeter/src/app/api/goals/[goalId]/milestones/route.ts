import { withApiHandler } from '@/middleware';
import { goalService } from '@/services/goalService';
import { milestoneCreateSchema } from '@/schemas/goals';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/goals/[goalId]/milestones — List milestones for a goal.
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const goalId = extractUuidParam(req, 3, 'goal ID');
    const milestones = await goalService.getMilestones(goalId, ctx.tenantId);

    return { data: milestones };
  },
  { roles: ['admin', 'analyst', 'viewer'], audit: false }
);

/**
 * POST /api/goals/[goalId]/milestones — Create a milestone for a goal.
 * Body: { name, description?, targetValue?, targetDate?, sortOrder? }
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

    const parsed = milestoneCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid milestone data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const created = await goalService.createMilestone(goalId, ctx.tenantId, parsed.data);

    return {
      data: created,
      _audit: {
        entityType: 'milestone',
        entityId: created.milestoneId,
        newValue: created,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
