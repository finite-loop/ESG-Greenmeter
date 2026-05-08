'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { CorrelationMetric } from '@/services/correlationService';

interface CorrelationApiResponse {
  data: {
    metrics: CorrelationMetric[];
    matrix: (number | null)[][];
  };
  meta: {
    peerCount: number;
    metricsUsed: number;
  };
}

interface UseCorrelationsOptions {
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
 * Hook to fetch correlation matrix data.
 * Uses a longer staleTime since correlation computation is expensive
 * and peer data changes infrequently.
 */
export function useCorrelations({ fiscalYear, sector, enabled = true }: UseCorrelationsOptions) {
  return useQuery<CorrelationApiResponse>({
    queryKey: queryKeys.correlations.matrix({ fiscalYear, sector }),
    queryFn: () => {
      const params = new URLSearchParams({ fiscalYear });
      if (sector) params.set('sector', sector);
      return fetchJson<CorrelationApiResponse>(`/api/benchmarks/correlations?${params.toString()}`);
    },
    enabled: enabled && !!fiscalYear,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
