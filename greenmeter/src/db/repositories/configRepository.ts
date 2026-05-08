import { db } from '@/db';
import { tenantConfig, thresholds, scoringWeights } from '@/db/schema/config';
import { kpiParameters } from '@/db/schema/kpi';
import { eq, and, isNull, sql, like } from 'drizzle-orm';

export interface ThresholdRow {
  thresholdId: string;
  tenantId: string | null;
  paramId: string | null;
  category: string | null;
  pillar: string | null;
  redMax: string | null;
  amberMax: string | null;
  unit: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeightRow {
  weightId: string;
  tenantId: string | null;
  pillar: string;
  category: string;
  weight: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThresholdWithParam extends ThresholdRow {
  paramName: string | null;
  paramCode: string | null;
}

export interface UpsertThresholdInput {
  paramId?: string | null;
  category?: string | null;
  pillar?: string | null;
  redMax: string;
  amberMax: string;
  unit?: string | null;
}

export interface UpsertWeightInput {
  pillar: string;
  category: string;
  weight: string;
}

export interface TenantConfigRow {
  configId: string;
  tenantId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export const configRepository = {
  /**
   * Get all thresholds visible to a tenant (tenant overrides + platform defaults).
   * Tenant-specific rows are returned first (priority ordering).
   */
  async getThresholds(tenantId: string): Promise<ThresholdRow[]> {
    const rows = await db
      .select()
      .from(thresholds)
      .where(
        sql`${thresholds.tenantId} = ${tenantId} OR ${thresholds.tenantId} IS NULL`
      )
      .orderBy(
        sql`CASE WHEN ${thresholds.tenantId} IS NOT NULL THEN 0 ELSE 1 END`,
        sql`${thresholds.pillar} ASC NULLS LAST`,
        sql`${thresholds.category} ASC NULLS LAST`
      );

    return rows as ThresholdRow[];
  },

  /**
   * Get thresholds with parameter name/code info for display purposes.
   */
  async getThresholdsWithParams(tenantId: string): Promise<ThresholdWithParam[]> {
    const rows = await db
      .select({
        thresholdId: thresholds.thresholdId,
        tenantId: thresholds.tenantId,
        paramId: thresholds.paramId,
        category: thresholds.category,
        pillar: thresholds.pillar,
        redMax: thresholds.redMax,
        amberMax: thresholds.amberMax,
        unit: thresholds.unit,
        createdAt: thresholds.createdAt,
        updatedAt: thresholds.updatedAt,
        paramName: kpiParameters.name,
        paramCode: kpiParameters.code,
      })
      .from(thresholds)
      .leftJoin(
        kpiParameters,
        eq(thresholds.paramId, kpiParameters.paramId)
      )
      .where(
        sql`${thresholds.tenantId} = ${tenantId} OR ${thresholds.tenantId} IS NULL`
      )
      .orderBy(
        sql`CASE WHEN ${thresholds.tenantId} IS NOT NULL THEN 0 ELSE 1 END`,
        sql`${thresholds.pillar} ASC NULLS LAST`,
        sql`${thresholds.category} ASC NULLS LAST`
      );

    return rows as ThresholdWithParam[];
  },

  /**
   * Upsert a tenant-specific threshold override.
   * If a matching tenant threshold exists (same paramId+category+pillar), update it.
   * Otherwise insert a new row.
   */
  async upsertThreshold(
    tenantId: string,
    input: UpsertThresholdInput
  ): Promise<{ oldValue: ThresholdRow | null; newValue: ThresholdRow }> {
    return db.transaction(async (tx) => {
      // Find existing tenant-specific threshold matching scope
      const existing = await tx
        .select()
        .from(thresholds)
        .where(
          and(
            eq(thresholds.tenantId, tenantId),
            input.paramId
              ? eq(thresholds.paramId, input.paramId)
              : isNull(thresholds.paramId),
            input.category
              ? eq(thresholds.category, input.category)
              : isNull(thresholds.category),
            input.pillar
              ? eq(thresholds.pillar, input.pillar)
              : isNull(thresholds.pillar)
          )
        )
        .limit(1);

      const oldValue = (existing[0] as ThresholdRow | undefined) ?? null;

      if (oldValue) {
        // Update existing tenant override
        const updated = await tx
          .update(thresholds)
          .set({
            redMax: input.redMax,
            amberMax: input.amberMax,
            unit: input.unit ?? oldValue.unit,
            updatedAt: sql`now()`,
          })
          .where(eq(thresholds.thresholdId, oldValue.thresholdId))
          .returning();

        return { oldValue, newValue: updated[0] as ThresholdRow };
      }

      // Insert new tenant override
      const inserted = await tx
        .insert(thresholds)
        .values({
          tenantId,
          paramId: input.paramId ?? null,
          category: input.category ?? null,
          pillar: input.pillar ?? null,
          redMax: input.redMax,
          amberMax: input.amberMax,
          unit: input.unit ?? null,
        })
        .returning();

      return { oldValue: null, newValue: inserted[0] as ThresholdRow };
    });
  },

  /**
   * Get all weights visible to a tenant (tenant overrides + platform defaults).
   */
  async getWeights(tenantId: string): Promise<WeightRow[]> {
    const rows = await db
      .select()
      .from(scoringWeights)
      .where(
        sql`${scoringWeights.tenantId} = ${tenantId} OR ${scoringWeights.tenantId} IS NULL`
      )
      .orderBy(
        sql`CASE WHEN ${scoringWeights.tenantId} IS NOT NULL THEN 0 ELSE 1 END`,
        sql`${scoringWeights.pillar} ASC`,
        sql`${scoringWeights.category} ASC`
      );

    return rows as WeightRow[];
  },

  /**
   * Replace all tenant-specific weights with the provided set.
   * Deletes existing tenant weights, then inserts the new ones.
   * Returns old and new weight arrays.
   */
  async replaceWeights(
    tenantId: string,
    weights: UpsertWeightInput[]
  ): Promise<{ oldValues: WeightRow[]; newValues: WeightRow[] }> {
    return db.transaction(async (tx) => {
      // Get existing tenant weights before deletion
      const oldValues = await tx
        .select()
        .from(scoringWeights)
        .where(eq(scoringWeights.tenantId, tenantId));

      // Delete all existing tenant weights
      await tx
        .delete(scoringWeights)
        .where(eq(scoringWeights.tenantId, tenantId));

      if (weights.length === 0) {
        return { oldValues: oldValues as WeightRow[], newValues: [] };
      }

      // Insert new weights
      const newValues = await tx
        .insert(scoringWeights)
        .values(
          weights.map((w) => ({
            tenantId,
            pillar: w.pillar,
            category: w.category,
            weight: w.weight,
          }))
        )
        .returning();

      return {
        oldValues: oldValues as WeightRow[],
        newValues: newValues as WeightRow[],
      };
    });
  },

  // ─── Integration Configuration Methods ─────────────────────────────

  /**
   * Get all integration config entries for a tenant.
   * Keys are prefixed with 'integration_' (e.g. 'integration_sap').
   */
  async getIntegrationConfigs(tenantId: string): Promise<TenantConfigRow[]> {
    const rows = await db
      .select()
      .from(tenantConfig)
      .where(
        and(
          eq(tenantConfig.tenantId, tenantId),
          like(tenantConfig.key, 'integration_%')
        )
      )
      .orderBy(tenantConfig.key);

    return rows as TenantConfigRow[];
  },

  /**
   * Get a single integration config by type.
   */
  async getIntegrationConfig(
    tenantId: string,
    integrationType: string
  ): Promise<TenantConfigRow | null> {
    const key = `integration_${integrationType}`;
    const rows = await db
      .select()
      .from(tenantConfig)
      .where(
        and(
          eq(tenantConfig.tenantId, tenantId),
          eq(tenantConfig.key, key)
        )
      )
      .limit(1);

    return (rows[0] as TenantConfigRow | undefined) ?? null;
  },

  /**
   * Upsert an integration config entry.
   * Uses the tenant_config table with key = 'integration_{type}'.
   */
  async upsertIntegrationConfig(
    tenantId: string,
    integrationType: string,
    value: unknown
  ): Promise<{ oldValue: TenantConfigRow | null; newValue: TenantConfigRow }> {
    const key = `integration_${integrationType}`;

    return db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(tenantConfig)
        .where(
          and(
            eq(tenantConfig.tenantId, tenantId),
            eq(tenantConfig.key, key)
          )
        )
        .limit(1);

      const oldValue = (existing[0] as TenantConfigRow | undefined) ?? null;

      if (oldValue) {
        const updated = await tx
          .update(tenantConfig)
          .set({
            value,
            updatedAt: sql`now()`,
          })
          .where(eq(tenantConfig.configId, oldValue.configId))
          .returning();

        return { oldValue, newValue: updated[0] as TenantConfigRow };
      }

      const inserted = await tx
        .insert(tenantConfig)
        .values({
          tenantId,
          key,
          value,
        })
        .returning();

      return { oldValue: null, newValue: inserted[0] as TenantConfigRow };
    });
  },
};
