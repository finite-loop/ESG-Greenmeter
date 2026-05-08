'use client';

import { useRef, useEffect } from 'react';

export interface RadarDataset {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  pointBackgroundColor: string;
  borderWidth: number;
  borderDash?: number[];
}

interface RadarChartProps {
  labels: string[];
  datasets: RadarDataset[];
  height?: number;
}

/**
 * Radar chart wrapper using Chart.js.
 * Values are expected on a 0-100 normalized scale.
 * Uses dynamic Chart.js import to avoid SSR issues.
 * Uses a sequence counter to prevent race conditions on rapid prop changes.
 */
export default function RadarChart({ labels, datasets, height = 280 }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    const currentRenderId = ++renderIdRef.current;
    let chart: { destroy: () => void } | undefined;

    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      // If a newer render started while we were importing, bail out
      if (currentRenderId !== renderIdRef.current || !canvasRef.current) return;

      chart = new Chart(canvasRef.current, {
        type: 'radar' as const,
        data: {
          labels,
          datasets: datasets.map((ds) => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.borderColor,
            backgroundColor: ds.backgroundColor,
            pointBackgroundColor: ds.pointBackgroundColor,
            borderWidth: ds.borderWidth,
            borderDash: ds.borderDash,
          })),
        },
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
                label(item) {
                  return `${item.dataset.label}: ${Number(item.parsed.r).toFixed(0)}/100`;
                },
              },
            },
          },
          scales: {
            r: {
              grid: { color: '#f3f4f6' },
              ticks: { display: false },
              pointLabels: {
                font: { family: 'DM Sans', size: 10 },
                color: '#334155',
              },
              min: 0,
              max: 100,
            },
          },
        },
      });
    })();

    return () => {
      chart?.destroy();
    };
  }, [labels, datasets]);

  return (
    <div style={{ height, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
