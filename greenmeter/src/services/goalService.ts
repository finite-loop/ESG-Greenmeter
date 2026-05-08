import { goalRepository } from '@/db/repositories/goalRepository';
import type { GoalRow, GoalComponentRow, GoalWithComponentCount, MilestoneRow } from '@/db/repositories/goalRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { GoalCreate, GoalUpdate, GoalListFilter, GoalComponentCreate, MilestoneCreate, MilestoneUpdate } from '@/schemas/goals';

export interface GoalWithProgress extends GoalWithComponentCount {
  progress: number;
}

export interface GoalDetailWithComponents extends GoalRow {
  components: GoalComponentRow[];
  milestones: MilestoneRow[];
  progress: number;
}

/**
 * Computes goal progress from weighted components.
 * Progress = sum(component_progress * component_weight) where
 * component_progress = (current_value / target_value) clamped to 0-100%.
 *
 * When no components exist, progress is 0.
 * When components lack target values, they contribute 0 progress.
 */
function computeProgress(components: GoalComponentRow[]): number {
  if (components.length === 0) return 0;

  let totalWeightedProgress = 0;
  let totalWeight = 0;

  for (const comp of components) {
    const weight = Number(comp.weight ?? '0');
    if (weight <= 0) continue;

    totalWeight += weight;
    // Without actual current values from KPI data, components contribute 0 progress.
    // Real current-value lookup will be added when KPI integration deepens.
    // For now, progress is 0 per component unless target is explicitly met.
    totalWeightedProgress += 0 * weight;
  }

  if (totalWeight === 0) return 0;

  return Math.min(100, Math.max(0, (totalWeightedProgress / totalWeight) * 100));
}

/**
 * Validates that component weights sum to 1.0 (within tolerance).
 */
function validateComponentWeights(components: GoalComponentRow[], newWeight?: string): void {
  let sum = 0;
  for (const comp of components) {
    sum += Number(comp.weight ?? '0');
  }
  if (newWeight !== undefined) {
    sum += Number(newWeight);
  }

  if (sum > 1.001) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Component weights sum to ${sum.toFixed(3)}, which exceeds 1.0. Reduce weights before adding more components.`,
      400
    );
  }
}

export const goalService = {
  async list(
    tenantId: string,
    filters: GoalListFilter
  ): Promise<{
    data: GoalWithProgress[];
    meta: { page: number; pageSize: number; total: number };
  }> {
    const result = await goalRepository.findAllByTenant(tenantId, {
      status: filters.status,
      page: filters.page,
      pageSize: filters.pageSize,
    });

    // Progress computation is a placeholder (always returns 0) until KPI current-value
    // integration is added. Skipping per-goal component queries to avoid N+1.
    const goalsWithProgress: GoalWithProgress[] = result.data.map((goal) => ({
      ...goal,
      progress: 0,
    }));

    return {
      data: goalsWithProgress,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },

  async getById(
    goalId: string,
    tenantId: string
  ): Promise<GoalDetailWithComponents> {
    const goal = await goalRepository.findById(goalId, tenantId);
    if (!goal) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal not found', 404);
    }

    const [components, goalMilestones] = await Promise.all([
      goalRepository.getComponents(goalId, tenantId),
      goalRepository.getMilestones(goalId, tenantId),
    ]);

    // On-demand missed detection: mark pending milestones past target_date as missed
    const now = new Date();
    const updatedMilestones = goalMilestones.map((m) => {
      if (m.status === 'pending' && m.targetDate && m.targetDate <= now) {
        return { ...m, status: 'missed' };
      }
      return m;
    });

    // Persist missed status changes in background (fire-and-forget)
    const missedIds = updatedMilestones
      .filter((m, i) => m.status === 'missed' && goalMilestones[i].status === 'pending')
      .map((m) => m.milestoneId);
    if (missedIds.length > 0) {
      goalRepository.markMilestonesMissed(missedIds, tenantId).catch((err) => {
        logger.error('Failed to mark milestones as missed', { goalId, err });
      });
    }

    return {
      ...goal,
      components,
      milestones: updatedMilestones,
      progress: computeProgress(components),
    };
  },

  async create(
    tenantId: string,
    userId: string,
    input: GoalCreate
  ): Promise<GoalRow> {
    const created = await goalRepository.create(tenantId, userId, {
      paramId: input.paramId,
      canonicalId: input.canonicalId,
      name: input.name,
      description: input.description,
      targetValue: input.targetValue,
      baselineValue: input.baselineValue,
      baselineYear: input.baselineYear,
      targetYear: input.targetYear,
      unit: input.unit,
      direction: input.direction,
    });

    logger.info('Goal created', {
      goalId: created.goalId,
      tenantId,
      name: created.name,
    });

    return created;
  },

  async update(
    goalId: string,
    tenantId: string,
    input: GoalUpdate
  ): Promise<{ oldValue: GoalRow; newValue: GoalRow }> {
    const existing = await goalRepository.findById(goalId, tenantId);
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal not found', 404);
    }

    const result = await goalRepository.update(goalId, tenantId, input);

    logger.info('Goal updated', {
      goalId,
      tenantId,
    });

    return result;
  },

  async deleteGoal(
    goalId: string,
    tenantId: string
  ): Promise<GoalRow> {
    const deleted = await goalRepository.delete(goalId, tenantId);
    if (!deleted) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal not found', 404);
    }

    logger.info('Goal deleted', {
      goalId,
      tenantId,
    });

    return deleted;
  },

  async addComponent(
    goalId: string,
    tenantId: string,
    input: GoalComponentCreate
  ): Promise<GoalComponentRow> {
    const goal = await goalRepository.findById(goalId, tenantId);
    if (!goal) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal not found', 404);
    }

    const existingComponents = await goalRepository.getComponents(goalId, tenantId);
    validateComponentWeights(existingComponents, input.weight);

    const component = await goalRepository.addComponent(goalId, tenantId, {
      name: input.name,
      targetValue: input.targetValue,
      weight: input.weight,
      paramId: input.paramId,
      sortOrder: input.sortOrder,
    });

    logger.info('Goal component added', {
      goalId,
      componentId: component.componentId,
      tenantId,
    });

    return component;
  },

  async removeComponent(
    componentId: string,
    tenantId: string
  ): Promise<GoalComponentRow> {
    const removed = await goalRepository.removeComponent(componentId, tenantId);
    if (!removed) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal component not found', 404);
    }

    logger.info('Goal component removed', {
      componentId,
      goalId: removed.goalId,
      tenantId,
    });

    return removed;
  },

  // ─── Milestone Methods ─────────────────────────────────────

  async getMilestones(
    goalId: string,
    tenantId: string
  ): Promise<MilestoneRow[]> {
    const goal = await goalRepository.findById(goalId, tenantId);
    if (!goal) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal not found', 404);
    }

    return goalRepository.getMilestones(goalId, tenantId);
  },

  async createMilestone(
    goalId: string,
    tenantId: string,
    input: MilestoneCreate
  ): Promise<MilestoneRow> {
    const goal = await goalRepository.findById(goalId, tenantId);
    if (!goal) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal not found', 404);
    }

    const created = await goalRepository.createMilestone(goalId, tenantId, {
      name: input.name,
      description: input.description,
      targetValue: input.targetValue,
      targetDate: input.targetDate,
      sortOrder: input.sortOrder,
    });

    logger.info('Milestone created', {
      milestoneId: created.milestoneId,
      goalId,
      tenantId,
    });

    return created;
  },

  async updateMilestone(
    milestoneId: string,
    tenantId: string,
    input: MilestoneUpdate,
    goalId?: string
  ): Promise<{ oldValue: MilestoneRow; newValue: MilestoneRow }> {
    const existing = await goalRepository.findMilestoneById(milestoneId, tenantId);
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Milestone not found', 404);
    }

    if (goalId && existing.goalId !== goalId) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Milestone not found for this goal', 404);
    }

    // Guard against empty update (would cause invalid SQL)
    const hasFields = Object.keys(input).some(
      (k) => (input as Record<string, unknown>)[k] !== undefined
    );
    if (!hasFields) {
      return { oldValue: existing, newValue: existing };
    }

    const result = await goalRepository.updateMilestone(milestoneId, tenantId, input);

    logger.info('Milestone updated', {
      milestoneId,
      goalId: existing.goalId,
      tenantId,
    });

    return result;
  },

  async deleteMilestone(
    milestoneId: string,
    tenantId: string,
    goalId?: string
  ): Promise<MilestoneRow> {
    if (goalId) {
      const existing = await goalRepository.findMilestoneById(milestoneId, tenantId);
      if (!existing || existing.goalId !== goalId) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Milestone not found for this goal', 404);
      }
    }

    const deleted = await goalRepository.deleteMilestone(milestoneId, tenantId);
    if (!deleted) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Milestone not found', 404);
    }

    logger.info('Milestone deleted', {
      milestoneId,
      goalId: deleted.goalId,
      tenantId,
    });

    return deleted;
  },

  /**
   * Checks pending milestones for a given parameter after a KPI value change.
   * If the current value meets or exceeds the milestone target, marks it as achieved.
   */
  async checkMilestonesForParam(
    tenantId: string,
    paramId: string,
    currentValue: number
  ): Promise<MilestoneRow[]> {
    const pendingMilestones = await goalRepository.findPendingMilestonesByGoalParam(
      tenantId,
      paramId
    );

    const achieved: MilestoneRow[] = [];

    for (const milestone of pendingMilestones) {
      if (milestone.targetValue === null) continue;

      const target = Number(milestone.targetValue);
      if (isNaN(target)) continue;

      const isLowerBetter = milestone.goalDirection === 'lower_is_better';
      const met = isLowerBetter
        ? currentValue <= target
        : currentValue >= target;

      if (met) {
        const updated = await goalRepository.markMilestoneAchieved(
          milestone.milestoneId,
          tenantId
        );
        if (updated) {
          achieved.push(updated);
          logger.info('Milestone auto-achieved', {
            milestoneId: milestone.milestoneId,
            goalId: milestone.goalId,
            tenantId,
            currentValue,
            targetValue: target,
          });
        }
      }
    }

    return achieved;
  },

  /**
   * Detects milestones that are past their target date and still pending,
   * marking them as missed.
   */
  async detectMissedMilestones(
    tenantId: string,
    asOf?: Date
  ): Promise<number> {
    const now = asOf ?? new Date();
    const pastDue = await goalRepository.findPendingMilestonesPastDue(tenantId, now);

    if (pastDue.length === 0) return 0;

    const ids = pastDue.map((m) => m.milestoneId);
    const count = await goalRepository.markMilestonesMissed(ids, tenantId);

    logger.info('Milestones marked as missed', {
      tenantId,
      count,
      milestoneIds: ids,
    });

    return count;
  },
};
