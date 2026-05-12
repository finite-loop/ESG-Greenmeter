import { db } from '@/db';
import { peerOrganisations } from '@/db/schema/peers';
import { peerKpiValues } from '@/db/schema/extraction';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';
import type { PeerListFilter, PeerValuesFilter } from '@/schemas/peers';

export interface PeerInsert {
  tenantId: string;
  name: string;
  sector?: string;
  country?: string;
  marketCap?: string;
  exchange?: string;
  sourceTenantId?: string;
}

export interface PeerRow {
  peerId: string;
  tenantId: string;
  name: string;
  sector: string | null;
  country: string | null;
  marketCap: string | null;
  exchange: string | null;
  sourceTenantId: string | null;
  active: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestedPeer {
  tenantId: string;
  name: string;
  sector: string | null;
  country: string | null;
  gicsCode: string | null;
  kpiCount: number;
  existingPeerId: string | null;
}

export interface PeerKpiValueRow {
  peerValueId: string;
  tenantId: string;
  peerId: string;
  paramId: string;
  canonicalId: string | null;
  periodId: string | null;
  fiscalYear: string | null;
  value: string | null;
  unit: string | null;
  sourceExtractionId: string | null;
  sourceMetricId: string | null;
  confidence: string | null;
  verified: boolean | null;
  createdAt: Date;
}

export const peerRepository = {
  async findAllByTenant(
    filters: PeerListFilter
  ): Promise<{ data: PeerRow[]; total: number }> {
    const conditions = [];

    if (filters.search) {
      const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
      conditions.push(ilike(peerOrganisations.name, `%${escaped}%`));
    }
    if (filters.sector) {
      conditions.push(eq(peerOrganisations.sector, filters.sector));
    }
    if (filters.active !== undefined) {
      conditions.push(eq(peerOrganisations.active, filters.active));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(peerOrganisations)
        .where(where)
        .orderBy(desc(peerOrganisations.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(peerOrganisations)
        .where(where),
    ]);

    return {
      data: data as PeerRow[],
      total: countResult[0]?.count ?? 0,
    };
  },

  async findById(peerId: string): Promise<PeerRow | null> {
    const result = await db
      .select()
      .from(peerOrganisations)
      .where(eq(peerOrganisations.peerId, peerId))
      .limit(1);

    return (result[0] as PeerRow) ?? null;
  },

  async create(peer: PeerInsert): Promise<PeerRow> {
    const result = await db
      .insert(peerOrganisations)
      .values({
        tenantId: peer.tenantId,
        name: peer.name,
        sector: peer.sector ?? null,
        country: peer.country ?? null,
        marketCap: peer.marketCap ?? null,
        exchange: peer.exchange ?? null,
        sourceTenantId: peer.sourceTenantId ?? null,
      })
      .returning();

    return result[0] as PeerRow;
  },

  async update(
    peerId: string,
    updates: Partial<Omit<PeerInsert, 'tenantId'>> & { active?: boolean }
  ): Promise<PeerRow | null> {
    const result = await db
      .update(peerOrganisations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(peerOrganisations.peerId, peerId))
      .returning();

    return (result[0] as PeerRow) ?? null;
  },

  async findValuesByPeerId(
    peerId: string,
    filters: PeerValuesFilter
  ): Promise<{ data: PeerKpiValueRow[]; total: number }> {
    const conditions = [eq(peerKpiValues.peerId, peerId)];

    if (filters.fiscalYear) {
      conditions.push(eq(peerKpiValues.fiscalYear, filters.fiscalYear));
    }
    if (filters.paramId) {
      conditions.push(eq(peerKpiValues.paramId, filters.paramId));
    }

    const where = and(...conditions);
    const offset = (filters.page - 1) * filters.pageSize;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(peerKpiValues)
        .where(where)
        .orderBy(desc(peerKpiValues.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(peerKpiValues)
        .where(where),
    ]);

    return {
      data: data as PeerKpiValueRow[],
      total: countResult[0]?.count ?? 0,
    };
  },

  async findSuggestedPeers(
    tenantId: string,
    gicsCode: string,
    matchLevel: number
  ): Promise<SuggestedPeer[]> {
    const prefix = gicsCode.substring(0, matchLevel);

    const rows = await db.execute(
      sql`SELECT
            t.tenant_id,
            t.name,
            t.sector,
            t.country,
            t.gics_code,
            COALESCE(kpi_counts.cnt, 0)::int AS kpi_count,
            po.peer_id AS existing_peer_id
          FROM tenants t
          LEFT JOIN peer_organisations po
            ON po.tenant_id = ${tenantId}
            AND po.source_tenant_id = t.tenant_id
            AND po.active = true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS cnt
            FROM kpi_values kv
            WHERE kv.tenant_id = t.tenant_id
          ) kpi_counts ON true
          WHERE t.tenant_id != ${tenantId}
            AND t.active = true
            AND t.gics_code IS NOT NULL
            AND LEFT(t.gics_code, ${matchLevel}) = ${prefix}
          ORDER BY t.name`
    );

    const mapped = rows as unknown as Array<{
      tenant_id: string;
      name: string;
      sector: string | null;
      country: string | null;
      gics_code: string | null;
      kpi_count: number;
      existing_peer_id: string | null;
    }>;

    return mapped.map((r) => ({
      tenantId: r.tenant_id,
      name: r.name,
      sector: r.sector,
      country: r.country,
      gicsCode: r.gics_code,
      kpiCount: r.kpi_count,
      existingPeerId: r.existing_peer_id,
    }));
  },

  async findBySourceTenantId(
    tenantId: string,
    sourceTenantId: string
  ): Promise<PeerRow | null> {
    const result = await db
      .select()
      .from(peerOrganisations)
      .where(
        and(
          eq(peerOrganisations.tenantId, tenantId),
          eq(peerOrganisations.sourceTenantId, sourceTenantId)
        )
      )
      .limit(1);

    return (result[0] as PeerRow) ?? null;
  },

  async bulkInsertPeerKpiValues(
    tenantId: string,
    peerId: string,
    values: Array<{
      paramId: string;
      canonicalId: string | null;
      periodId: string | null;
      fiscalYear: string | null;
      value: string | null;
      unit: string | null;
    }>
  ): Promise<number> {
    if (values.length === 0) return 0;

    let inserted = 0;
    const batchSize = 100;

    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);

      const rows = batch.map((v) => ({
        tenantId,
        peerId,
        paramId: v.paramId,
        canonicalId: v.canonicalId,
        periodId: v.periodId,
        fiscalYear: v.fiscalYear,
        value: v.value,
        unit: v.unit,
      }));

      const result = await db
        .insert(peerKpiValues)
        .values(rows)
        .onConflictDoUpdate({
          target: [
            peerKpiValues.tenantId,
            peerKpiValues.peerId,
            peerKpiValues.paramId,
            peerKpiValues.fiscalYear,
          ],
          set: {
            value: sql`EXCLUDED.value`,
            unit: sql`EXCLUDED.unit`,
            canonicalId: sql`EXCLUDED.canonical_id`,
          },
        })
        .returning({ peerValueId: peerKpiValues.peerValueId });

      inserted += result.length;
    }

    return inserted;
  },
};
