'use client';

import { useScores } from '@/hooks/useScores';

const PILLAR_CONFIG: Record<string, { label: string; sublabel: string; color: string }> = {
  E: { label: 'Environment', sublabel: 'Climate & resources', color: '#14b8a6' },
  S: { label: 'People & community', sublabel: 'People & community', color: '#6366f1' },
  G: { label: 'Ethics & oversight', sublabel: 'Ethics & oversight', color: '#f59e0b' },
};

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

  const overallDelta = breakdown && prevBreakdown
    ? Math.round(breakdown.overall - prevBreakdown.overall)
    : null;

  if (isLoading) {
    return (
      <>
        <div style={{ background: 'var(--t900)', borderRadius: 12, padding: 15, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--t400)' }}>Loading…</p>
        </div>
        <div className="stat-card" style={{ minHeight: 120 }} />
        <div className="stat-card" style={{ minHeight: 120 }} />
        <div className="stat-card" style={{ minHeight: 120 }} />
      </>
    );
  }

  if (error || !breakdown) {
    return (
      <>
        <div style={{ background: 'var(--t900)', borderRadius: 12, padding: 15, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--t400)' }}>{error ? 'Failed to load' : 'No data'}</p>
        </div>
        {['E', 'S', 'G'].map(k => (
          <div key={k} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: 13, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--tx3)' }}>—</p>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {/* ESG Score — dark accent card */}
      <div style={{
        background: 'var(--t900)', borderRadius: 12, padding: 15, color: '#fff',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--t300)', marginBottom: 4 }}>ESG Score</div>
          <div style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--fm)', lineHeight: 1 }}>{Math.round(breakdown.overall)}</div>
          <div style={{ fontSize: 10, color: 'var(--t400)', marginTop: 2 }}>out of 100</div>
        </div>
        {overallDelta !== null && overallDelta !== 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,.1)',
            borderRadius: 5, padding: '2px 8px', fontSize: 10, color: 'var(--t200)', marginTop: 8, width: 'fit-content',
          }}>
            {overallDelta > 0 ? '↑' : '↓'} {overallDelta > 0 ? `+${overallDelta}` : overallDelta} pts vs prior
          </div>
        )}
      </div>

      {/* Pillar cards */}
      {breakdown.pillars.map((pillar) => {
        const config = PILLAR_CONFIG[pillar.pillar];
        if (!config) return null;
        const prevScore = getPreviousPillarScore(pillar.pillar);
        const delta = prevScore != null ? Math.round(pillar.score - prevScore) : null;
        const score = Math.round(pillar.score);
        const dashLen = (score / 100) * 94.2;

        return (
          <div key={pillar.pillar} style={{
            background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12,
            padding: 13, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: config.color }} />
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)' }}>
              {pillar.pillar} · {config.label}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx1)', margin: '2px 0 6px' }}>{config.sublabel}</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--fm)', color: config.color }}>{score}</div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>
              {delta != null && delta !== 0
                ? `${delta > 0 ? '↑' : '↓'} ${delta > 0 ? `+${delta}` : delta} vs prior year`
                : '—'}
            </div>
            <svg style={{ position: 'absolute', bottom: 10, right: 12, width: 36, height: 36 }} viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={config.color} strokeWidth="3"
                strokeDasharray={`${dashLen} 94.2`} strokeDashoffset="23.6" strokeLinecap="round" />
            </svg>
          </div>
        );
      })}
    </>
  );
}
