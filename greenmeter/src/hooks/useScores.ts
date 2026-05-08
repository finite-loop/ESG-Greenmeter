'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface CategoryScore {
  pillar: string;
  category: string;
  score: number;
  paramCount: number;
}

export interface PillarScore {
  pillar: string;
  score: number;
  categoryCount: number;
  categories: CategoryScore[];
}

export interface ScoreBreakdown {
  overall: number;
  pillars: PillarScore[];
  nodeId: string;
  periodId: string;
  parameterCount: number;
}

interface ScoresResponse {
  data: ScoreBreakdown;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

interface UseScoresOptions {
  nodeId: string;
  periodId: string;
  enabled?: boolean;
}

/**
 * Hook to fetch ESG score breakdown (overall, per-pillar, per-category)
 * for a given node and period.
 */
export function useScores({ nodeId, periodId, enabled = true }: UseScoresOptions) {
  return useQuery<ScoresResponse>({
    queryKey: queryKeys.esgScores.list({ nodeId, periodId }),
    queryFn: () => {
      const params = new URLSearchParams({ nodeId, periodId });
      return fetchJson<ScoresResponse>(`/api/scores?${params.toString()}`);
    },
    enabled: enabled && !!nodeId && !!periodId,
    staleTime: 5 * 60 * 1000,
  });
}
