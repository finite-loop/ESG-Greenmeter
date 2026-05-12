'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface KpiValueFilters {
  periodId?: string;
  standard?: string;
  pillar?: string;
  category?: string;
  department?: string;
  nodeId?: string;
  page?: number;
  pageSize?: number;
}

interface KpiValueRow {
  valueId: string;
  tenantId: string;
  paramId: string;
  canonicalId: string | null;
  nodeId: string;
  periodId: string;
  value: string | null;
  valueText: string | null;
  unit: string | null;
  sourceType: string;
  sourceRef: string | null;
  verified: boolean | null;
  notApplicable: boolean | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  paramName: string;
  paramCode: string;
  pillar: string;
  category: string | null;
  standard: string;
  paramUnit: string;
  dataType: string;
  ragStatus: 'green' | 'amber' | 'red' | 'grey';
}

interface KpiValueCreateInput {
  paramId: string;
  nodeId: string;
  periodId: string;
  value?: string;
  valueText?: string;
  unit?: string;
  sourceType: string;
  sourceRef?: string;
  notApplicable?: boolean;
}

interface KpiValueUpdateInput {
  value?: string;
  valueText?: string;
  unit?: string;
  sourceType?: string;
  sourceRef?: string;
  notApplicable?: boolean;
}

interface ApiListResponse {
  data: KpiValueRow[];
  meta: { page: number; pageSize: number; total: number };
}

interface ApiItemResponse {
  data: KpiValueRow;
}

function buildQueryString(filters: KpiValueFilters): string {
  const params = new URLSearchParams();
  if (filters.periodId) params.set('periodId', filters.periodId);
  if (filters.standard) params.set('standard', filters.standard);
  if (filters.pillar) params.set('pillar', filters.pillar);
  if (filters.category) params.set('category', filters.category);
  if (filters.department) params.set('department', filters.department);
  if (filters.nodeId) params.set('nodeId', filters.nodeId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  return params.toString();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

/**
 * Hook to fetch KPI values list with filters.
 */
export function useKpiValues(filters: KpiValueFilters, enabled = true) {
  return useQuery<ApiListResponse>({
    queryKey: queryKeys.kpiValues.list({
      periodId: filters.periodId,
      standard: filters.standard,
      nodeId: filters.nodeId,
      pillar: filters.pillar,
      category: filters.category,
      department: filters.department,
      page: filters.page,
      pageSize: filters.pageSize,
    }),
    queryFn: () => {
      const qs = buildQueryString(filters);
      return fetchJson<ApiListResponse>(`/api/kpi?${qs}`);
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Hook to create a new KPI value.
 */
export function useCreateKpiValue() {
  const queryClient = useQueryClient();

  return useMutation<ApiItemResponse, Error, KpiValueCreateInput>({
    mutationFn: (input) =>
      fetchJson<ApiItemResponse>('/api/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpiValues.all });
    },
  });
}

/**
 * Hook to update an existing KPI value.
 */
export function useUpdateKpiValue() {
  const queryClient = useQueryClient();

  return useMutation<ApiItemResponse, Error, { valueId: string; input: KpiValueUpdateInput }>({
    mutationFn: ({ valueId, input }) =>
      fetchJson<ApiItemResponse>(`/api/kpi/${valueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpiValues.all });
    },
  });
}

/**
 * Hook to delete a KPI value.
 */
export function useDeleteKpiValue() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: (valueId) =>
      fetchJson(`/api/kpi/${valueId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpiValues.all });
    },
  });
}

interface BatchVerifyResponse {
  data: { verified: number; valueIds: string[] };
}

interface BatchMarkNotApplicableResponse {
  data: { marked: number; valueIds: string[] };
}

/**
 * Hook to batch verify KPI values.
 */
export function useVerifyKpiValues() {
  const queryClient = useQueryClient();

  return useMutation<BatchVerifyResponse, Error, string[]>({
    mutationFn: (valueIds) =>
      fetchJson<BatchVerifyResponse>('/api/kpi/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpiValues.all });
    },
  });
}

/**
 * Hook to batch mark KPI values as not applicable.
 */
export function useMarkNotApplicable() {
  const queryClient = useQueryClient();

  return useMutation<BatchMarkNotApplicableResponse, Error, string[]>({
    mutationFn: (valueIds) =>
      fetchJson<BatchMarkNotApplicableResponse>('/api/kpi/verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kpiValues.all });
    },
  });
}
