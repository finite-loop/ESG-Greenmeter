'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface GoalListFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

interface GoalRow {
  goalId: string;
  tenantId: string;
  paramId: string;
  canonicalId: string | null;
  name: string;
  description: string | null;
  targetValue: string;
  baselineValue: string | null;
  baselineYear: string | null;
  targetYear: string;
  unit: string | null;
  direction: string | null;
  status: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  componentCount: number;
  progress: number;
}

interface GoalComponentRow {
  componentId: string;
  goalId: string;
  tenantId: string;
  name: string;
  targetValue: string | null;
  weight: string | null;
  paramId: string | null;
  sortOrder: number | null;
  createdAt: string;
}

interface MilestoneRow {
  milestoneId: string;
  goalId: string;
  tenantId: string;
  name: string;
  description: string | null;
  targetValue: string | null;
  targetDate: string | null;
  status: string;
  achievedAt: string | null;
  sortOrder: number | null;
  createdAt: string;
}

interface MilestoneCreateInput {
  name: string;
  description?: string;
  targetValue?: string;
  targetDate?: string;
  sortOrder?: number;
}

interface MilestoneUpdateInput {
  name?: string;
  description?: string;
  targetValue?: string;
  targetDate?: string;
  status?: string;
  sortOrder?: number;
}

interface GoalDetail extends GoalRow {
  components: GoalComponentRow[];
  milestones: MilestoneRow[];
}

interface GoalCreateInput {
  paramId: string;
  canonicalId?: string;
  name: string;
  description?: string;
  targetValue: string;
  baselineValue?: string;
  baselineYear?: string;
  targetYear: string;
  unit?: string;
  direction?: string;
}

interface GoalUpdateInput {
  paramId?: string;
  canonicalId?: string;
  name?: string;
  description?: string;
  targetValue?: string;
  baselineValue?: string;
  baselineYear?: string;
  targetYear?: string;
  unit?: string;
  direction?: string;
}

interface ComponentCreateInput {
  name: string;
  targetValue?: string;
  weight: string;
  paramId?: string;
  sortOrder?: number;
}

interface ApiListResponse {
  data: GoalRow[];
  meta: { page: number; pageSize: number; total: number };
}

interface ApiItemResponse<T = GoalRow> {
  data: T;
}

function buildQueryString(filters: GoalListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));
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
 * Hook to fetch goals list with filters.
 */
export function useGoals(filters: GoalListFilters = {}, enabled = true) {
  return useQuery<ApiListResponse>({
    queryKey: [...queryKeys.goals.list({ status: filters.status }), { page: filters.page, pageSize: filters.pageSize }],
    queryFn: () => {
      const qs = buildQueryString(filters);
      return fetchJson<ApiListResponse>(`/api/goals?${qs}`);
    },
    enabled,
  });
}

/**
 * Hook to fetch a single goal with components.
 */
export function useGoalDetail(goalId: string | null, enabled = true) {
  return useQuery<ApiItemResponse<GoalDetail>>({
    queryKey: queryKeys.goals.detail(goalId ?? ''),
    queryFn: () => fetchJson<ApiItemResponse<GoalDetail>>(`/api/goals/${goalId}`),
    enabled: enabled && !!goalId,
  });
}

/**
 * Hook to create a new goal.
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation<ApiItemResponse, Error, GoalCreateInput>({
    mutationFn: (input) =>
      fetchJson<ApiItemResponse>('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

/**
 * Hook to update a goal.
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation<ApiItemResponse, Error, { goalId: string; input: GoalUpdateInput }>({
    mutationFn: ({ goalId, input }) =>
      fetchJson<ApiItemResponse>(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

/**
 * Hook to delete a goal.
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: (goalId) =>
      fetchJson(`/api/goals/${goalId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

/**
 * Hook to add a component to a goal.
 */
export function useAddGoalComponent() {
  const queryClient = useQueryClient();

  return useMutation<ApiItemResponse<GoalComponentRow>, Error, { goalId: string; input: ComponentCreateInput }>({
    mutationFn: ({ goalId, input }) =>
      fetchJson<ApiItemResponse<GoalComponentRow>>(`/api/goals/${goalId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

/**
 * Hook to create a milestone for a goal.
 */
export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation<ApiItemResponse<MilestoneRow>, Error, { goalId: string; input: MilestoneCreateInput }>({
    mutationFn: ({ goalId, input }) =>
      fetchJson<ApiItemResponse<MilestoneRow>>(`/api/goals/${goalId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

/**
 * Hook to update a milestone.
 */
export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation<ApiItemResponse<MilestoneRow>, Error, { goalId: string; milestoneId: string; input: MilestoneUpdateInput }>({
    mutationFn: ({ goalId, milestoneId, input }) =>
      fetchJson<ApiItemResponse<MilestoneRow>>(`/api/goals/${goalId}/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

/**
 * Hook to delete a milestone.
 */
export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { goalId: string; milestoneId: string }>({
    mutationFn: ({ goalId, milestoneId }) =>
      fetchJson(`/api/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}
