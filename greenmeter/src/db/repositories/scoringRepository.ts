import { db } from '@/db';
import { kpiValues, kpiParameters } from '@/db/schema/kpi';
import { scoringWeights, thresholds } from '@/db/schema/config';
import { eq, and, isNull, sql } from 'drizzle-orm';

export interface ThresholdRow {
  thresholdId: string;
  tenantId: string | null;
  paramId: string | null;
  category: string | null;
  pillar: string | null;
  redMax: string | null;
  amberMax: string | null;
  unit: string | null;
}

export interface WeightRow {
  weightId: string;
  tenantId: string | null;
  pillar: string;
  category: string;
  weight: string;
}

export interface KpiValueForScoring {
  paramId: string;
  value: string | null;
  pillar: string;
  category: string | null;
  direction: string | null;
}

export interface EsgScoreRow {
  tenantId: string;
  nodeId: string;
  periodId: string;
  pillar: string;
  category: string;
  categoryScore: string;
  pillarScore: string;
  overallScore: string;
  paramCount: string;
  computedAt: Date;
}

export interface CoverageSummaryRow {
  tenantId: string;
  framework: string;
  periodId: string;
  totalParams: number;
  hasValueCount: number;
  verifiedCount: number;
  coveragePct: number;
  verifiedPct: number;
  computedAt: Date;
}

export const scoringRepository = {
  /**
   * Get all KPI values with their parameter metadata for scoring.
   * Joins kpi_values with kpi_parameters to get pillar, category, direction.
   */
  async getValuesForScoring(
    tenantId: string,
    nodeId: string,
    periodId: string
  ): Promise<KpiValueForScoring[]> {
    const rows = await db
      .select({
        paramId: kpiParameters.paramId,
        value: kpiValues.value,
        pillar: kpiParameters.pillar,
        category: kpiParameters.category,
        direction: kpiParameters.direction,
      })
      .from(kpiValues)
      .innerJoin(
        kpiParameters,
        and(
          eq(kpiValues.paramId, kpiParameters.paramId),
          eq(kpiValues.tenantId, kpiParameters.tenantId)
        )
      )
      .where(
        and(
          eq(kpiValues.tenantId, tenantId),
          eq(kpiValues.nodeId, nodeId),
          eq(kpiValues.periodId, periodId),
          eq(kpiValues.notApplicable, false)
        )
      );

    return rows as KpiValueForScoring[];
  },

  /**
   * Get thresholds for a tenant. Returns tenant-specific thresholds,
   * falling back to platform defaults (tenantId IS NULL).
   */
  async getThresholds(tenantId: string): Promise<ThresholdRow[]> {
    const rows = await db
      .select()
      .from(thresholds)
      .where(
        sql`${thresholds.tenantId} = ${tenantId} OR ${thresholds.tenantId} IS NULL`
      )
      .orderBy(
        sql`CASE WHEN ${thresholds.tenantId} IS NOT NULL THEN 0 ELSE 1 END`
      );

    return rows as ThresholdRow[];
  },

  /**
   * Get scoring weights for a tenant. Returns tenant-specific weights,
   * falling back to platform defaults (tenantId IS NULL).
   */
  async getWeights(tenantId: string): Promise<WeightRow[]> {
    const rows = await db
      .select()
      .from(scoringWeights)
      .where(
        sql`${scoringWeights.tenantId} = ${tenantId} OR ${scoringWeights.tenantId} IS NULL`
      )
      .orderBy(
        sql`CASE WHEN ${scoringWeights.tenantId} IS NOT NULL THEN 0 ELSE 1 END`
      );

    return rows as WeightRow[];
  },

  /**
   * Query pre-computed scores from the esg_scores materialized view.
   */
  async getScores(
    tenantId: string,
    nodeId: string,
    periodId: string
  ): Promise<EsgScoreRow[]> {
    const rows = await db.execute(
      sql`SELECT tenant_id, node_id, period_id, pillar, category,
            category_score, pillar_score, overall_score, param_count, computed_at
          FROM esg_scores
          WHERE tenant_id = ${tenantId}
            AND node_id = ${nodeId}
            AND period_id = ${periodId}`
    );

    return (rows as unknown as Record<string, unknown>[]).map((row) => ({
      tenantId: row.tenant_id as string,
      nodeId: row.node_id as string,
      periodId: row.period_id as string,
      pillar: row.pillar as string,
      category: row.category as string,
      categoryScore: row.category_score as string,
      pillarScore: row.pillar_score as string,
      overallScore: row.overall_score as string,
      paramCount: row.param_count as string,
      computedAt: row.computed_at as Date,
    }));
  },

  /**
   * Refresh the esg_scores materialized view concurrently.
   */
  async refreshScores(): Promise<void> {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY esg_scores`);
  },

  /**
   * Refresh the coverage_summary materialized view concurrently.
   */
  async refreshCoverageSummary(): Promise<void> {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY coverage_summary`);
  },

  /**
   * Query coverage summary from the materialized view.
   */
  async getCoverageSummary(
    tenantId: string,
    periodId: string
  ): Promise<CoverageSummaryRow[]> {
    const rows = await db.execute(
      sql`SELECT tenant_id, framework, period_id,
            total_params, has_value_count, verified_count,
            coverage_pct, verified_pct, computed_at
          FROM coverage_summary
          WHERE tenant_id = ${tenantId}
            AND period_id = ${periodId}`
    );

    return (rows as unknown as Record<string, unknown>[]).map((row) => ({
      tenantId: row.tenant_id as string,
      framework: row.framework as string,
      periodId: row.period_id as string,
      totalParams: Number(row.total_params),
      hasValueCount: Number(row.has_value_count),
      verifiedCount: Number(row.verified_count),
      coveragePct: Number(row.coverage_pct),
      verifiedPct: Number(row.verified_pct),
      computedAt: row.computed_at as Date,
    }));
  },
};
