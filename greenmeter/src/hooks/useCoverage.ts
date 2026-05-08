'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface CoverageData {
  framework: string;
  periodId: string;
  totalParams: number;
  hasValue: number;
  verified: number;
  notApplicable: number;
  percentComplete: number;
  warningThreshold: number;
  belowThreshold: boolean;
  sections: Array<{
    standardSection: string;
    totalParams: number;
    hasValue: number;
    verified: number;
    notApplicable: number;
    percentComplete: number;
  }>;
}

interface CoverageResponse {
  data: CoverageData;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

interface UseCoverageOptions {
  framework: string;
  periodId: string;
  enabled?: boolean;
}

/**
 * Hook to fetch coverage summary for a given framework and period.
 */
export function useCoverage({ framework, periodId, enabled = true }: UseCoverageOptions) {
  return useQuery<CoverageResponse>({
    queryKey: queryKeys.reports.coverage({ framework, periodId }),
    queryFn: () => {
      const params = new URLSearchParams({ framework, periodId });
      return fetchJson<CoverageResponse>(`/api/reports/coverage?${params.toString()}`);
    },
    enabled: enabled && !!framework && !!periodId,
    staleTime: 5 * 60 * 1000,
  });
}

export interface CoverageMultiResult {
  coverages: CoverageData[];
  failedCount: number;
  totalRequested: number;
}

/**
 * Hook to fetch coverage for multiple frameworks in parallel.
 * Uses Promise.allSettled so individual framework failures don't
 * break the whole widget. Returns failed count for transparency.
 */
export function useCoverageMulti(
  frameworks: string[],
  periodId: string,
  enabled = true
) {
  return useQuery<CoverageMultiResult>({
    queryKey: ['reports', 'coverage-multi', { frameworks, periodId }],
    queryFn: async () => {
      const settled = await Promise.allSettled(
        frameworks.map(async (framework) => {
          const params = new URLSearchParams({ framework, periodId });
          const res = await fetchJson<CoverageResponse>(
            `/api/reports/coverage?${params.toString()}`
          );
          return res.data;
        })
      );
      const coverages = settled
        .filter(
          (r): r is PromiseFulfilledResult<CoverageData> =>
            r.status === 'fulfilled' && r.value != null
        )
        .map((r) => r.value);
      const failedCount = settled.length - coverages.length;
      return { coverages, failedCount, totalRequested: frameworks.length };
    },
    enabled: enabled && frameworks.length > 0 && !!periodId,
    staleTime: 5 * 60 * 1000,
  });
}
