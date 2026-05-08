'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface PeerOrganisation {
  peerId: string;
  tenantId: string;
  name: string;
  sector: string | null;
  country: string | null;
  marketCap: string | null;
  exchange: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PeerListResponse {
  data: PeerOrganisation[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface UsePeersOptions {
  search?: string;
  sector?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Hook to fetch peer organisations with filters.
 */
export function usePeers({
  search,
  sector,
  active,
  page,
  pageSize,
  enabled = true,
}: UsePeersOptions = {}) {
  return useQuery<PeerListResponse>({
    queryKey: [...queryKeys.peers.all, { search, sector, active, page, pageSize }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sector) params.set('sector', sector);
      if (active !== undefined) params.set('active', String(active));
      if (page !== undefined) params.set('page', String(page));
      if (pageSize !== undefined) params.set('pageSize', String(pageSize));
      return fetchJson<PeerListResponse>(`/api/peers?${params.toString()}`);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export type { PeerOrganisation };
