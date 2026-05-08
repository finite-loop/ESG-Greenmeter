"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/useGoals";
import { queryKeys } from "@/lib/queryKeys";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalForm } from "@/components/goals/GoalForm";
import { Button, Card, CardContent } from "@/components/ui";
import { Plus } from "lucide-react";

interface ParameterOption {
  paramId: string;
  name: string;
  code: string;
  unit: string;
}

interface ParameterListResponse {
  data: ParameterOption[];
  meta?: { page: number; pageSize: number; total: number };
}

export default function GoalsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: goalsResponse, isLoading } = useGoals({ page, pageSize: 20 });
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const deleteMutation = useDeleteGoal();

  const { data: paramsResponse } = useQuery<ParameterListResponse>({
    queryKey: queryKeys.kpiParameters.list({}),
    queryFn: async () => {
      const res = await fetch("/api/parameters?pageSize=100");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Failed to load parameters (${res.status})`);
      }
      return res.json();
    },
  });

  const parameters = (paramsResponse?.data ?? []).map((p) => ({
    paramId: p.paramId,
    name: p.name,
    code: p.code,
    unit: p.unit,
  }));

  const goals = goalsResponse?.data ?? [];
  const meta = goalsResponse?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.pageSize) : 0;

  const handleCreate = useCallback(() => {
    setEditGoalId(null);
    setFormMode("create");
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback(
    (goalId: string) => {
      setEditGoalId(goalId);
      setFormMode("edit");
      setFormOpen(true);
    },
    []
  );

  const handleDelete = useCallback(
    (goalId: string) => {
      if (confirm("Are you sure you want to delete this goal?")) {
        deleteMutation.mutate(goalId);
      }
    },
    [deleteMutation]
  );

  const editGoal = editGoalId ? goals.find((g) => g.goalId === editGoalId) : null;

  const handleFormSubmit = useCallback(
    (values: {
      name: string;
      paramId: string;
      targetValue: string;
      targetYear: string;
      unit?: string;
      direction: string;
      description?: string;
      baselineValue?: string;
      baselineYear?: string;
    }) => {
      if (formMode === "create") {
        createMutation.mutate(values, {
          onSuccess: () => {
            setFormOpen(false);
          },
        });
      } else if (editGoalId) {
        updateMutation.mutate(
          { goalId: editGoalId, input: values },
          {
            onSuccess: () => {
              setFormOpen(false);
              setEditGoalId(null);
            },
          }
        );
      }
    },
    [formMode, editGoalId, createMutation, updateMutation]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Goals & Milestones</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Long-term ESG targets with weighted component decomposition
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-[var(--text-secondary)]">
          Loading goals...
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              No goals defined yet. Create your first ESG goal to start tracking progress.
            </p>
            <Button variant="secondary" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.goalId}
              goalId={goal.goalId}
              name={goal.name}
              targetValue={goal.targetValue}
              targetYear={goal.targetYear}
              unit={goal.unit}
              status={goal.status}
              progress={goal.progress}
              componentCount={goal.componentCount}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">
            Page {meta.page} of {totalPages} ({meta.total} goals)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <GoalForm
        key={editGoalId ?? 'create'}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        mode={formMode}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        parameters={parameters}
        initialValues={
          editGoal
            ? {
                name: editGoal.name,
                paramId: editGoal.paramId,
                targetValue: editGoal.targetValue,
                targetYear: editGoal.targetYear,
                unit: editGoal.unit ?? undefined,
                direction: editGoal.direction ?? 'lower_is_better',
                description: editGoal.description ?? undefined,
                baselineValue: editGoal.baselineValue ?? undefined,
                baselineYear: editGoal.baselineYear ?? undefined,
              }
            : undefined
        }
      />
    </div>
  );
}
