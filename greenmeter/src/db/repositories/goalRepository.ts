import { db } from '@/db';
import { goals, goalComponents, milestones } from '@/db/schema/goals';
import { eq, and, sql, asc, desc, lte, inArray } from 'drizzle-orm';
import { AppError, ErrorCode } from '@/lib/errors';

export interface GoalRow {
  goalId: string;
  tenantId: string;
  paramId: string;
  canonicalId: string | null;
  name: string;
  description: string | null;
  targetValue: string;
  baselineValue: string | null;
  baselineYear: string | null;
  targetYear: string;
  unit: string | null;
  direction: string | null;
  status: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalComponentRow {
  componentId: string;
  goalId: string;
  tenantId: string;
  name: string;
  targetValue: string | null;
  weight: string | null;
  paramId: string | null;
  sortOrder: number | null;
  createdAt: Date;
}

export interface GoalWithComponentCount extends GoalRow {
  componentCount: number;
}

interface GoalCreateInput {
  paramId: string;
  canonicalId?: string;
  name: string;
  description?: string;
  targetValue: string;
  baselineValue?: string;
  baselineYear?: string;
  targetYear: string;
  unit?: string;
  direction?: string;
}

interface GoalUpdateInput {
  paramId?: string;
  canonicalId?: string;
  name?: string;
  description?: string;
  targetValue?: string;
  baselineValue?: string;
  baselineYear?: string;
  targetYear?: string;
  unit?: string;
  direction?: string;
}

interface ComponentCreateInput {
  name: string;
  targetValue?: string;
  weight: string;
  paramId?: string;
  sortOrder?: number;
}

export interface MilestoneRow {
  milestoneId: string;
  goalId: string;
  tenantId: string;
  name: string;
  description: string | null;
  targetValue: string | null;
  targetDate: Date | null;
  status: string;
  achievedAt: Date | null;
  sortOrder: number | null;
  createdAt: Date;
}

interface MilestoneCreateInput {
  name: string;
  description?: string;
  targetValue?: string;
  targetDate?: Date;
  sortOrder?: number;
}

interface MilestoneUpdateInput {
  name?: string;
  description?: string;
  targetValue?: string;
  targetDate?: Date;
  status?: string;
  sortOrder?: number;
}

export const goalRepository = {
  async findAllByTenant(
    tenantId: string,
    filters: { status?: string; page: number; pageSize: number }
  ): Promise<{ data: GoalWithComponentCount[]; total: number }> {
    const conditions = [eq(goals.tenantId, tenantId)];

    if (filters.status) {
      conditions.push(eq(goals.status, filters.status));
    }

    const where = and(...conditions);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(goals)
      .where(where);

    const total = countResult[0]?.count ?? 0;

    const offset = (filters.page - 1) * filters.pageSize;

    const rows = await db
      .select({
        goalId: goals.goalId,
        tenantId: goals.tenantId,
        paramId: goals.paramId,
        canonicalId: goals.canonicalId,
        name: goals.name,
        description: goals.description,
        targetValue: goals.targetValue,
        baselineValue: goals.baselineValue,
        baselineYear: goals.baselineYear,
        targetYear: goals.targetYear,
        unit: goals.unit,
        direction: goals.direction,
        status: goals.status,
        createdBy: goals.createdBy,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt,
        componentCount: sql<number>`(
          SELECT count(*)::int FROM goal_components gc
          WHERE gc.goal_id = ${goals.goalId} AND gc.tenant_id = ${tenantId}
        )`,
      })
      .from(goals)
      .where(where)
      .orderBy(desc(goals.createdAt))
      .limit(filters.pageSize)
      .offset(offset);

    return { data: rows as GoalWithComponentCount[], total };
  },

  async findById(
    goalId: string,
    tenantId: string
  ): Promise<GoalRow | null> {
    const rows = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.goalId, goalId),
          eq(goals.tenantId, tenantId)
        )
      )
      .limit(1);

    return (rows[0] as GoalRow | undefined) ?? null;
  },

  async create(
    tenantId: string,
    userId: string,
    input: GoalCreateInput
  ): Promise<GoalRow> {
    const rows = await db
      .insert(goals)
      .values({
        tenantId,
        paramId: input.paramId,
        canonicalId: input.canonicalId ?? null,
        name: input.name,
        description: input.description ?? null,
        targetValue: input.targetValue,
        baselineValue: input.baselineValue ?? null,
        baselineYear: input.baselineYear ?? null,
        targetYear: input.targetYear,
        unit: input.unit ?? null,
        direction: input.direction ?? 'lower_is_better',
        createdBy: userId,
      })
      .returning();

    return rows[0] as GoalRow;
  },

  async update(
    goalId: string,
    tenantId: string,
    input: GoalUpdateInput
  ): Promise<{ oldValue: GoalRow; newValue: GoalRow }> {
    const oldValue = await this.findById(goalId, tenantId);
    if (!oldValue) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal not found', 404);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: sql`now()`,
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.targetValue !== undefined) updateData.targetValue = input.targetValue;
    if (input.baselineValue !== undefined) updateData.baselineValue = input.baselineValue;
    if (input.baselineYear !== undefined) updateData.baselineYear = input.baselineYear;
    if (input.targetYear !== undefined) updateData.targetYear = input.targetYear;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.direction !== undefined) updateData.direction = input.direction;
    if (input.paramId !== undefined) updateData.paramId = input.paramId;
    if (input.canonicalId !== undefined) updateData.canonicalId = input.canonicalId;

    const rows = await db
      .update(goals)
      .set(updateData)
      .where(
        and(
          eq(goals.goalId, goalId),
          eq(goals.tenantId, tenantId)
        )
      )
      .returning();

    return { oldValue, newValue: rows[0] as GoalRow };
  },

  async delete(
    goalId: string,
    tenantId: string
  ): Promise<GoalRow | null> {
    const rows = await db
      .delete(goals)
      .where(
        and(
          eq(goals.goalId, goalId),
          eq(goals.tenantId, tenantId)
        )
      )
      .returning();

    return (rows[0] as GoalRow | undefined) ?? null;
  },

  async getComponents(
    goalId: string,
    tenantId: string
  ): Promise<GoalComponentRow[]> {
    const rows = await db
      .select()
      .from(goalComponents)
      .where(
        and(
          eq(goalComponents.goalId, goalId),
          eq(goalComponents.tenantId, tenantId)
        )
      )
      .orderBy(asc(goalComponents.sortOrder));

    return rows as GoalComponentRow[];
  },

  async addComponent(
    goalId: string,
    tenantId: string,
    input: ComponentCreateInput
  ): Promise<GoalComponentRow> {
    const rows = await db
      .insert(goalComponents)
      .values({
        goalId,
        tenantId,
        name: input.name,
        targetValue: input.targetValue ?? null,
        weight: input.weight,
        paramId: input.paramId ?? null,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();

    return rows[0] as GoalComponentRow;
  },

  async removeComponent(
    componentId: string,
    tenantId: string
  ): Promise<GoalComponentRow | null> {
    const rows = await db
      .delete(goalComponents)
      .where(
        and(
          eq(goalComponents.componentId, componentId),
          eq(goalComponents.tenantId, tenantId)
        )
      )
      .returning();

    return (rows[0] as GoalComponentRow | undefined) ?? null;
  },

  // ─── Milestone Methods ─────────────────────────────────────

  async getMilestones(
    goalId: string,
    tenantId: string
  ): Promise<MilestoneRow[]> {
    const rows = await db
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.goalId, goalId),
          eq(milestones.tenantId, tenantId)
        )
      )
      .orderBy(asc(milestones.targetDate), asc(milestones.sortOrder));

    return rows as MilestoneRow[];
  },

  async findMilestoneById(
    milestoneId: string,
    tenantId: string
  ): Promise<MilestoneRow | null> {
    const rows = await db
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.milestoneId, milestoneId),
          eq(milestones.tenantId, tenantId)
        )
      )
      .limit(1);

    return (rows[0] as MilestoneRow | undefined) ?? null;
  },

  async createMilestone(
    goalId: string,
    tenantId: string,
    input: MilestoneCreateInput
  ): Promise<MilestoneRow> {
    const rows = await db
      .insert(milestones)
      .values({
        goalId,
        tenantId,
        name: input.name,
        description: input.description ?? null,
        targetValue: input.targetValue ?? null,
        targetDate: input.targetDate ?? null,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();

    return rows[0] as MilestoneRow;
  },

  async updateMilestone(
    milestoneId: string,
    tenantId: string,
    input: MilestoneUpdateInput
  ): Promise<{ oldValue: MilestoneRow; newValue: MilestoneRow }> {
    const oldValue = await this.findMilestoneById(milestoneId, tenantId);
    if (!oldValue) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Milestone not found', 404);
    }

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.targetValue !== undefined) updateData.targetValue = input.targetValue;
    if (input.targetDate !== undefined) updateData.targetDate = input.targetDate;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === 'achieved') {
        updateData.achievedAt = sql`now()`;
      } else {
        updateData.achievedAt = null;
      }
    }

    const rows = await db
      .update(milestones)
      .set(updateData)
      .where(
        and(
          eq(milestones.milestoneId, milestoneId),
          eq(milestones.tenantId, tenantId)
        )
      )
      .returning();

    return { oldValue, newValue: rows[0] as MilestoneRow };
  },

  async deleteMilestone(
    milestoneId: string,
    tenantId: string
  ): Promise<MilestoneRow | null> {
    const rows = await db
      .delete(milestones)
      .where(
        and(
          eq(milestones.milestoneId, milestoneId),
          eq(milestones.tenantId, tenantId)
        )
      )
      .returning();

    return (rows[0] as MilestoneRow | undefined) ?? null;
  },

  async findPendingMilestonesPastDue(
    tenantId: string,
    asOf: Date
  ): Promise<MilestoneRow[]> {
    const rows = await db
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.tenantId, tenantId),
          eq(milestones.status, 'pending'),
          lte(milestones.targetDate, asOf)
        )
      );

    return rows as MilestoneRow[];
  },

  async findPendingMilestonesByGoalParam(
    tenantId: string,
    paramId: string
  ): Promise<(MilestoneRow & { goalParamId: string; goalDirection: string | null })[]> {
    const rows = await db
      .select({
        milestoneId: milestones.milestoneId,
        goalId: milestones.goalId,
        tenantId: milestones.tenantId,
        name: milestones.name,
        description: milestones.description,
        targetValue: milestones.targetValue,
        targetDate: milestones.targetDate,
        status: milestones.status,
        achievedAt: milestones.achievedAt,
        sortOrder: milestones.sortOrder,
        createdAt: milestones.createdAt,
        goalParamId: goals.paramId,
        goalDirection: goals.direction,
      })
      .from(milestones)
      .innerJoin(goals, eq(milestones.goalId, goals.goalId))
      .where(
        and(
          eq(milestones.tenantId, tenantId),
          eq(milestones.status, 'pending'),
          eq(goals.paramId, paramId),
          eq(goals.status, 'active')
        )
      );

    return rows as (MilestoneRow & { goalParamId: string; goalDirection: string | null })[];
  },

  async markMilestoneAchieved(
    milestoneId: string,
    tenantId: string
  ): Promise<MilestoneRow | null> {
    const rows = await db
      .update(milestones)
      .set({
        status: 'achieved',
        achievedAt: sql`now()`,
      })
      .where(
        and(
          eq(milestones.milestoneId, milestoneId),
          eq(milestones.tenantId, tenantId)
        )
      )
      .returning();

    return (rows[0] as MilestoneRow | undefined) ?? null;
  },

  async markMilestonesMissed(
    milestoneIds: string[],
    tenantId: string
  ): Promise<number> {
    if (milestoneIds.length === 0) return 0;

    const rows = await db
      .update(milestones)
      .set({ status: 'missed' })
      .where(
        and(
          eq(milestones.tenantId, tenantId),
          inArray(milestones.milestoneId, milestoneIds)
        )
      )
      .returning({ milestoneId: milestones.milestoneId });

    return rows.length;
  },
};
