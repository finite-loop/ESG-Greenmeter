'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface IndustryCompany {
  tenantId: string;
  name: string;
  sector: string | null;
  country: string | null;
  gicsCode: string | null;
  activeFrameworks: string[] | null;
}

interface IndustryCompaniesResponse {
  data: IndustryCompany[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function useIndustryCompanies(enabled = true) {
  return useQuery<IndustryCompaniesResponse>({
    queryKey: queryKeys.industry.all,
    queryFn: () => fetchJson<IndustryCompaniesResponse>('/api/industry/companies'),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
