'use client';

import { use, useState, useCallback } from 'react';
import { useGoalDetail, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useGoals';
import { MilestoneTracker } from '@/components/goals/MilestoneTracker';
import { MilestoneForm } from '@/components/goals/MilestoneForm';
import { Card, CardContent, CardHeader, CardTitle, Badge, ProgressBar, Button } from '@/components/ui';
import { ArrowLeft, Plus, Target, Calendar } from 'lucide-react';
import Link from 'next/link';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  active: 'default',
  achieved: 'success',
  at_risk: 'warning',
  missed: 'error',
  archived: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  achieved: 'Achieved',
  at_risk: 'At Risk',
  missed: 'Missed',
  archived: 'Archived',
};

export default function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = use(params);
  const { data: response, isLoading } = useGoalDetail(goalId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [milestoneFormOpen, setMilestoneFormOpen] = useState(false);
  const [editMilestoneId, setEditMilestoneId] = useState<string | null>(null);

  const goal = response?.data;

  const handleAddMilestone = useCallback(() => {
    setEditMilestoneId(null);
    setMilestoneFormOpen(true);
  }, []);

  const handleEditMilestone = useCallback((milestoneId: string) => {
    setEditMilestoneId(milestoneId);
    setMilestoneFormOpen(true);
  }, []);

  const handleDeleteMilestone = useCallback(
    (milestoneId: string) => {
      if (confirm('Are you sure you want to delete this milestone?')) {
        deleteMilestone.mutate({ goalId, milestoneId });
      }
    },
    [goalId, deleteMilestone]
  );

  const handleMilestoneSubmit = useCallback(
    (values: {
      name: string;
      description?: string;
      targetValue?: string;
      targetDate?: string;
      sortOrder?: number;
      status?: string;
    }) => {
      if (editMilestoneId) {
        updateMilestone.mutate(
          { goalId, milestoneId: editMilestoneId, input: values },
          { onSuccess: () => { setMilestoneFormOpen(false); setEditMilestoneId(null); } }
        );
      } else {
        createMilestone.mutate(
          { goalId, input: values },
          { onSuccess: () => { setMilestoneFormOpen(false); } }
        );
      }
    },
    [goalId, editMilestoneId, createMilestone, updateMilestone]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-[var(--text-secondary)]">
        Loading goal...
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="space-y-4">
        <Link href="/goals" className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to Goals
        </Link>
        <p className="text-sm text-[var(--text-secondary)]">Goal not found.</p>
      </div>
    );
  }

  const statusKey = goal.status ?? 'active';
  const editMilestone = editMilestoneId
    ? goal.milestones.find((m) => m.milestoneId === editMilestoneId)
    : null;

  return (
    <div className="space-y-4">
      <Link href="/goals" className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Goals
      </Link>

      {/* Goal Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold">{goal.name}</h1>
              {goal.description && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">{goal.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {goal.targetValue}{goal.unit ? ` ${goal.unit}` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {goal.targetYear}
                </span>
                {goal.baselineValue && (
                  <span>Baseline: {goal.baselineValue}{goal.unit ? ` ${goal.unit}` : ''} ({goal.baselineYear})</span>
                )}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[statusKey] ?? 'default'}>
              {STATUS_LABEL[statusKey] ?? statusKey}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Progress</span>
              <span className="font-medium">{goal.progress.toFixed(0)}%</span>
            </div>
            <ProgressBar value={goal.progress} max={100} />
          </div>

          <div className="text-xs text-[var(--text-secondary)]">
            {goal.components.length} component{goal.components.length !== 1 ? 's' : ''} | {goal.milestones.length} milestone{goal.milestones.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Milestones Section */}
      <Card className="group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Milestones</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddMilestone}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Milestone
          </Button>
        </CardHeader>
        <CardContent>
          <MilestoneTracker
            milestones={goal.milestones}
            unit={goal.unit}
            onEdit={handleEditMilestone}
            onDelete={handleDeleteMilestone}
          />
        </CardContent>
      </Card>

      {/* Components Section */}
      {goal.components.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {goal.components.map((comp) => (
                <div key={comp.componentId} className="flex items-center justify-between text-xs p-2 rounded bg-[var(--surf)]">
                  <span className="font-medium">{comp.name}</span>
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    {comp.targetValue && <span>Target: {comp.targetValue}</span>}
                    <span>Weight: {(Number(comp.weight ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <MilestoneForm
        key={editMilestoneId ?? 'create'}
        open={milestoneFormOpen}
        onOpenChange={setMilestoneFormOpen}
        onSubmit={handleMilestoneSubmit}
        mode={editMilestoneId ? 'edit' : 'create'}
        isSubmitting={createMilestone.isPending || updateMilestone.isPending}
        initialValues={
          editMilestone
            ? {
                name: editMilestone.name,
                description: editMilestone.description ?? undefined,
                targetValue: editMilestone.targetValue ?? undefined,
                targetDate: editMilestone.targetDate ?? undefined,
                sortOrder: editMilestone.sortOrder ?? 0,
                status: editMilestone.status,
              }
            : undefined
        }
      />
    </div>
  );
}
