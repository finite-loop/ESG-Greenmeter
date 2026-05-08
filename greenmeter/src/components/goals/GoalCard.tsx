'use client';

import Link from 'next/link';
import { Card, CardContent, Badge, ProgressBar } from '@/components/ui';
import { Target, Calendar, Pencil, Trash2 } from 'lucide-react';

interface GoalCardProps {
  goalId: string;
  name: string;
  targetValue: string;
  targetYear: string;
  unit: string | null;
  status: string | null;
  progress: number;
  componentCount: number;
  onEdit: (goalId: string) => void;
  onDelete: (goalId: string) => void;
}

const STATUS_VARIANT: Record<string, 'neutral' | 'success' | 'warning' | 'error'> = {
  active: 'neutral',
  achieved: 'success',
  at_risk: 'warning',
  missed: 'error',
  archived: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  achieved: 'Achieved',
  at_risk: 'At Risk',
  missed: 'Missed',
  archived: 'Archived',
};

export function GoalCard({
  goalId,
  name,
  targetValue,
  targetYear,
  unit,
  status,
  progress,
  componentCount,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const statusKey = status ?? 'active';

  return (
    <Card className="relative group">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link href={`/goals/${goalId}`} className="hover:underline">
              <h3 className="text-sm font-semibold truncate">{name}</h3>
            </Link>
            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
              <Target className="h-3 w-3 shrink-0" />
              <span>
                {targetValue}
                {unit ? ` ${unit}` : ''}
              </span>
              <Calendar className="h-3 w-3 shrink-0 ml-1" />
              <span>{targetYear}</span>
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[statusKey] ?? 'neutral'}>
            {STATUS_LABEL[statusKey] ?? statusKey}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Progress</span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>
          <ProgressBar value={progress} max={100} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">
            {componentCount} component{componentCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(goalId)}
              className="p-1 rounded hover:bg-[var(--surf)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Edit goal"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(goalId)}
              className="p-1 rounded hover:bg-[var(--surf)] text-[var(--text-secondary)] hover:text-red-500"
              aria-label="Delete goal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
