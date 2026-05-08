'use client';

import { Badge } from '@/components/ui';
import { CheckCircle2, Clock, XCircle, Calendar } from 'lucide-react';

interface Milestone {
  milestoneId: string;
  name: string;
  description: string | null;
  targetValue: string | null;
  targetDate: string | null;
  status: string;
  achievedAt: string | null;
  sortOrder: number | null;
}

interface MilestoneTrackerProps {
  milestones: Milestone[];
  unit: string | null;
  onEdit?: (milestoneId: string) => void;
  onDelete?: (milestoneId: string) => void;
}

const STATUS_CONFIG: Record<string, {
  icon: typeof CheckCircle2;
  color: string;
  dotColor: string;
  lineColor: string;
  variant: 'neutral' | 'success' | 'warning' | 'error';
  label: string;
}> = {
  achieved: {
    icon: CheckCircle2,
    color: 'text-green-600',
    dotColor: 'bg-green-500',
    lineColor: 'bg-green-300',
    variant: 'success',
    label: 'Achieved',
  },
  pending: {
    icon: Clock,
    color: 'text-[var(--text-secondary)]',
    dotColor: 'bg-gray-400',
    lineColor: 'bg-gray-300',
    variant: 'neutral',
    label: 'Upcoming',
  },
  missed: {
    icon: XCircle,
    color: 'text-red-600',
    dotColor: 'bg-red-500',
    lineColor: 'bg-red-300',
    variant: 'error',
    label: 'Missed',
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date set';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

export function MilestoneTracker({
  milestones,
  unit,
  onEdit,
  onDelete,
}: MilestoneTrackerProps) {
  if (milestones.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-[var(--text-secondary)]">
        No milestones defined for this goal.
      </div>
    );
  }

  const sorted = [...milestones].sort((a, b) => {
    if (a.targetDate && b.targetDate) {
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    }
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  return (
    <div className="space-y-0">
      {sorted.map((milestone, index) => {
        const config = STATUS_CONFIG[milestone.status] ?? STATUS_CONFIG.pending;
        const Icon = config.icon;
        const isLast = index === sorted.length - 1;

        return (
          <div key={milestone.milestoneId} className="group relative flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${config.dotColor} shrink-0 mt-1 z-10`} />
              {!isLast && (
                <div className={`w-0.5 flex-1 ${config.lineColor}`} />
              )}
            </div>

            {/* Milestone content */}
            <div className={`pb-4 flex-1 min-w-0 ${isLast ? '' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{milestone.name}</span>
                    <Badge variant={config.variant} className="shrink-0">
                      {config.label}
                    </Badge>
                  </div>

                  {milestone.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {milestone.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                    {milestone.targetValue && (
                      <span>
                        Target: {milestone.targetValue}{unit ? ` ${unit}` : ''}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(milestone.targetDate)}
                    </span>
                    {milestone.status === 'achieved' && milestone.achievedAt && (
                      <span className={config.color}>
                        <Icon className="h-3 w-3 inline mr-0.5" />
                        {formatDate(milestone.achievedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(milestone.milestoneId)}
                        className="p-1 rounded hover:bg-[var(--surf)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
                        aria-label="Edit milestone"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(milestone.milestoneId)}
                        className="p-1 rounded hover:bg-[var(--surf)] text-[var(--text-secondary)] hover:text-red-500 text-xs"
                        aria-label="Delete milestone"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
