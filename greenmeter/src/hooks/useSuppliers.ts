'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface SupplierListFilters {
  search?: string;
  sector?: string;
  category?: string;
  riskLevel?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

interface SupplierRow {
  supplierId: string;
  tenantId: string;
  name: string;
  category: string | null;
  sector: string | null;
  country: string | null;
  contactEmail: string | null;
  contactName: string | null;
  riskLevel: string | null;
  riskScore: number | null;
  active: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface ScorecardCriterion {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  ragStatus: 'green' | 'amber' | 'red';
}

interface Scorecard {
  overallScore: number | null;
  overallRagStatus: 'green' | 'amber' | 'red';
  criteria: ScorecardCriterion[];
}

interface AssessmentRow {
  assessmentId: string;
  tenantId: string;
  supplierId: string;
  fiscalYear: string;
  overallScore: string | null;
  environmentalScore: string | null;
  socialScore: string | null;
  governanceScore: string | null;
  scope3Contribution: string | null;
  surveyStatus: string | null;
  surveyData: unknown;
  assessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SupplierDetail extends SupplierRow {
  assessments: AssessmentRow[];
  scorecard: Scorecard | null;
}

interface CreateSupplierInput {
  name: string;
  category?: string;
  sector?: string;
  country?: string;
  contactEmail?: string;
  contactName?: string;
}

interface UpdateSupplierInput {
  name?: string;
  category?: string | null;
  sector?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactName?: string | null;
  riskLevel?: string | null;
  active?: boolean;
}

interface UpsertAssessmentInput {
  fiscalYear: string;
  environmentalScore?: number;
  socialScore?: number;
  governanceScore?: number;
  scope3Contribution?: number;
  surveyStatus?: string;
  surveyData?: Record<string, unknown>;
}

interface ApiListResponse {
  data: SupplierRow[];
  meta: { page: number; pageSize: number; total: number };
}

interface ApiItemResponse {
  data: SupplierDetail;
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

function buildQueryString(filters: SupplierListFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.category) params.set('category', filters.category);
  if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
  if (filters.active !== undefined) params.set('active', String(filters.active));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  return params.toString();
}

export function useSuppliers(filters: SupplierListFilters, enabled = true) {
  return useQuery<ApiListResponse>({
    queryKey: queryKeys.suppliers.list({
      search: filters.search,
      sector: filters.sector,
      category: filters.category,
      riskLevel: filters.riskLevel,
      page: filters.page,
    }),
    queryFn: () => {
      const qs = buildQueryString(filters);
      return fetchJson<ApiListResponse>(`/api/supply-chain/suppliers?${qs}`);
    },
    enabled,
  });
}

export function useSupplierDetail(supplierId: string | null) {
  return useQuery<ApiItemResponse>({
    queryKey: queryKeys.suppliers.detail(supplierId ?? ''),
    queryFn: () =>
      fetchJson<ApiItemResponse>(`/api/supply-chain/suppliers/${supplierId}`),
    enabled: !!supplierId,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation<{ data: SupplierRow }, Error, CreateSupplierInput>({
    mutationFn: (input) =>
      fetchJson('/api/supply-chain/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation<
    { data: SupplierRow },
    Error,
    { supplierId: string; input: UpdateSupplierInput }
  >({
    mutationFn: ({ supplierId, input }) =>
      fetchJson(`/api/supply-chain/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

export function useUpsertAssessment() {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    Error,
    { supplierId: string; input: UpsertAssessmentInput }
  >({
    mutationFn: ({ supplierId, input }) =>
      fetchJson(`/api/supply-chain/suppliers/${supplierId}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

interface Scope3SupplierBreakdown {
  supplierId: string;
  supplierName: string;
  scope3Contribution: number;
  fiscalYear: string;
  percentage: number;
}

interface Scope3Summary {
  totalScope3Cat1: number;
  supplierBreakdown: Scope3SupplierBreakdown[];
}

interface Scope3Response {
  data: Scope3Summary;
}

interface PortalTokenResponse {
  data: { token: string; portalUrl: string };
}

export function useScope3Summary(enabled = true) {
  return useQuery<Scope3Response>({
    queryKey: queryKeys.suppliers.scope3(),
    queryFn: () => fetchJson<Scope3Response>('/api/supply-chain/scope3'),
    enabled,
  });
}

export function useGeneratePortalToken() {
  const queryClient = useQueryClient();

  return useMutation<PortalTokenResponse, Error, string>({
    mutationFn: (supplierId) =>
      fetchJson<PortalTokenResponse>(
        `/api/supply-chain/suppliers/${supplierId}/portal-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

export type {
  SupplierRow,
  SupplierDetail,
  SupplierListFilters,
  CreateSupplierInput,
  UpdateSupplierInput,
  UpsertAssessmentInput,
  Scorecard,
  ScorecardCriterion,
  AssessmentRow,
  Scope3Summary,
  Scope3SupplierBreakdown,
};
