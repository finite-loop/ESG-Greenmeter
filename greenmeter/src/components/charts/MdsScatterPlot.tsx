'use client';

import { useRef, useEffect } from 'react';
import type { MdsPoint } from '@/services/mdsService';

interface MdsScatterPlotProps {
  points: MdsPoint[];
  height?: number;
}

/**
 * MDS competitive positioning scatter plot.
 * Renders a 2D scatter chart where each point is a company,
 * with the current tenant highlighted distinctly.
 *
 * Uses dynamic Chart.js import to avoid SSR issues.
 */
export default function MdsScatterPlot({ points, height = 320 }: MdsScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let chart: unknown;
    let cancelled = false;

    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      if (cancelled || !canvasRef.current) return;

      const tenantPoint = points.find((p) => p.isCurrentTenant);
      const peerPoints = points.filter((p) => !p.isCurrentTenant);

      const datasets = [];

      // Peer points
      if (peerPoints.length > 0) {
        datasets.push({
          label: 'Sector peers',
          data: peerPoints.map((p) => ({ x: p.x, y: p.y })),
          backgroundColor: '#94a3b8',
          borderColor: '#64748b',
          borderWidth: 1,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointStyle: 'circle' as const,
        });
      }

      // Tenant point (on top, highlighted)
      if (tenantPoint) {
        datasets.push({
          label: tenantPoint.peerName,
          data: [{ x: tenantPoint.x, y: tenantPoint.y }],
          backgroundColor: '#0f766e',
          borderColor: '#115e59',
          borderWidth: 2,
          pointRadius: 10,
          pointHoverRadius: 12,
          pointStyle: 'rectRounded' as const,
        });
      }

      chart = new Chart(canvasRef.current, {
        type: 'scatter' as const,
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                font: { family: 'DM Sans', size: 10 },
                color: '#64748b',
                boxWidth: 10,
                padding: 8,
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              bodyFont: { family: 'DM Mono', size: 11 },
              titleFont: { family: 'DM Sans', size: 11 },
              callbacks: {
                title(items) {
                  const item = items[0];
                  if (!item) return '';
                  const datasetLabel = item.dataset.label ?? '';
                  if (datasetLabel === 'Sector peers') {
                    const idx = item.dataIndex;
                    return peerPoints[idx]?.peerName ?? 'Peer';
                  }
                  return datasetLabel;
                },
                label(item) {
                  return `Position: (${Number(item.parsed.x).toFixed(2)}, ${Number(item.parsed.y).toFixed(2)})`;
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Dimension 1',
                font: { family: 'DM Sans', size: 10 },
                color: '#94a3b8',
              },
              grid: { color: '#f3f4f6' },
              border: { display: false },
              ticks: {
                font: { family: 'DM Mono', size: 10 },
                color: '#94a3b8',
              },
            },
            y: {
              title: {
                display: true,
                text: 'Dimension 2',
                font: { family: 'DM Sans', size: 10 },
                color: '#94a3b8',
              },
              grid: { color: '#f3f4f6' },
              border: { display: false },
              ticks: {
                font: { family: 'DM Mono', size: 10 },
                color: '#94a3b8',
              },
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
  }, [points]);

  return (
    <div style={{ height, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
