'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface Recommendation {
  recommendationId: string;
  paramId: string | null;
  metric: string;
  recommendationText: string;
  priority: 'critical' | 'warning' | 'info';
  confidence: number | null;
  source: 'rule' | 'llm';
  currentValue: number | null;
  thresholdValue: number | null;
  pillar: string | null;
  category: string | null;
  createdAt: string;
}

interface RecommendationsResponse {
  data: Recommendation[];
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
 * Hook to fetch AI recommendations for the current tenant.
 */
export function useRecommendations(limit = 20, enabled = true) {
  return useQuery<RecommendationsResponse>({
    queryKey: queryKeys.recommendations.list({ limit }),
    queryFn: () => fetchJson<RecommendationsResponse>(`/api/recommendations?limit=${limit}`),
    enabled,
    // Recommendations are generated nightly; stale time is generous
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
