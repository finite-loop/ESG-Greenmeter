import { peerRepository } from '@/db/repositories/peerRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import type { CreatePeer, UpdatePeer, PeerListFilter, PeerValuesFilter } from '@/schemas/peers';
import type { PeerRow, PeerKpiValueRow } from '@/db/repositories/peerRepository';

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
};
