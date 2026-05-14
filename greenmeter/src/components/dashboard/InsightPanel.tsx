'use client';

import { useState } from 'react';
import { useInsights, type InsightSection, type InsightItem } from '@/hooks/useInsights';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

const SEVERITY_DOT: Record<string, string> = {
  critical: 'var(--red)',
  warning: 'var(--amb)',
  info: 'var(--t500)',
  good: 'var(--grn)',
};

const SECTION_ICONS: Record<string, string> = {
  risk: '\u26A0',      // ⚠
  position: '\u2195',  // ↕
  actions: '\u2192',   // →
  compliance: '\u2713', // ✓
  trends: '\u2197',    // ↗
};

const PILLAR_BADGE: Record<string, string> = {
  E: 'b-e',
  S: 'b-s',
  G: 'b-g',
};

function InsightItemRow({ item }: { item: InsightItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0' }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: SEVERITY_DOT[item.severity ?? 'info'],
          flexShrink: 0,
          marginTop: 5,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--tx1)', lineHeight: 1.5 }}>{item.text}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          {item.pillar && (
            <span className={`badge ${PILLAR_BADGE[item.pillar] ?? 'b-gray'}`} style={{ fontSize: 8 }}>
              {item.pillar}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: InsightSection }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      style={{
        borderBottom: '.5px solid var(--bdr2)',
        padding: '10px 14px',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: SEVERITY_DOT[section.severity],
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', flex: 1 }}>
          {SECTION_ICONS[section.id] ?? ''} {section.title}
        </span>
        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>
          {section.items.length} item{section.items.length !== 1 ? 's' : ''}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--tx3)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .15s',
          }}
        >
          &rsaquo;
        </span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 16, paddingTop: 4 }}>
          {section.items.map((item, i) => (
            <InsightItemRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

interface InsightPanelProps {
  periodId?: string;
}

export function InsightPanel({ periodId }: InsightPanelProps) {
  const { data, isLoading, error } = useInsights(periodId);
  const briefing = data?.data;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>AI Insight Briefing</CardTitle>
          {briefing && (
            <span style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 1, display: 'block' }}>
              {briefing.sections.length} areas analysed
            </span>
          )}
        </div>
      </CardHeader>
      <div>
        {isLoading && (
          <p style={{ fontSize: 11, color: 'var(--tx3)', padding: '16px 0', textAlign: 'center' }}>
            Generating briefing...
          </p>
        )}
        {error && (
          <p style={{ fontSize: 11, color: 'var(--redtx)', padding: '16px 0', textAlign: 'center' }}>
            Failed to load insight briefing
          </p>
        )}
        {!isLoading && !error && !briefing && (
          <p style={{ fontSize: 11, color: 'var(--tx3)', padding: '16px 0', textAlign: 'center' }}>
            No insight data available
          </p>
        )}
        {briefing && (
          <>
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '.5px solid var(--bdr2)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--tx1)',
                lineHeight: 1.5,
                background: 'var(--t50)',
              }}
            >
              {briefing.summary}
            </div>
            {briefing.sections.map(section => (
              <SectionCard key={section.id} section={section} />
            ))}
          </>
        )}
      </div>
    </Card>
  );
}
