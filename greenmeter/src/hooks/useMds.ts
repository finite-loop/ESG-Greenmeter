'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { MdsPoint } from '@/services/mdsService';

interface MdsApiResponse {
  data: MdsPoint[];
  meta: {
    metricsUsed: number;
    peerCount: number;
  };
}

interface UseMdsOptions {
  fiscalYear: string;
  sector?: string;
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
 * Hook to fetch MDS positioning data.
 * Uses a longer staleTime since MDS computation is expensive
 * and peer data changes infrequently.
 */
export function useMds({ fiscalYear, sector, enabled = true }: UseMdsOptions) {
  return useQuery<MdsApiResponse>({
    queryKey: queryKeys.mds.coordinates({ fiscalYear, sector }),
    queryFn: () => {
      const params = new URLSearchParams({ fiscalYear });
      if (sector) params.set('sector', sector);
      return fetchJson<MdsApiResponse>(`/api/benchmarks/mds?${params.toString()}`);
    },
    enabled: enabled && !!fiscalYear,
    staleTime: 10 * 60 * 1000, // 10 minutes — MDS is expensive, data changes infrequently
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  });
}
