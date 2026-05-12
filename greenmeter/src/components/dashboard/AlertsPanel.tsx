'use client';

import { useRecommendations, type Recommendation } from '@/hooks/useRecommendations';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

function RecommendationItem({ rec }: { rec: Recommendation }) {
  const dotColor = rec.priority === 'critical' ? 'var(--red)' : rec.priority === 'warning' ? 'var(--amb)' : 'var(--t500)';
  return (
    <div className="ai-item">
      <div className="ai-dot" style={{ background: dotColor }} />
      <div style={{ flex: 1 }}>
        <div className="ai-title">{rec.recommendationText}</div>
        <div className="ai-meta">
          {rec.metric && <span>{rec.metric}</span>}
          {rec.pillar && (
            <span className={`badge b-${rec.pillar === 'E' ? 'e' : rec.pillar === 'S' ? 's' : 'g'}`} style={{ fontSize: 9 }}>
              {rec.pillar}
            </span>
          )}
          {rec.source === 'llm' && (
            <span className="badge b-teal" style={{ fontSize: 9 }}>AI</span>
          )}
        </div>
      </div>
      <span style={{ color: "var(--tx3)" }}>&rsaquo;</span>
    </div>
  );
}

interface AlertsPanelProps {
  limit?: number;
}

export function AlertsPanel({ limit = 10 }: AlertsPanelProps) {
  const { data, isLoading, error } = useRecommendations(limit);

  const recommendations = data?.data ?? [];

  const criticalCount = recommendations.filter((r) => r.priority === 'critical').length;
  const warningCount = recommendations.filter((r) => r.priority === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Alerts &amp; recommendations</CardTitle>
          {recommendations.length > 0 && (
            <span style={{ fontSize: 10, color: "var(--tx3)", marginTop: 1, display: "block" }}>
              {criticalCount > 0 ? `${criticalCount} critical` : ""}
              {criticalCount > 0 && warningCount > 0 ? " · " : ""}
              {warningCount > 0 ? `${warningCount} warning` : ""}
              {criticalCount === 0 && warningCount === 0 ? `${recommendations.length} items` : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <div>
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
        {recommendations.length > 0 && recommendations.map((rec) => (
          <RecommendationItem key={rec.recommendationId} rec={rec} />
        ))}
      </div>
    </Card>
  );
}
