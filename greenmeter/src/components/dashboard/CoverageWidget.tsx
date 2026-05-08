'use client';

import { useCoverageMulti, type CoverageData } from '@/hooks/useCoverage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';

const FRAMEWORK_CONFIG: Record<string, { label: string; color: string }> = {
  BRSR: { label: 'BRSR Core', color: '#ef4444' },
  ESRS: { label: 'ESRS (CSRD)', color: '#f59e0b' },
  GRI: { label: 'GRI 2021', color: '#14b8a6' },
  IFRS_S2: { label: 'IFRS S1+S2', color: '#6366f1' },
};

function completionColor(pct: number): string {
  if (pct >= 80) return 'var(--grn)';
  if (pct >= 50) return 'var(--amb)';
  return 'var(--red)';
}

function FrameworkRow({ coverage }: { coverage: CoverageData }) {
  const config = FRAMEWORK_CONFIG[coverage.framework] ?? {
    label: coverage.framework,
    color: 'var(--t500)',
  };

  const verifiedPct =
    coverage.totalParams > 0
      ? Math.round((coverage.verified / coverage.totalParams) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-1.5 py-2 border-b border-[var(--bdr2)] last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--tx1)]">
          {config.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--tx3)]">
            {verifiedPct}% verified
          </span>
          {coverage.belowThreshold && (
            <Badge variant="warning">Below threshold</Badge>
          )}
        </div>
      </div>
      <ProgressBar
        value={coverage.percentComplete}
        color={completionColor(coverage.percentComplete)}
      />
    </div>
  );
}

const ALL_FRAMEWORKS = ['BRSR', 'ESRS', 'GRI', 'IFRS_S2'];

interface CoverageWidgetProps {
  periodId: string;
  frameworks?: string[];
}

export function CoverageWidget({
  periodId,
  frameworks = ALL_FRAMEWORKS,
}: CoverageWidgetProps) {
  const { data, isLoading, error } = useCoverageMulti(
    frameworks,
    periodId,
    !!periodId
  );

  const coverages = data?.coverages ?? [];
  const failedCount = data?.failedCount ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Framework Coverage</CardTitle>
        {coverages.length > 0 && (
          <Badge variant="neutral">{coverages.length} frameworks</Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-[11px] text-[var(--tx3)] py-4 text-center">
            Loading coverage...
          </p>
        )}
        {error && (
          <p className="text-[11px] text-[var(--redtx)] py-4 text-center">
            Failed to load coverage data
          </p>
        )}
        {!isLoading && !error && coverages.length === 0 && (
          <p className="text-[11px] text-[var(--tx3)] py-4 text-center">
            No coverage data available
          </p>
        )}
        {coverages.length > 0 && (
          <div className="flex flex-col">
            {coverages.map((cov) => (
              <FrameworkRow key={cov.framework} coverage={cov} />
            ))}
            {failedCount > 0 && (
              <p className="text-[10px] text-[var(--ambtx)] pt-2 text-center">
                {failedCount} framework{failedCount > 1 ? 's' : ''} unavailable
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
