import { describe, it, expect, vi } from 'vitest';

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
  })),
  registerables: [],
}));

describe('ForecastChart', () => {
  it('exports a default component function', async () => {
    const mod = await import('./ForecastChart');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('exports required TypeScript types (module compiles)', async () => {
    const mod = await import('./ForecastChart');
    expect(mod).toBeDefined();
  });
});
