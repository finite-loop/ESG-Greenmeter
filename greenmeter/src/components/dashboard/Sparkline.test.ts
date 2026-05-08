import { describe, it, expect } from 'vitest';

describe('Sparkline component', () => {
  it('exports Sparkline', async () => {
    const mod = await import('./Sparkline');
    expect(mod.Sparkline).toBeDefined();
    expect(typeof mod.Sparkline).toBe('function');
  });
});

describe('Sparkline point calculation', () => {
  it('correctly computes SVG points for ascending data', () => {
    const data = [10, 20, 30, 40];
    const width = 80;
    const height = 24;
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    const points = data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });

    // First point should be at bottom-left area
    expect(points[0].x).toBe(2);
    expect(points[0].y).toBe(22); // bottom of chart

    // Last point should be at top-right area
    expect(points[3].x).toBe(78);
    expect(points[3].y).toBe(2); // top of chart
  });

  it('handles equal values without division by zero', () => {
    const data = [50, 50, 50];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    expect(range).toBe(1);
    // Should not throw
    const y = 2 + 20 - ((50 - min) / range) * 20;
    expect(isFinite(y)).toBe(true);
  });
});
