'use client';

import { useRecommendations, type Recommendation } from '@/hooks/useRecommendations';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', variant: 'error' as const },
  warning: { label: 'Warning', variant: 'warning' as const },
  info: { label: 'Info', variant: 'info' as const },
} as const;

function PriorityBadge({ priority }: { priority: Recommendation['priority'] }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.info;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function ConfidenceIndicator({ confidence }: { confidence: number | null }) {
  if (confidence == null) return null;
  const level = confidence >= 80 ? 'High' : confidence >= 50 ? 'Med' : 'Low';
  return (
    <span className="text-[10px] text-[var(--tx3)]">
      {level} confidence
    </span>
  );
}

function RecommendationItem({ rec }: { rec: Recommendation }) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-[var(--bdr2)] last:border-b-0">
      <div className="flex items-center gap-2">
        <PriorityBadge priority={rec.priority} />
        <span className="text-[11px] font-medium text-[var(--tx1)] truncate">
          {rec.metric}
        </span>
        {rec.source === 'llm' && (
          <Badge variant="teal">AI</Badge>
        )}
      </div>
      <p className="text-[11px] text-[var(--tx2)] leading-snug">
        {rec.recommendationText}
      </p>
      <div className="flex items-center gap-3">
        {rec.currentValue != null && (
          <span className="text-[10px] text-[var(--tx3)]">
            Current: {rec.currentValue}
          </span>
        )}
        <ConfidenceIndicator confidence={rec.confidence} />
        {rec.pillar && (
          <Badge variant={
            rec.pillar === 'E' ? 'environment' :
            rec.pillar === 'S' ? 'social' :
            rec.pillar === 'G' ? 'governance' : 'neutral'
          }>
            {rec.pillar === 'E' ? 'Environment' : rec.pillar === 'S' ? 'Social' : 'Governance'}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface AlertsPanelProps {
  limit?: number;
}

export function AlertsPanel({ limit = 10 }: AlertsPanelProps) {
  const { data, isLoading, error } = useRecommendations(limit);

  const recommendations = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts & Recommendations</CardTitle>
        {recommendations.length > 0 && (
          <Badge variant="neutral">{recommendations.length}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-[11px] text-[var(--tx3)] py-4 text-center">
            Loading recommendations...
          </p>
        )}
        {error && (
          <p className="text-[11px] text-[var(--redtx)] py-4 text-center">
            Failed to load recommendations
          </p>
        )}
        {!isLoading && !error && recommendations.length === 0 && (
          <p className="text-[11px] text-[var(--tx3)] py-4 text-center">
            No alerts — all metrics are performing well
          </p>
        )}
        {recommendations.length > 0 && (
          <div className="flex flex-col">
            {recommendations.map((rec) => (
              <RecommendationItem key={rec.recommendationId} rec={rec} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
