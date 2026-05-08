'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import PeerSelector from '@/components/analytics/PeerSelector';
import { useBenchmarkMetrics, useBenchmarkMulti } from '@/hooks/useBenchmarks';
import type { BenchmarkResult } from '@/services/benchmarkService';

const RadarChart = dynamic(() => import('@/components/charts/RadarChart'), { ssr: false });

type PillarFilter = 'all' | 'E' | 'S' | 'G';

const MIN_RADAR_AXES = 3;

interface BenchmarkViewProps {
  fiscalYear: string;
  periodId?: string;
}

/**
 * Radar chart view comparing tenant metrics against peer median and top quartile.
 * Supports pillar filtering (E, S, G, all) and peer selection.
 */
export default function BenchmarkView({ fiscalYear, periodId }: BenchmarkViewProps) {
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>('all');
  const [selectedPeerIds, setSelectedPeerIds] = useState<string[]>([]);

  // Fetch available metrics for benchmarking (filtered by selected peers)
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useBenchmarkMetrics({
    fiscalYear,
    peerIds: selectedPeerIds.length > 0 ? selectedPeerIds : undefined,
  });

  const availableMetrics = metricsData?.data ?? [];

  // Filter by pillar
  const filteredMetrics = useMemo(() => {
    if (pillarFilter === 'all') return availableMetrics;
    return availableMetrics.filter((m) => m.pillar === pillarFilter);
  }, [availableMetrics, pillarFilter]);

  // Only use metrics with sufficient data, limit to keep chart readable
  const chartMetricIds = useMemo(() => {
    return filteredMetrics
      .filter((m) => !m.insufficientData)
      .slice(0, 12)
      .map((m) => m.canonicalId);
  }, [filteredMetrics]);

  // Fetch benchmark data for selected metrics
  const { data: benchmarks, isLoading: benchmarkLoading, error: benchmarkError } = useBenchmarkMulti(
    chartMetricIds,
    fiscalYear,
    {
      periodId,
      peerIds: selectedPeerIds.length > 0 ? selectedPeerIds : undefined,
    }
  );

  const isLoading = metricsLoading || benchmarkLoading;
  const error = metricsError || benchmarkError;

  /** Normalize a value to 0-100 range using min/max of peer distribution */
  function normalizeValue(value: number | null, benchmark: BenchmarkResult): number | null {
    if (value === null) return null;
    const range = benchmark.max - benchmark.min;
    if (range === 0) return 100; // all peers have identical value — tenant matches perfectly
    const normalized = ((value - benchmark.min) / range) * 100;
    return Math.max(0, Math.min(100, normalized));
  }

  // Determine whether tenant data is available (periodId provided)
  const hasTenantData = !!periodId;

  // Build chart data
  const chartData = useMemo(() => {
    if (!benchmarks || benchmarks.length === 0) {
      return { labels: [], tenantData: [], medianData: [], topQuartileData: [] };
    }

    const labels = benchmarks.map((b) => b.canonicalName);
    const tenantData = benchmarks.map((b) => normalizeValue(b.tenantValue, b));
    const medianData = benchmarks.map((b) => normalizeValue(b.sectorMedian, b) ?? 0);
    const topQuartileData = benchmarks.map((b) => normalizeValue(b.q3, b) ?? 0);

    return { labels, tenantData, medianData, topQuartileData };
  }, [benchmarks]);

  const datasets = useMemo(() => {
    const ds = [];

    // Only show tenant data when periodId is provided and at least one metric has a value
    if (hasTenantData && benchmarks?.some((b) => b.tenantValue !== null)) {
      ds.push({
        label: 'Your organisation',
        data: chartData.tenantData,
        borderColor: '#0f766e',
        backgroundColor: 'rgba(20,184,166,.15)',
        pointBackgroundColor: '#0f766e',
        borderWidth: 2,
      });
    }

    // Sector median
    ds.push({
      label: 'Sector median',
      data: chartData.medianData,
      borderColor: '#94a3b8',
      backgroundColor: 'transparent',
      pointBackgroundColor: '#94a3b8',
      borderWidth: 1,
      borderDash: [4, 4],
    });

    // Top quartile
    ds.push({
      label: 'Top quartile',
      data: chartData.topQuartileData,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,.08)',
      pointBackgroundColor: '#10b981',
      borderWidth: 1.5,
      borderDash: [2, 2],
    });

    return ds;
  }, [chartData, hasTenantData, benchmarks]);

  const pillarOptions: { value: PillarFilter; label: string }[] = [
    { value: 'all', label: 'All pillars' },
    { value: 'E', label: 'Environmental' },
    { value: 'S', label: 'Social' },
    { value: 'G', label: 'Governance' },
  ];

  const metricCountByPillar = useMemo(() => {
    const counts = { E: 0, S: 0, G: 0, total: 0 };
    for (const m of availableMetrics) {
      if (!m.insufficientData) {
        if (m.pillar === 'E') counts.E++;
        else if (m.pillar === 'S') counts.S++;
        else if (m.pillar === 'G') counts.G++;
        counts.total++;
      }
    }
    return counts;
  }, [availableMetrics]);

  const tooFewAxes = chartData.labels.length > 0 && chartData.labels.length < MIN_RADAR_AXES;

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Pillar toggle */}
        <div style={{ display: 'flex', gap: 0, border: '.5px solid var(--bdr)', borderRadius: 6, overflow: 'hidden' }}>
          {pillarOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPillarFilter(value)}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: pillarFilter === value ? 700 : 400,
                color: pillarFilter === value ? 'var(--t800)' : 'var(--tx2)',
                background: pillarFilter === value ? 'var(--t50)' : 'var(--surf)',
                border: 'none',
                borderRight: '.5px solid var(--bdr)',
                cursor: 'pointer',
                transition: 'all .12s',
                outline: 'none',
              }}
              className="focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Peer selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Compare with:</span>
          <PeerSelector
            selectedPeerIds={selectedPeerIds}
            onSelectionChange={setSelectedPeerIds}
          />
        </div>

        {/* Metric count badge */}
        <span className="badge b-teal" style={{ fontSize: 9 }}>
          {metricCountByPillar.total} metrics available
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>
            Failed to load benchmark data
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
            {error.message}
          </div>
        </div>
      )}

      {/* Chart area */}
      {!error && isLoading && (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 11, color: 'var(--tx3)' }}>
          Loading benchmark data...
        </div>
      )}

      {!error && !isLoading && chartData.labels.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 4 }}>
            No benchmark data available
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
            Add peer organisations and their KPI data to enable radar chart comparisons.
          </div>
        </div>
      )}

      {!error && !isLoading && tooFewAxes && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 4 }}>
            Not enough metrics for radar chart
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
            At least {MIN_RADAR_AXES} metrics are needed for a radar chart. The current pillar filter yields only {chartData.labels.length}.
            Try selecting &ldquo;All pillars&rdquo; or a different filter.
          </div>
        </div>
      )}

      {!error && !isLoading && chartData.labels.length >= MIN_RADAR_AXES && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <RadarChart labels={chartData.labels} datasets={datasets} height={320} />

          {/* Legend / metric summary */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {benchmarks?.map((b) => (
              <div
                key={b.canonicalId}
                style={{
                  fontSize: 9,
                  padding: '3px 8px',
                  background: 'var(--bg)',
                  border: '.5px solid var(--bdr)',
                  borderRadius: 4,
                  color: 'var(--tx2)',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{b.canonicalName}</span>
                {b.tenantValue !== null && (
                  <>
                    {': '}
                    <span style={{ fontFamily: 'var(--fm)', color: 'var(--t700)' }}>
                      {Number(b.tenantValue).toFixed(1)}
                    </span>
                    {b.percentileRank !== null && (
                      <span style={{ color: 'var(--tx3)', marginLeft: 3 }}>
                        (P{b.percentileRank.toFixed(0)})
                      </span>
                    )}
                  </>
                )}
                {b.tenantValue === null && hasTenantData && (
                  <span style={{ color: 'var(--tx3)', marginLeft: 3, fontStyle: 'italic' }}>
                    N/A
                  </span>
                )}
                <span style={{ color: 'var(--tx3)', marginLeft: 3 }}>
                  {b.peerCount} peers
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
