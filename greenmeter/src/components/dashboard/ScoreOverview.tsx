'use client';

import { useScores, type PillarScore } from '@/hooks/useScores';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

const PILLAR_CONFIG: Record<string, { label: string; variant: 'environment' | 'social' | 'governance' }> = {
  E: { label: 'Environment', variant: 'environment' },
  S: { label: 'Social', variant: 'social' },
  G: { label: 'Governance', variant: 'governance' },
};

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--grn)';
  if (score >= 50) return 'var(--amb)';
  return 'var(--red)';
}

function TrendArrow({ current, previous }: { current: number; previous: number | null }) {
  if (previous == null) {
    return <span className="text-[10px] text-[var(--tx3)]">--</span>;
  }

  const delta = current - previous;

  if (Math.abs(delta) < 1) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--tx3)]">
        <Minus size={10} />
        <span>0</span>
      </span>
    );
  }

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--grntx)]">
        <ArrowUp size={10} />
        <span>+{Math.round(delta)}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--redtx)]">
      <ArrowDown size={10} />
      <span>{Math.round(delta)}</span>
    </span>
  );
}

function PillarScoreCard({
  pillar,
  previousScore,
}: {
  pillar: PillarScore;
  previousScore: number | null;
}) {
  const config = PILLAR_CONFIG[pillar.pillar] ?? {
    label: pillar.pillar,
    variant: 'neutral' as const,
  };

  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2">
      <Badge variant={config.variant}>{config.label}</Badge>
      <span
        className="text-xl font-bold font-[var(--fm)]"
        style={{ color: scoreColor(pillar.score) }}
      >
        {Math.round(pillar.score)}
      </span>
      <TrendArrow current={pillar.score} previous={previousScore} />
    </div>
  );
}

interface ScoreOverviewProps {
  nodeId: string;
  periodId: string;
  previousPeriodId?: string;
}

export function ScoreOverview({ nodeId, periodId, previousPeriodId }: ScoreOverviewProps) {
  const { data, isLoading, error } = useScores({ nodeId, periodId });
  const { data: prevData } = useScores({
    nodeId,
    periodId: previousPeriodId ?? '',
    enabled: !!previousPeriodId,
  });

  const breakdown = data?.data;
  const prevBreakdown = prevData?.data;

  function getPreviousPillarScore(pillarKey: string): number | null {
    if (!prevBreakdown) return null;
    const prev = prevBreakdown.pillars.find((p) => p.pillar === pillarKey);
    return prev ? prev.score : null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ESG Score</CardTitle>
        {breakdown && (
          <Badge variant="neutral">{breakdown.parameterCount} params</Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-[11px] text-[var(--tx3)] py-4 text-center">
            Loading scores...
          </p>
        )}
        {error && (
          <p className="text-[11px] text-[var(--redtx)] py-4 text-center">
            Failed to load scores
          </p>
        )}
        {breakdown && (
          <div className="flex flex-col items-center gap-4">
            {/* Overall Score */}
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-4xl font-bold font-[var(--fm)]"
                style={{ color: scoreColor(breakdown.overall) }}
              >
                {Math.round(breakdown.overall)}
              </span>
              <span className="text-[11px] text-[var(--tx2)]">Overall Score</span>
              <TrendArrow
                current={breakdown.overall}
                previous={prevBreakdown?.overall ?? null}
              />
            </div>

            {/* Pillar Scores */}
            <div className="flex justify-center gap-2 border-t border-[var(--bdr2)] pt-3 w-full">
              {breakdown.pillars.map((pillar) => (
                <PillarScoreCard
                  key={pillar.pillar}
                  pillar={pillar}
                  previousScore={getPreviousPillarScore(pillar.pillar)}
                />
              ))}
            </div>
          </div>
        )}
        {!isLoading && !error && !breakdown && (
          <p className="text-[11px] text-[var(--tx3)] py-4 text-center">
            No score data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
