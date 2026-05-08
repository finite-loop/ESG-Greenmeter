'use client';

import { useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import type { Scope3SupplierBreakdown } from '@/hooks/useSuppliers';

interface Scope3BreakdownProps {
  totalScope3Cat1: number;
  supplierBreakdown: Scope3SupplierBreakdown[];
  onSupplierClick?: (supplierId: string) => void;
}

const CHART_COLORS = [
  '#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

function formatTons(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export default function Scope3Breakdown({
  totalScope3Cat1,
  supplierBreakdown,
  onSupplierClick,
}: Scope3BreakdownProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let chart: unknown;
    let cancelled = false;

    if (supplierBreakdown.length === 0) return;

    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      if (cancelled || !canvasRef.current) return;

      const labels = supplierBreakdown.map((s) => s.supplierName);
      const data = supplierBreakdown.map((s) => s.scope3Contribution);
      const colors = supplierBreakdown.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

      chart = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Scope 3 Cat 1 (tCO2e)',
              data,
              backgroundColor: colors,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${formatTons(ctx.raw as number)} tCO2e`,
              },
            },
          },
          scales: {
            x: {
              title: { display: true, text: 'tCO2e' },
              grid: { color: '#f1f5f9' },
            },
            y: {
              grid: { display: false },
            },
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      if (chart && typeof (chart as { destroy: () => void }).destroy === 'function') {
        (chart as { destroy: () => void }).destroy();
      }
    };
  }, [supplierBreakdown]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Total summary card */}
      <div className="stat-card" style={{ textAlign: 'center' }}>
        <div className="slbl">Total Scope 3 Cat 1</div>
        <div className="sval" style={{ color: 'var(--t700)', fontSize: 28 }}>
          {formatTons(totalScope3Cat1)}
        </div>
        <div className="ssub">tCO2e from all suppliers</div>
      </div>

      {/* Chart */}
      {supplierBreakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Scope 3 Emissions by Supplier</CardTitle>
              <CardDescription>
                Category 1 purchased goods &amp; services emissions
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ height: Math.max(200, supplierBreakdown.length * 40) }}>
              <canvas ref={canvasRef} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="p-8 text-center text-xs text-[var(--tx3)]">
              No Scope 3 emissions data available. Invite suppliers to submit their data via the portal.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown table */}
      {supplierBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Supplier Contributions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bdr)' }}>
                  <th style={thStyle}>Supplier</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Emissions (tCO2e)</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Share</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Fiscal Year</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {supplierBreakdown.map((row, i) => (
                  <tr
                    key={row.supplierId}
                    style={{ borderBottom: '1px solid var(--bdr)' }}
                  >
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: CHART_COLORS[i % CHART_COLORS.length],
                          marginRight: 8,
                        }}
                      />
                      {row.supplierName}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {formatTons(row.scope3Contribution)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--tx3)' }}>
                      {row.percentage.toFixed(1)}%
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--tx3)' }}>
                      {row.fiscalYear}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => onSupplierClick?.(row.supplierId)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--bdr)',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          color: 'var(--t700)',
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontWeight: 600,
  fontSize: 11,
  color: 'var(--tx3)',
  textAlign: 'left',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
};
