import { db } from '@/db';
import { peerKpiValues } from '@/db/schema/extraction';
import { peerOrganisations } from '@/db/schema/peers';
import { canonicalMetrics, kpiValues, kpiParameters } from '@/db/schema/kpi';
import { reportingPeriods } from '@/db/schema/tenants';
import { sql } from 'drizzle-orm';

/** Single peer metric row for MDS matrix building */
export interface PeerMetricRow {
  peerId: string;
  peerName: string;
  canonicalId: string;
  value: number;
}

export const mdsRepository = {
  /**
   * Fetch all peer metric values for a fiscal year, optionally filtered by sector.
   * Returns a flat list of (peerId, peerName, canonicalId, value) tuples
   * used to build the companies×metrics matrix for MDS.
   */
  async getPeerMetrics(
    tenantId: string,
    fiscalYear: string,
    sector?: string
  ): Promise<PeerMetricRow[]> {
    const sectorCondition = sector
      ? sql`AND ${peerOrganisations.sector} = ${sector}`
      : sql``;

    const rows = await db.execute(
      sql`SELECT
            pkv.peer_id,
            po.name AS peer_name,
            pkv.canonical_id,
            pkv.value::numeric AS value
          FROM ${peerKpiValues} pkv
          INNER JOIN ${peerOrganisations} po
            ON pkv.peer_id = po.peer_id AND pkv.tenant_id = po.tenant_id
          WHERE pkv.tenant_id = ${tenantId}
            AND pkv.fiscal_year = ${fiscalYear}
            AND pkv.value IS NOT NULL
            AND pkv.canonical_id IS NOT NULL
            AND po.active = true
            ${sectorCondition}`
    );

    return (rows as unknown as Record<string, unknown>[]).map((row) => ({
      peerId: row.peer_id as string,
      peerName: row.peer_name as string,
      canonicalId: row.canonical_id as string,
      value: Number(row.value),
    }));
  },

  /**
   * Fetch the tenant's own metric values for a fiscal year.
   * Used to position the tenant on the MDS map.
   */
  async getTenantMetrics(
    tenantId: string,
    fiscalYear: string
  ): Promise<{ canonicalId: string; value: number }[]> {
    const rows = await db.execute(
      sql`SELECT DISTINCT ON (kp.canonical_id)
            kp.canonical_id,
            kv.value::numeric AS value
          FROM ${kpiValues} kv
          INNER JOIN ${kpiParameters} kp
            ON kv.param_id = kp.param_id AND kv.tenant_id = kp.tenant_id
          INNER JOIN ${canonicalMetrics} cm
            ON kp.canonical_id = cm.canonical_id
          INNER JOIN ${reportingPeriods} rp
            ON kv.period_id = rp.period_id AND kv.tenant_id = rp.tenant_id
          WHERE kv.tenant_id = ${tenantId}
            AND rp.fiscal_year = ${fiscalYear}
            AND kv.value IS NOT NULL
            AND kv.not_applicable = false
            AND kp.canonical_id IS NOT NULL
          ORDER BY kp.canonical_id, kv.created_at DESC`
    );

    return (rows as unknown as Record<string, unknown>[]).map((row) => ({
      canonicalId: row.canonical_id as string,
      value: Number(row.value),
    }));
  },
};
