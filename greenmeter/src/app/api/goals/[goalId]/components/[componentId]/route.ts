import { withApiHandler } from '@/middleware';
import { goalService } from '@/services/goalService';
import { extractUuidParam } from '@/lib/params';

/**
 * DELETE /api/goals/[goalId]/components/[componentId] — Remove a component from a goal.
 */
export const DELETE = withApiHandler(
  async (req, ctx) => {
    // Segment layout: ['', 'api', 'goals', '{goalId}', 'components', '{componentId}']
    extractUuidParam(req, 3, 'goal ID');
    const componentId = extractUuidParam(req, 5, 'component ID');

    const removed = await goalService.removeComponent(componentId, ctx.tenantId);

    return {
      data: null,
      _audit: {
        entityType: 'goal_component',
        entityId: componentId,
        oldValue: removed,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
