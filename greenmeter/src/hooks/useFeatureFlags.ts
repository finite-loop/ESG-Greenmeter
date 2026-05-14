'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface FeatureFlagsResponse {
  data: {
    askAiEnabled: boolean;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function useFeatureFlags() {
  const query = useQuery<FeatureFlagsResponse>({
    queryKey: queryKeys.featureFlags.all,
    queryFn: () => fetchJson<FeatureFlagsResponse>('/api/config/features'),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    ...query,
    askAiEnabled: query.data?.data?.askAiEnabled ?? false,
  };
}
