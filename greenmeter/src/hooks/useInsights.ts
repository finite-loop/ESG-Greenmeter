'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface InsightItem {
  text: string;
  metric?: string;
  pillar?: string;
  severity?: 'critical' | 'warning' | 'info' | 'good';
}

export interface InsightSection {
  id: 'risk' | 'position' | 'actions' | 'compliance' | 'trends';
  title: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  items: InsightItem[];
}

export interface InsightBriefing {
  generatedAt: string;
  periodId: string;
  summary: string;
  sections: InsightSection[];
}

interface InsightResponse {
  data: InsightBriefing;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function useInsights(periodId?: string, enabled = true) {
  const params = periodId ? `?periodId=${encodeURIComponent(periodId)}` : '';
  return useQuery<InsightResponse>({
    queryKey: queryKeys.insights.briefing({ periodId }),
    queryFn: () => fetchJson<InsightResponse>(`/api/insights${params}`),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
