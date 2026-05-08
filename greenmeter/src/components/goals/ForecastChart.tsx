'use client';

import { useRef, useEffect } from 'react';

export interface ForecastHistoricalPoint {
  periodName: string;
  endDate: string;
  value: number;
}

export interface ForecastProjectedValue {
  date: string;
  value: number;
}

export interface ForecastScenarioData {
  name: string;
  projectedValues: ForecastProjectedValue[];
  probability: number;
}

interface ForecastChartProps {
  historicalData: ForecastHistoricalPoint[];
  scenarios: ForecastScenarioData[];
  targetValue: number;
  targetYear: string;
  unit: string | null;
  insufficientData: boolean;
  height?: number;
}

const SCENARIO_COLORS: Record<string, string> = {
  BAU: '#10b981',       // emerald-500
  Moderate: '#f59e0b',  // amber-500
  Aggressive: '#8b5cf6', // violet-500
};

const HISTORICAL_COLOR = '#3b82f6'; // blue-500
const TARGET_COLOR = '#ef4444';     // red-500

/**
 * Forecast chart showing historical data points, 3 scenario trendlines,
 * and a goal target reference line.
 *
 * Uses dynamic Chart.js import to avoid SSR issues.
 * Uses a sequence counter to prevent race conditions on rapid prop changes.
 */
export default function ForecastChart({
  historicalData,
  scenarios,
  targetValue,
  targetYear,
  unit,
  insufficientData,
  height = 320,
}: ForecastChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    if (insufficientData || historicalData.length === 0) return;

    const currentRenderId = ++renderIdRef.current;
    let chart: { destroy: () => void } | undefined;

    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      if (currentRenderId !== renderIdRef.current || !canvasRef.current) return;

      // Build labels: historical period names + projected dates
      const historicalLabels = historicalData.map((d) => d.periodName);
      const projectedLabels = scenarios.length > 0
        ? scenarios[0].projectedValues.map((pv) => formatDateLabel(pv.date))
        : [];
      const allLabels = [...historicalLabels, ...projectedLabels];

      // Historical data points (null-padded for projected range)
      const historicalValues = [
        ...historicalData.map((d) => d.value),
        ...projectedLabels.map(() => null),
      ];

      // Scenario datasets
      const scenarioDatasets = scenarios.map((scenario) => {
        const color = SCENARIO_COLORS[scenario.name] ?? '#6b7280';
        // Connect from last historical point
        const scenarioValues = [
          ...historicalData.slice(0, -1).map(() => null),
          historicalData[historicalData.length - 1].value, // overlap at last historical
          ...scenario.projectedValues.map((pv) => pv.value),
        ];

        return {
          label: `${scenario.name} (${(scenario.probability * 100).toFixed(0)}%)`,
          data: scenarioValues,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          tension: 0.1,
          spanGaps: true,
        };
      });

      // Target reference line (horizontal across all labels)
      const targetDataset = {
        label: `Target (${targetValue}${unit ? ' ' + unit : ''})`,
        data: allLabels.map(() => targetValue),
        borderColor: TARGET_COLOR,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
      };

      chart = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: allLabels,
          datasets: [
            {
              label: 'Historical',
              data: historicalValues,
              borderColor: HISTORICAL_COLOR,
              backgroundColor: HISTORICAL_COLOR,
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: HISTORICAL_COLOR,
              tension: 0.1,
              spanGaps: false,
            },
            ...scenarioDatasets,
            targetDataset,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                font: { family: 'DM Sans', size: 11 },
                color: '#64748b',
                boxWidth: 12,
                padding: 12,
                usePointStyle: true,
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              bodyFont: { family: 'DM Mono', size: 11 },
              titleFont: { family: 'DM Sans', size: 11 },
              callbacks: {
                label(item) {
                  const val = Number(item.parsed.y);
                  if (isNaN(val)) return '';
                  const suffix = unit ? ` ${unit}` : '';
                  return `${item.dataset.label}: ${val.toLocaleString()}${suffix}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#f3f4f6' },
              ticks: {
                font: { family: 'DM Sans', size: 10 },
                color: '#94a3b8',
                maxRotation: 45,
              },
            },
            y: {
              grid: { color: '#f3f4f6' },
              ticks: {
                font: { family: 'DM Mono', size: 10 },
                color: '#94a3b8',
              },
              title: {
                display: !!unit,
                text: unit ?? '',
                font: { family: 'DM Sans', size: 11 },
                color: '#64748b',
              },
            },
          },
        },
      });
    })().catch(() => {
      // Dynamic import failed (e.g., chunk loading error). Canvas remains blank.
    });

    return () => {
      chart?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- targetYear unused in effect body
  }, [historicalData, scenarios, targetValue, unit, insufficientData]);

  if (insufficientData) {
    return (
      <div
        style={{ height, position: 'relative' }}
        className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50"
      >
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">Insufficient data</p>
          <p className="mt-1 text-xs text-slate-400">
            At least 3 historical data points are required for forecasting.
            Currently {historicalData.length} point{historicalData.length !== 1 ? 's' : ''} available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
