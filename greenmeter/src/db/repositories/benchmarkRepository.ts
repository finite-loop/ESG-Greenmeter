import { db } from '@/db';
import { peerKpiValues } from '@/db/schema/extraction';
import { peerOrganisations } from '@/db/schema/peers';
import { kpiValues, kpiParameters, canonicalMetrics } from '@/db/schema/kpi';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

/** Percentile breakdown for a single canonical metric */
export interface BenchmarkPercentiles {
  canonicalId: string;
  canonicalName: string;
  pillar: string;
  category: string;
  q1: number;
  median: number;
  q3: number;
  min: number;
  max: number;
  peerCount: number;
}

/** Tenant's own value for a canonical metric */
export interface TenantMetricValue {
  canonicalId: string;
  value: number;
  paramId: string;
}

export const benchmarkRepository = {
  /**
   * Compute percentile statistics for a canonical metric from peer KPI values.
   * Uses PostgreSQL percentile_cont for precise quartile calculation.
   * Filters by sector when provided.
   */
  async getPercentiles(
    tenantId: string,
    canonicalId: string,
    fiscalYear: string,
    sector?: string,
    peerIds?: string[]
  ): Promise<BenchmarkPercentiles | null> {
    const sectorCondition = sector
      ? sql`AND ${peerOrganisations.sector} = ${sector}`
      : sql``;

    const peerIdsCondition = peerIds && peerIds.length > 0
      ? sql`AND pkv.peer_id = ANY(${peerIds})`
      : sql``;

    const rows = await db.execute(
      sql`SELECT
            cm.canonical_id,
            cm.canonical_name,
            cm.pillar,
            cm.category,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY pkv.value::numeric) AS q1,
            percentile_cont(0.50) WITHIN GROUP (ORDER BY pkv.value::numeric) AS median,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY pkv.value::numeric) AS q3,
            MIN(pkv.value::numeric) AS min_val,
            MAX(pkv.value::numeric) AS max_val,
            COUNT(DISTINCT pkv.peer_id) AS peer_count
          FROM ${peerKpiValues} pkv
          INNER JOIN ${peerOrganisations} po
            ON pkv.peer_id = po.peer_id AND pkv.tenant_id = po.tenant_id
          INNER JOIN ${canonicalMetrics} cm
            ON pkv.canonical_id = cm.canonical_id
          WHERE pkv.tenant_id = ${tenantId}
            AND pkv.canonical_id = ${canonicalId}
            AND pkv.fiscal_year = ${fiscalYear}
            AND pkv.value IS NOT NULL
            AND po.active = true
            ${sectorCondition}
            ${peerIdsCondition}
          GROUP BY cm.canonical_id, cm.canonical_name, cm.pillar, cm.category
          HAVING COUNT(DISTINCT pkv.peer_id) >= 1`
    );

    const mapped = rows as unknown as Record<string, unknown>[];
    if (mapped.length === 0) return null;

    const row = mapped[0];
    return {
      canonicalId: row.canonical_id as string,
      canonicalName: row.canonical_name as string,
      pillar: row.pillar as string,
      category: row.category as string,
      q1: Number(row.q1),
      median: Number(row.median),
      q3: Number(row.q3),
      min: Number(row.min_val),
      max: Number(row.max_val),
      peerCount: Number(row.peer_count),
    };
  },

  /**
   * Get the tenant's own value for a canonical metric (latest node, specific period).
   * Joins kpi_values → kpi_parameters to find the canonical_id match.
   */
  async getTenantValue(
    tenantId: string,
    canonicalId: string,
    periodId: string
  ): Promise<TenantMetricValue | null> {
    const rows = await db
      .select({
        canonicalId: kpiParameters.canonicalId,
        value: kpiValues.value,
        paramId: kpiValues.paramId,
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
          eq(kpiParameters.canonicalId, canonicalId),
          eq(kpiValues.periodId, periodId),
          eq(kpiValues.notApplicable, false),
          isNotNull(kpiValues.value)
        )
      )
      .orderBy(sql`${kpiValues.createdAt} DESC`)
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      canonicalId: row.canonicalId as string,
      value: Number(row.value),
      paramId: row.paramId,
    };
  },

  /**
   * Compute the percentile rank of a given value within the peer distribution.
   * Formula: (count of peers with value < tenantValue) / total * 100
   */
  async getPercentileRank(
    tenantId: string,
    canonicalId: string,
    fiscalYear: string,
    tenantValue: number,
    sector?: string,
    peerIds?: string[]
  ): Promise<number> {
    const sectorCondition = sector
      ? sql`AND ${peerOrganisations.sector} = ${sector}`
      : sql``;

    const peerIdsCondition = peerIds && peerIds.length > 0
      ? sql`AND pkv.peer_id = ANY(${peerIds})`
      : sql``;

    const rows = await db.execute(
      sql`SELECT
            COUNT(DISTINCT CASE WHEN pkv.value::numeric < ${tenantValue} THEN pkv.peer_id END) AS below_count,
            COUNT(DISTINCT pkv.peer_id) AS total_count
          FROM ${peerKpiValues} pkv
          INNER JOIN ${peerOrganisations} po
            ON pkv.peer_id = po.peer_id AND pkv.tenant_id = po.tenant_id
          WHERE pkv.tenant_id = ${tenantId}
            AND pkv.canonical_id = ${canonicalId}
            AND pkv.fiscal_year = ${fiscalYear}
            AND pkv.value IS NOT NULL
            AND po.active = true
            ${sectorCondition}
            ${peerIdsCondition}`
    );

    const mapped = rows as unknown as Record<string, unknown>[];
    if (mapped.length === 0) return 0;

    const belowCount = Number(mapped[0].below_count);
    const totalCount = Number(mapped[0].total_count);

    if (totalCount === 0) return 0;
    return Math.round((belowCount / totalCount) * 100);
  },

  /**
   * Get all canonical metrics that have peer data for a given fiscal year.
   * Used to list available benchmarks.
   */
  async getAvailableMetrics(
    tenantId: string,
    fiscalYear: string,
    sector?: string,
    peerIds?: string[]
  ): Promise<{ canonicalId: string; canonicalName: string; pillar: string; category: string; peerCount: number }[]> {
    const sectorCondition = sector
      ? sql`AND ${peerOrganisations.sector} = ${sector}`
      : sql``;

    const peerIdsCondition = peerIds && peerIds.length > 0
      ? sql`AND pkv.peer_id = ANY(${peerIds})`
      : sql``;

    const rows = await db.execute(
      sql`SELECT
            cm.canonical_id,
            cm.canonical_name,
            cm.pillar,
            cm.category,
            COUNT(DISTINCT pkv.peer_id) AS peer_count
          FROM ${peerKpiValues} pkv
          INNER JOIN ${peerOrganisations} po
            ON pkv.peer_id = po.peer_id AND pkv.tenant_id = po.tenant_id
          INNER JOIN ${canonicalMetrics} cm
            ON pkv.canonical_id = cm.canonical_id
          WHERE pkv.tenant_id = ${tenantId}
            AND pkv.fiscal_year = ${fiscalYear}
            AND pkv.value IS NOT NULL
            AND po.active = true
            ${sectorCondition}
            ${peerIdsCondition}
          GROUP BY cm.canonical_id, cm.canonical_name, cm.pillar, cm.category
          ORDER BY cm.pillar, cm.category, cm.canonical_name`
    );

    return (rows as unknown as Record<string, unknown>[]).map((row) => ({
      canonicalId: row.canonical_id as string,
      canonicalName: row.canonical_name as string,
      pillar: row.pillar as string,
      category: row.category as string,
      peerCount: Number(row.peer_count),
    }));
  },
};
