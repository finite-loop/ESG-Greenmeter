import { db } from '@/db';
import { kpiValues, kpiParameters } from '@/db/schema/kpi';
import { users } from '@/db/schema/auth';
import { eq, and, sql, asc, inArray } from 'drizzle-orm';
import type { KpiValueCreate, KpiValueUpdate } from '@/schemas/kpi';

export interface KpiValueRow {
  valueId: string;
  tenantId: string;
  paramId: string;
  canonicalId: string | null;
  nodeId: string;
  periodId: string;
  value: string | null;
  valueText: string | null;
  unit: string | null;
  sourceType: string;
  sourceRef: string | null;
  verified: boolean | null;
  notApplicable: boolean | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Result of findByFilters — LEFT JOINs parameters with values, so value fields are nullable when no value exists. */
export interface KpiValueWithParam {
  valueId: string | null;
  tenantId: string;
  paramId: string;
  canonicalId: string | null;
  nodeId: string | null;
  periodId: string | null;
  value: string | null;
  valueText: string | null;
  unit: string | null;
  sourceType: string | null;
  sourceRef: string | null;
  verified: boolean | null;
  notApplicable: boolean | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  paramName: string;
  paramCode: string;
  pillar: string;
  category: string | null;
  standard: string;
  paramUnit: string;
  dataType: string;
}

export interface KpiValueFilters {
  periodId?: string;
  standard?: string;
  pillar?: string;
  category?: string;
  department?: string;
  nodeId?: string;
  page: number;
  pageSize: number;
}

export const kpiRepository = {
  /**
   * Finds KPI parameters LEFT JOINed with their values for a given period/node,
   * filtered by standard, pillar, category, and department. Results are paginated
   * at the SQL level. Parameters without values appear with null value fields (RAG 'red').
   */
  async findByFilters(
    tenantId: string,
    filters: KpiValueFilters
  ): Promise<{ data: KpiValueWithParam[]; total: number }> {
    // WHERE conditions on kpi_parameters
    const paramConditions = [eq(kpiParameters.tenantId, tenantId)];

    if (filters.standard) {
      paramConditions.push(eq(kpiParameters.standard, filters.standard));
    }
    if (filters.pillar) {
      paramConditions.push(eq(kpiParameters.pillar, filters.pillar));
    }
    if (filters.category) {
      paramConditions.push(eq(kpiParameters.category, filters.category));
    }
    if (filters.department) {
      paramConditions.push(sql`${kpiParameters.depts} @> ARRAY[${filters.department}]`);
    }

    const paramWhere = and(...paramConditions);

    // LEFT JOIN condition: match paramId AND scope to selected period/node
    const joinConditions = [eq(kpiValues.paramId, kpiParameters.paramId)];
    if (filters.periodId) {
      joinConditions.push(eq(kpiValues.periodId, filters.periodId));
    }
    if (filters.nodeId) {
      joinConditions.push(eq(kpiValues.nodeId, filters.nodeId));
    }

    // Count total matching parameters
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kpiParameters)
      .where(paramWhere);

    const total = countResult[0]?.count ?? 0;

    // Fetch paginated results with LEFT JOIN to kpi_values
    const offset = (filters.page - 1) * filters.pageSize;

    const rows = await db
      .select({
        valueId: kpiValues.valueId,
        tenantId: kpiParameters.tenantId,
        paramId: kpiParameters.paramId,
        canonicalId: kpiValues.canonicalId,
        nodeId: kpiValues.nodeId,
        periodId: kpiValues.periodId,
        value: kpiValues.value,
        valueText: kpiValues.valueText,
        unit: kpiValues.unit,
        sourceType: kpiValues.sourceType,
        sourceRef: kpiValues.sourceRef,
        verified: kpiValues.verified,
        notApplicable: kpiValues.notApplicable,
        verifiedBy: kpiValues.verifiedBy,
        verifiedByName: users.name,
        verifiedAt: kpiValues.verifiedAt,
        createdAt: kpiValues.createdAt,
        updatedAt: kpiValues.updatedAt,
        paramName: kpiParameters.name,
        paramCode: kpiParameters.code,
        pillar: kpiParameters.pillar,
        category: kpiParameters.category,
        standard: kpiParameters.standard,
        paramUnit: kpiParameters.unit,
        dataType: kpiParameters.dataType,
      })
      .from(kpiParameters)
      .leftJoin(kpiValues, and(...joinConditions))
      .leftJoin(users, eq(kpiValues.verifiedBy, users.userId))
      .where(paramWhere)
      .orderBy(asc(kpiParameters.priorityOrder), asc(kpiParameters.code))
      .limit(filters.pageSize)
      .offset(offset);

    return { data: rows as KpiValueWithParam[], total };
  },

  /**
   * Finds a single KPI value by its valueId.
   */
  async findById(
    valueId: string,
    tenantId: string
  ): Promise<KpiValueRow | null> {
    const rows = await db
      .select()
      .from(kpiValues)
      .where(
        and(
          eq(kpiValues.valueId, valueId),
          eq(kpiValues.tenantId, tenantId)
        )
      )
      .limit(1);

    return (rows[0] as KpiValueRow | undefined) ?? null;
  },

  /**
   * Inserts a new KPI value.
   * The unique constraint (tenantId, paramId, nodeId, periodId) prevents duplicates.
   */
  async insert(
    tenantId: string,
    input: KpiValueCreate
  ): Promise<KpiValueRow> {
    const rows = await db
      .insert(kpiValues)
      .values({
        tenantId,
        paramId: input.paramId,
        nodeId: input.nodeId,
        periodId: input.periodId,
        value: input.value ?? null,
        valueText: input.valueText ?? null,
        unit: input.unit ?? null,
        sourceType: input.sourceType,
        sourceRef: input.sourceRef ?? null,
        notApplicable: input.notApplicable ?? false,
      })
      .returning();

    return rows[0] as KpiValueRow;
  },

  /**
   * Updates a KPI value and returns both old and new values for audit.
   */
  async update(
    valueId: string,
    tenantId: string,
    input: KpiValueUpdate
  ): Promise<{ oldValue: KpiValueRow; newValue: KpiValueRow }> {
    // Capture old value
    const oldValue = await this.findById(valueId, tenantId);
    if (!oldValue) {
      throw new Error('KPI value not found');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: sql`now()`,
    };

    if (input.value !== undefined) updateData.value = input.value;
    if (input.valueText !== undefined) updateData.valueText = input.valueText;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.sourceType !== undefined) updateData.sourceType = input.sourceType;
    if (input.sourceRef !== undefined) updateData.sourceRef = input.sourceRef;
    if (input.notApplicable !== undefined) updateData.notApplicable = input.notApplicable;

    const rows = await db
      .update(kpiValues)
      .set(updateData)
      .where(
        and(
          eq(kpiValues.valueId, valueId),
          eq(kpiValues.tenantId, tenantId)
        )
      )
      .returning();

    return { oldValue, newValue: rows[0] as KpiValueRow };
  },

  /**
   * Deletes a KPI value. Returns the deleted row for audit.
   * Validates tenant ownership via the where clause.
   */
  async delete(
    valueId: string,
    tenantId: string
  ): Promise<KpiValueRow | null> {
    const rows = await db
      .delete(kpiValues)
      .where(
        and(
          eq(kpiValues.valueId, valueId),
          eq(kpiValues.tenantId, tenantId)
        )
      )
      .returning();

    return (rows[0] as KpiValueRow | undefined) ?? null;
  },

  /**
   * Batch verify: sets verified=true, verifiedBy, verifiedAt on multiple values.
   * Runs in a transaction — validates count before UPDATE to prevent partial updates.
   * Only updates values that are not already verified (preserves original verifier).
   */
  async batchVerify(
    valueIds: string[],
    tenantId: string,
    userId: string
  ): Promise<{ oldValues: KpiValueRow[]; newValues: KpiValueRow[] }> {
    return db.transaction(async (tx) => {
      // Capture old values inside transaction
      const oldValues = await tx
        .select()
        .from(kpiValues)
        .where(
          and(
            inArray(kpiValues.valueId, valueIds),
            eq(kpiValues.tenantId, tenantId)
          )
        );

      // Validate all requested IDs exist before mutating
      if (oldValues.length !== valueIds.length) {
        throw new Error('COUNT_MISMATCH');
      }

      // Only update values that are not already verified (preserve original verifier)
      const newValues = await tx
        .update(kpiValues)
        .set({
          verified: true,
          verifiedBy: userId,
          verifiedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            inArray(kpiValues.valueId, valueIds),
            eq(kpiValues.tenantId, tenantId),
            eq(kpiValues.verified, false)
          )
        )
        .returning();

      return { oldValues: oldValues as KpiValueRow[], newValues: newValues as KpiValueRow[] };
    });
  },

  /**
   * Batch mark not applicable: sets notApplicable=true on multiple values.
   * Runs in a transaction — validates count before UPDATE.
   * Clears verified/verifiedBy/verifiedAt to prevent contradictory state.
   */
  async batchMarkNotApplicable(
    valueIds: string[],
    tenantId: string
  ): Promise<{ oldValues: KpiValueRow[]; newValues: KpiValueRow[] }> {
    return db.transaction(async (tx) => {
      // Capture old values inside transaction
      const oldValues = await tx
        .select()
        .from(kpiValues)
        .where(
          and(
            inArray(kpiValues.valueId, valueIds),
            eq(kpiValues.tenantId, tenantId)
          )
        );

      // Validate all requested IDs exist before mutating
      if (oldValues.length !== valueIds.length) {
        throw new Error('COUNT_MISMATCH');
      }

      // Clear verified state when marking N/A to prevent contradictory state
      const newValues = await tx
        .update(kpiValues)
        .set({
          notApplicable: true,
          verified: false,
          verifiedBy: null,
          verifiedAt: null,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            inArray(kpiValues.valueId, valueIds),
            eq(kpiValues.tenantId, tenantId)
          )
        )
        .returning();

      return { oldValues: oldValues as KpiValueRow[], newValues: newValues as KpiValueRow[] };
    });
  },

  /**
   * Checks that ALL values belong to parameters whose depts array includes the given departmentId.
   * Returns true if all values pass the scope check, false if any are outside scope.
   */
  async checkDepartmentScope(
    valueIds: string[],
    tenantId: string,
    departmentId: string
  ): Promise<boolean> {
    const outOfScope = await db
      .select({ valueId: kpiValues.valueId })
      .from(kpiValues)
      .innerJoin(kpiParameters, eq(kpiValues.paramId, kpiParameters.paramId))
      .where(
        and(
          inArray(kpiValues.valueId, valueIds),
          eq(kpiValues.tenantId, tenantId),
          sql`NOT (${kpiParameters.depts} @> ARRAY[${departmentId}])`
        )
      )
      .limit(1);

    return outOfScope.length === 0;
  },

  /**
   * Checks if a KPI value already exists for the given param+node+period combination.
   */
  async findByParamNodePeriod(
    tenantId: string,
    paramId: string,
    nodeId: string,
    periodId: string
  ): Promise<KpiValueRow | null> {
    const rows = await db
      .select()
      .from(kpiValues)
      .where(
        and(
          eq(kpiValues.tenantId, tenantId),
          eq(kpiValues.paramId, paramId),
          eq(kpiValues.nodeId, nodeId),
          eq(kpiValues.periodId, periodId)
        )
      )
      .limit(1);

    return (rows[0] as KpiValueRow | undefined) ?? null;
  },
};
