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
}

export interface PeerRow {
  peerId: string;
  tenantId: string;
  name: string;
  sector: string | null;
  country: string | null;
  marketCap: string | null;
  exchange: string | null;
  active: boolean | null;
  createdAt: Date;
  updatedAt: Date;
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
};
