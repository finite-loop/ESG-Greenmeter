'use client';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

/**
 * Lightweight SVG sparkline component for inline trend visualization.
 * Renders a simple polyline with no axes or labels.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'var(--t500)',
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <span className="text-[10px] text-[var(--tx3)]">--</span>
    );
  }

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-label={`Trend: ${data.map((d) => Math.round(d)).join(', ')}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Endpoint dot */}
      {data.length > 0 && (
        <circle
          cx={padding + chartWidth}
          cy={
            padding +
            chartHeight -
            ((data[data.length - 1] - min) / range) * chartHeight
          }
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}
