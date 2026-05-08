'use client';

import { Fragment, useState, useMemo, useEffect } from 'react';
import type { CorrelationMetric } from '@/services/correlationService';

interface CorrelationMatrixProps {
  metrics: CorrelationMetric[];
  matrix: (number | null)[][];
}

function getCellBackground(value: number | null, isDiagonal: boolean): string {
  if (isDiagonal) return '#0f766e';
  if (value === null) return '#f8fafc';
  if (value >= 0.7) return '#0f766e';
  if (value >= 0.4) return '#5eead4';
  if (value >= 0.2) return '#ccfbf1';
  if (value <= -0.7) return '#991b1b';
  if (value <= -0.4) return '#ef4444';
  if (value <= -0.2) return '#fca5a5';
  return '#e2e8f0';
}

function getCellTextColor(value: number | null, isDiagonal: boolean): string {
  if (isDiagonal) return '#ffffff';
  if (value === null) return '#94a3b8';
  const abs = Math.abs(value);
  if (abs >= 0.4) return '#ffffff';
  if (abs >= 0.2) return '#0f172a';
  return '#94a3b8';
}

function formatValue(value: number | null, isDiagonal: boolean): string {
  if (isDiagonal) return '1.00';
  if (value === null) return '—';
  return value.toFixed(2);
}

/**
 * Correlation heatmap component.
 * Displays a symmetric correlation matrix as a color-coded grid.
 * Color scale: -1 (red) → 0 (white) → +1 (green).
 * Null values (non-significant) displayed as dashes with neutral background.
 */
export default function CorrelationMatrix({ metrics, matrix }: CorrelationMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  // Reset hover state when metrics change to prevent stale index access
  useEffect(() => {
    setHoveredCell(null);
  }, [metrics]);

  // Truncate long metric names for axis labels
  const labels = useMemo(
    () => metrics.map((m) => (m.canonicalName.length > 18 ? m.canonicalName.slice(0, 16) + '…' : m.canonicalName)),
    [metrics]
  );

  if (metrics.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--tx3)', padding: '20px 0', textAlign: 'center' }}>
        No correlation data available
      </div>
    );
  }

  const hoveredValue =
    hoveredCell && !isDiag(hoveredCell.row, hoveredCell.col)
      ? matrix[hoveredCell.row][hoveredCell.col]
      : null;

  return (
    <div>
      {/* Tooltip for hovered cell */}
      {hoveredCell && !isDiag(hoveredCell.row, hoveredCell.col) && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--tx2)',
            marginBottom: 6,
            fontFamily: 'var(--fm)',
          }}
        >
          {metrics[hoveredCell.row].canonicalName} × {metrics[hoveredCell.col].canonicalName}:{' '}
          <strong style={{ color: 'var(--tx1)' }}>
            {hoveredValue !== null ? `r = ${hoveredValue.toFixed(4)}` : 'not significant'}
          </strong>
        </div>
      )}

      {/* Heatmap grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `110px repeat(${metrics.length}, 1fr)`,
          gap: 2,
          fontSize: 9,
        }}
      >
        {/* Header row — metric labels */}
        <div />
        {labels.map((label, i) => (
          <div
            key={metrics[i].canonicalId}
            style={{
              padding: '4px 2px',
              fontWeight: 700,
              color: 'var(--t700)',
              textAlign: 'center',
              fontSize: 9,
            }}
            title={metrics[i].canonicalName}
          >
            {label}
          </div>
        ))}

        {/* Data rows */}
        {metrics.map((rowMetric, i) => (
          <Fragment key={rowMetric.canonicalId}>
            {/* Row label */}
            <div
              style={{
                padding: '4px 6px',
                fontWeight: 600,
                color: 'var(--tx2)',
                fontSize: 9,
                display: 'flex',
                alignItems: 'center',
              }}
              title={rowMetric.canonicalName}
            >
              {labels[i]}
            </div>

            {/* Cells */}
            {matrix[i].map((value, j) => {
              const diag = isDiag(i, j);
              const isHovered =
                hoveredCell?.row === i && hoveredCell?.col === j;

              return (
                <div
                  key={`${i}-${j}`}
                  style={{
                    padding: '6px 4px',
                    background: getCellBackground(value, diag),
                    color: getCellTextColor(value, diag),
                    borderRadius: 4,
                    textAlign: 'center',
                    fontFamily: 'var(--fm)',
                    fontWeight: diag ? 700 : 400,
                    cursor: diag ? 'default' : 'pointer',
                    transition: 'transform 0.1s',
                    transform: isHovered && !diag ? 'scale(1.15)' : undefined,
                    fontSize: 9,
                  }}
                  onMouseEnter={() => {
                    if (!diag) setHoveredCell({ row: i, col: j });
                  }}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {formatValue(value, diag)}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
          fontSize: 9,
          color: 'var(--tx3)',
        }}
      >
        <span>-1</span>
        <div
          style={{
            display: 'flex',
            height: 8,
            flex: 1,
            maxWidth: 200,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, background: '#991b1b' }} />
          <div style={{ flex: 1, background: '#ef4444' }} />
          <div style={{ flex: 1, background: '#fca5a5' }} />
          <div style={{ flex: 1, background: '#e2e8f0' }} />
          <div style={{ flex: 1, background: '#ccfbf1' }} />
          <div style={{ flex: 1, background: '#5eead4' }} />
          <div style={{ flex: 1, background: '#0f766e' }} />
        </div>
        <span>+1</span>
        <span style={{ marginLeft: 8 }}>— = not significant</span>
      </div>
    </div>
  );
}

function isDiag(i: number, j: number): boolean {
  return i === j;
}
