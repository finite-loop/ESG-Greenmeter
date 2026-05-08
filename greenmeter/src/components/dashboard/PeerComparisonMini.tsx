'use client';

import { useMemo } from 'react';
import { useBenchmarkMulti } from '@/hooks/useBenchmarks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sparkline } from './Sparkline';

function rankColor(rank: number): string {
  if (rank >= 75) return 'var(--grn)';
  if (rank >= 50) return 'var(--amb)';
  return 'var(--red)';
}

function rankLabel(rank: number): string {
  if (rank >= 75) return 'Top quartile';
  if (rank >= 50) return 'Above median';
  if (rank >= 25) return 'Below median';
  return 'Bottom quartile';
}

interface PeerComparisonMiniProps {
  /** Canonical IDs of key metrics to track for overall rank */
  canonicalIds: string[];
  fiscalYear: string;
  periodId?: string;
  sector?: string;
  /** Historical percentile ranks for sparkline (most recent last) */
  historicalRanks?: number[];
}

export function PeerComparisonMini({
  canonicalIds,
  fiscalYear,
  periodId,
  sector,
  historicalRanks,
}: PeerComparisonMiniProps) {
  const { data: benchmarks, isLoading, error } = useBenchmarkMulti(
    canonicalIds,
    fiscalYear,
    { periodId, sector }
  );

  const { avgRank, peerCount, metricsWithRank } = useMemo(() => {
    if (!benchmarks || benchmarks.length === 0) {
      return { avgRank: null, peerCount: 0, metricsWithRank: 0 };
    }

    const withRank = benchmarks.filter(
      (b) => b.percentileRank != null && !b.insufficientData
    );

    if (withRank.length === 0) {
      return { avgRank: null, peerCount: 0, metricsWithRank: 0 };
    }

    const sum = withRank.reduce((acc, b) => acc + (b.percentileRank ?? 0), 0);
    const maxPeers = Math.max(...withRank.map((b) => b.peerCount));

    return {
      avgRank: Math.round(sum / withRank.length),
      peerCount: maxPeers,
      metricsWithRank: withRank.length,
    };
  }, [benchmarks]);

  // Build sparkline data: historical ranks + current
  const sparklineData = useMemo(() => {
    const history = historicalRanks ?? [];
    if (avgRank != null) {
      return [...history, avgRank];
    }
    return history;
  }, [historicalRanks, avgRank]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peer Comparison</CardTitle>
        {sector && <Badge variant="neutral">{sector}</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-[11px] text-[var(--tx3)] py-4 text-center">
            Loading peer data...
          </p>
        )}
        {error && (
          <p className="text-[11px] text-[var(--redtx)] py-4 text-center">
            Failed to load peer data
          </p>
        )}
        {!isLoading && !error && avgRank == null && (
          <p className="text-[11px] text-[var(--tx3)] py-4 text-center">
            Insufficient peer data for comparison
          </p>
        )}
        {avgRank != null && (
          <div className="flex flex-col items-center gap-3">
            {/* Percentile Rank */}
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-3xl font-bold font-[var(--fm)]"
                style={{ color: rankColor(avgRank) }}
              >
                P{avgRank}
              </span>
              <span className="text-[11px] text-[var(--tx2)]">
                {rankLabel(avgRank)}
              </span>
            </div>

            {/* Sparkline Trend */}
            {sparklineData.length >= 2 && (
              <div className="flex flex-col items-center gap-0.5">
                <Sparkline
                  data={sparklineData}
                  width={100}
                  height={28}
                  color={rankColor(avgRank)}
                />
                <span className="text-[10px] text-[var(--tx3)]">
                  {sparklineData.length} periods
                </span>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-4 pt-2 border-t border-[var(--bdr2)] w-full justify-center">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold font-[var(--fm)] text-[var(--tx1)]">
                  {peerCount}
                </span>
                <span className="text-[10px] text-[var(--tx3)]">Peers</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold font-[var(--fm)] text-[var(--tx1)]">
                  {metricsWithRank}
                </span>
                <span className="text-[10px] text-[var(--tx3)]">Metrics</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
