'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { BenchmarkResult, AvailableMetric } from '@/services/benchmarkService';

interface BenchmarkListResponse {
  data: AvailableMetric[];
}

interface BenchmarkDetailResponse {
  data: BenchmarkResult;
}

interface UseBenchmarkListOptions {
  fiscalYear: string;
  sector?: string;
  peerIds?: string[];
  enabled?: boolean;
}

interface UseBenchmarkOptions {
  canonicalId: string;
  fiscalYear: string;
  periodId?: string;
  sector?: string;
  peerIds?: string[];
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

function buildPeerIdsParam(params: URLSearchParams, peerIds?: string[]) {
  if (peerIds && peerIds.length > 0) {
    params.set('peerIds', peerIds.join(','));
  }
}

/**
 * Hook to fetch available benchmark metrics for a fiscal year.
 */
export function useBenchmarkMetrics({ fiscalYear, sector, peerIds, enabled = true }: UseBenchmarkListOptions) {
  return useQuery<BenchmarkListResponse>({
    queryKey: [...queryKeys.benchmarks.all, 'metrics', { fiscalYear, sector, peerIds }],
    queryFn: () => {
      const params = new URLSearchParams({ fiscalYear });
      if (sector) params.set('sector', sector);
      buildPeerIdsParam(params, peerIds);
      return fetchJson<BenchmarkListResponse>(`/api/benchmarks?${params.toString()}`);
    },
    enabled: enabled && !!fiscalYear,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch benchmark data for a single canonical metric.
 */
export function useBenchmark({ canonicalId, fiscalYear, periodId, sector, peerIds, enabled = true }: UseBenchmarkOptions) {
  return useQuery<BenchmarkDetailResponse>({
    queryKey: [...queryKeys.benchmarks.all, 'detail', { canonicalId, fiscalYear, periodId, sector, peerIds }],
    queryFn: () => {
      const params = new URLSearchParams({ canonicalId, fiscalYear });
      if (periodId) params.set('periodId', periodId);
      if (sector) params.set('sector', sector);
      buildPeerIdsParam(params, peerIds);
      return fetchJson<BenchmarkDetailResponse>(`/api/benchmarks?${params.toString()}`);
    },
    enabled: enabled && !!canonicalId && !!fiscalYear,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch benchmark data for multiple canonical metrics.
 * Uses Promise.allSettled to prevent a single metric failure from crashing all results.
 */
export function useBenchmarkMulti(
  canonicalIds: string[],
  fiscalYear: string,
  options?: { periodId?: string; sector?: string; peerIds?: string[]; enabled?: boolean }
) {
  const { periodId, sector, peerIds, enabled = true } = options ?? {};

  return useQuery<BenchmarkResult[]>({
    queryKey: [...queryKeys.benchmarks.all, 'multi', { canonicalIds, fiscalYear, periodId, sector, peerIds }],
    queryFn: async () => {
      const settled = await Promise.allSettled(
        canonicalIds.map(async (canonicalId) => {
          const params = new URLSearchParams({ canonicalId, fiscalYear });
          if (periodId) params.set('periodId', periodId);
          if (sector) params.set('sector', sector);
          buildPeerIdsParam(params, peerIds);
          const res = await fetchJson<BenchmarkDetailResponse>(`/api/benchmarks?${params.toString()}`);
          return res.data;
        })
      );
      return settled
        .filter((r): r is PromiseFulfilledResult<BenchmarkResult> => r.status === 'fulfilled' && r.value != null)
        .map((r) => r.value);
    },
    enabled: enabled && canonicalIds.length > 0 && !!fiscalYear,
    staleTime: 5 * 60 * 1000,
  });
}
