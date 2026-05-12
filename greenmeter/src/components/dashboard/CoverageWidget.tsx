'use client';

import { useMemo } from 'react';
import { useCoverageMulti, type CoverageData } from '@/hooks/useCoverage';

const FRAMEWORK_CONFIG: Record<string, { label: string; color: string }> = {
  BRSR: { label: 'BRSR', color: '#ef4444' },
  GRI: { label: 'GRI', color: '#14b8a6' },
  ESRS: { label: 'ESRS', color: '#f59e0b' },
  IFRS_S2: { label: 'IFRS', color: '#6366f1' },
};

const ALL_FRAMEWORKS = ['BRSR', 'ESRS', 'GRI', 'IFRS_S2'];

interface CoverageWidgetProps {
  periodId: string;
  frameworks?: string[];
  onNavigateReports?: () => void;
}

export function CoverageWidget({
  periodId,
  frameworks = ALL_FRAMEWORKS,
  onNavigateReports,
}: CoverageWidgetProps) {
  const { data, isLoading, error } = useCoverageMulti(frameworks, periodId, !!periodId);
  const coverages = data?.coverages ?? [];

  const totalParams = useMemo(() => coverages.reduce((sum, c) => sum + c.totalParams, 0), [coverages]);

  // Build donut segments for SVG
  const donutSegments = useMemo(() => {
    if (totalParams === 0) return [];
    let cumAngle = 0;
    const r = 28;
    const c = 2 * Math.PI * r;
    return coverages.map((cov) => {
      const pct = cov.totalParams / totalParams;
      const dashLen = c * pct;
      const offset = -cumAngle;
      cumAngle += dashLen;
      return {
        color: FRAMEWORK_CONFIG[cov.framework]?.color ?? 'var(--t500)',
        dashLen,
        circumference: c,
        offset,
      };
    });
  }, [coverages, totalParams]);

  return (
    <div style={{
      background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12,
      padding: 13, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx1)', marginBottom: 2 }}>Reporting frameworks</div>
        <div style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 10 }}>Active parameter coverage</div>
      </div>

      {isLoading && <p style={{ fontSize: 11, color: 'var(--tx3)', padding: '16px 0', textAlign: 'center' }}>Loading…</p>}
      {error && <p style={{ fontSize: 11, color: 'var(--redtx)', padding: '16px 0', textAlign: 'center' }}>Failed to load</p>}
      {!isLoading && !error && coverages.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--tx3)', padding: '16px 0', textAlign: 'center' }}>No coverage data</p>
      )}

      {coverages.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {/* Donut chart */}
          <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
            <svg width={68} height={68} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={34} cy={34} r={28} fill="none" stroke="var(--bdr2)" strokeWidth={5} />
              {donutSegments.map((seg, i) => (
                <circle key={i} cx={34} cy={34} r={28} fill="none"
                  stroke={seg.color} strokeWidth={5}
                  strokeDasharray={`${seg.dashLen} ${seg.circumference - seg.dashLen}`}
                  strokeDashoffset={seg.offset} strokeLinecap="butt" />
              ))}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)', lineHeight: 1 }}>{totalParams}</div>
              <div style={{ fontSize: 8, color: 'var(--tx3)' }}>total</div>
            </div>
          </div>
          {/* Framework rows */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {coverages.map((cov) => {
              const cfg = FRAMEWORK_CONFIG[cov.framework] ?? { label: cov.framework, color: 'var(--t500)' };
              return (
                <div key={cov.framework} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--tx2)', width: 30 }}>{cfg.label}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--bdr2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: cfg.color, width: `${cov.percentComplete}%` }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)', minWidth: 18, textAlign: 'right' }}>{cov.totalParams}</span>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--grn)' }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onNavigateReports}
        style={{
          width: '100%', border: '.5px solid var(--bdr)', background: 'var(--surf)', borderRadius: 7,
          padding: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'var(--tx1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}
      >
        View Report Builder →
      </button>
    </div>
  );
}
