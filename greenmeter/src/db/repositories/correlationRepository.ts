import { db } from '@/db';
import { peerKpiValues } from '@/db/schema/extraction';
import { peerOrganisations } from '@/db/schema/peers';
import { canonicalMetrics } from '@/db/schema/kpi';
import { sql } from 'drizzle-orm';

/** Single peer metric row for correlation matrix building */
export interface CorrelationPeerRow {
  peerId: string;
  peerName: string;
  canonicalId: string;
  canonicalName: string;
  value: number;
}

export const correlationRepository = {
  /**
   * Fetch all peer metric values for a fiscal year, optionally filtered by sector.
   * Returns a flat list of (peerId, peerName, canonicalId, canonicalName, value) tuples
   * used to build the peers×metrics matrix for correlation analysis.
   */
  async getPeerMetrics(
    tenantId: string,
    fiscalYear: string,
    sector?: string
  ): Promise<CorrelationPeerRow[]> {
    const sectorCondition = sector
      ? sql`AND ${peerOrganisations.sector} = ${sector}`
      : sql``;

    const rows = await db.execute(
      sql`SELECT
            pkv.peer_id,
            po.name AS peer_name,
            pkv.canonical_id,
            cm.canonical_name,
            AVG(pkv.value::numeric) AS value
          FROM ${peerKpiValues} pkv
          INNER JOIN ${peerOrganisations} po
            ON pkv.peer_id = po.peer_id AND pkv.tenant_id = po.tenant_id
          INNER JOIN ${canonicalMetrics} cm
            ON pkv.canonical_id = cm.canonical_id
          WHERE pkv.tenant_id = ${tenantId}
            AND pkv.fiscal_year = ${fiscalYear}
            AND pkv.value IS NOT NULL
            AND pkv.value::numeric != 'NaN'::numeric
            AND pkv.value::numeric != 'Infinity'::numeric
            AND pkv.value::numeric != '-Infinity'::numeric
            AND pkv.canonical_id IS NOT NULL
            AND po.active = true
            ${sectorCondition}
          GROUP BY pkv.peer_id, po.name, pkv.canonical_id, cm.canonical_name`
    );

    return (rows as unknown as Record<string, unknown>[]).map((row) => ({
      peerId: row.peer_id as string,
      peerName: row.peer_name as string,
      canonicalId: row.canonical_id as string,
      canonicalName: row.canonical_name as string,
      value: Number(row.value),
    }));
  },
};
