import { peerRepository } from '@/db/repositories/peerRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { db } from '@/db';
import { tenants } from '@/db/schema/tenants';
import { eq, sql } from 'drizzle-orm';
import type { CreatePeer, UpdatePeer, PeerListFilter, PeerValuesFilter, PeerSuggestionsFilter, PeerSync } from '@/schemas/peers';
import type { PeerRow, PeerKpiValueRow, SuggestedPeer } from '@/db/repositories/peerRepository';

export interface SyncResult {
  sourceTenantId: string;
  status: 'created' | 'already_exists' | 'error';
  peerId: string | null;
  kpiCount: number;
  error?: string;
}

export const peerService = {
  async list(
    filters: PeerListFilter
  ): Promise<{ data: PeerRow[]; meta: { page: number; pageSize: number; total: number } }> {
    const result = await peerRepository.findAllByTenant(filters);

    return {
      data: result.data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },

  async getById(peerId: string): Promise<PeerRow> {
    const peer = await peerRepository.findById(peerId);

    if (!peer) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Peer organisation not found: ${peerId}`,
        404
      );
    }

    return peer;
  },

  async create(tenantId: string, input: CreatePeer): Promise<PeerRow> {
    return peerRepository.create({
      tenantId,
      name: input.name,
      sector: input.sector,
      country: input.country,
      marketCap: input.marketCap,
      exchange: input.exchange,
    });
  },

  async update(peerId: string, input: UpdatePeer): Promise<PeerRow> {
    const existing = await peerRepository.findById(peerId);

    if (!existing) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Peer organisation not found: ${peerId}`,
        404
      );
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.sector !== undefined) updates.sector = input.sector;
    if (input.country !== undefined) updates.country = input.country;
    if (input.marketCap !== undefined) updates.marketCap = input.marketCap;
    if (input.exchange !== undefined) updates.exchange = input.exchange;
    if (input.active !== undefined) updates.active = input.active;

    const updated = await peerRepository.update(peerId, updates);

    if (!updated) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'Failed to update peer organisation',
        500
      );
    }

    return updated;
  },

  async getValues(
    peerId: string,
    filters: PeerValuesFilter
  ): Promise<{ data: PeerKpiValueRow[]; meta: { page: number; pageSize: number; total: number } }> {
    // Verify peer exists
    const peer = await peerRepository.findById(peerId);

    if (!peer) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Peer organisation not found: ${peerId}`,
        404
      );
    }

    const result = await peerRepository.findValuesByPeerId(peerId, filters);

    return {
      data: result.data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },

  async getSuggestions(
    tenantId: string,
    filter: PeerSuggestionsFilter
  ): Promise<SuggestedPeer[]> {
    const tenantRows = await db
      .select({ gicsCode: tenants.gicsCode })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    const gicsCode = tenantRows[0]?.gicsCode;

    if (!gicsCode) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Tenant has no GICS industry code configured. Set a GICS code in organisation settings first.',
        400
      );
    }

    return peerRepository.findSuggestedPeers(tenantId, gicsCode, filter.matchLevel);
  },

  async syncSuggestions(
    tenantId: string,
    input: PeerSync
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const sourceTenantId of input.sourceTenantIds) {
      try {
        // Check if already synced
        const existing = await peerRepository.findBySourceTenantId(tenantId, sourceTenantId);

        if (existing) {
          results.push({
            sourceTenantId,
            status: 'already_exists',
            peerId: existing.peerId,
            kpiCount: 0,
          });
          continue;
        }

        // Get source tenant details
        const sourceRows = await db
          .select({
            name: tenants.name,
            sector: tenants.sector,
            country: tenants.country,
          })
          .from(tenants)
          .where(eq(tenants.tenantId, sourceTenantId))
          .limit(1);

        const source = sourceRows[0];

        if (!source) {
          results.push({
            sourceTenantId,
            status: 'error',
            peerId: null,
            kpiCount: 0,
            error: 'Source tenant not found',
          });
          continue;
        }

        // Create peer organisation linked to source tenant
        const peer = await peerRepository.create({
          tenantId,
          name: source.name,
          sector: source.sector ?? undefined,
          country: source.country ?? undefined,
          sourceTenantId,
        });

        // Read source tenant's KPI values (cross-tenant read with explicit WHERE)
        const kpiRows = await db.execute(
          sql`SELECT
                kv.param_id,
                kv.canonical_id,
                kv.period_id,
                rp.fiscal_year,
                kv.value::text AS value,
                kv.unit
              FROM kpi_values kv
              LEFT JOIN reporting_periods rp ON kv.period_id = rp.period_id
              WHERE kv.tenant_id = ${sourceTenantId}
                AND kv.value IS NOT NULL`
        );

        const kpiData = kpiRows as unknown as Array<{
          param_id: string;
          canonical_id: string | null;
          period_id: string | null;
          fiscal_year: string | null;
          value: string | null;
          unit: string | null;
        }>;

        // Map to peer KPI values format
        const mapped = kpiData.map((row) => ({
          paramId: row.param_id,
          canonicalId: row.canonical_id,
          periodId: row.period_id,
          fiscalYear: row.fiscal_year,
          value: row.value,
          unit: row.unit,
        }));

        const kpiCount = await peerRepository.bulkInsertPeerKpiValues(
          tenantId,
          peer.peerId,
          mapped
        );

        results.push({
          sourceTenantId,
          status: 'created',
          peerId: peer.peerId,
          kpiCount,
        });
      } catch (err: unknown) {
        results.push({
          sourceTenantId,
          status: 'error',
          peerId: null,
          kpiCount: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return results;
  },
};
