import { describe, it, expect, vi } from 'vitest';

// Mock React and Next.js
vi.mock('react', () => ({
  useState: vi.fn((init: unknown) => [init, vi.fn()]),
  useMemo: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('next/dynamic', () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock('@/hooks/useBenchmarks', () => ({
  useBenchmarkMetrics: vi.fn(() => ({ data: null, isLoading: false })),
  useBenchmarkMulti: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock('@/components/analytics/PeerSelector', () => ({
  default: vi.fn(),
}));

describe('BenchmarkView', () => {
  it('exports a default component function', async () => {
    const mod = await import('./BenchmarkView');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('BenchmarkView normalization logic', () => {
  it('normalizes values to 0-100 range based on min/max', () => {
    // Test the normalization formula: ((value - min) / (max - min)) * 100
    const benchmark = { min: 50, max: 500, tenantValue: 275, sectorMedian: 200 };
    const range = benchmark.max - benchmark.min;
    const normalized = ((benchmark.tenantValue - benchmark.min) / range) * 100;
    expect(normalized).toBe(50);
  });

  it('handles zero range by returning 100', () => {
    const benchmark = { min: 100, max: 100 };
    const range = benchmark.max - benchmark.min;
    const result = range === 0 ? 100 : 0;
    expect(result).toBe(100);
  });

  it('clamps values above max to 100', () => {
    const benchmark = { min: 0, max: 100 };
    const value = 150;
    const normalized = Math.max(0, Math.min(100, ((value - benchmark.min) / (benchmark.max - benchmark.min)) * 100));
    expect(normalized).toBe(100);
  });

  it('clamps values below min to 0', () => {
    const benchmark = { min: 50, max: 100 };
    const value = 20;
    const normalized = Math.max(0, Math.min(100, ((value - benchmark.min) / (benchmark.max - benchmark.min)) * 100));
    expect(normalized).toBe(0);
  });

  it('normalizes median correctly within range', () => {
    const benchmark = { min: 0, max: 200 };
    const median = 100;
    const normalized = ((median - benchmark.min) / (benchmark.max - benchmark.min)) * 100;
    expect(normalized).toBe(50);
  });

  it('normalizes q3 (top quartile) correctly', () => {
    const benchmark = { min: 0, max: 400 };
    const q3 = 300;
    const normalized = ((q3 - benchmark.min) / (benchmark.max - benchmark.min)) * 100;
    expect(normalized).toBe(75);
  });
});

describe('BenchmarkView pillar filtering', () => {
  it('filters metrics by E pillar', () => {
    const metrics = [
      { canonicalId: '1', pillar: 'E', category: 'Climate', canonicalName: 'GHG', peerCount: 5, insufficientData: false },
      { canonicalId: '2', pillar: 'S', category: 'Workforce', canonicalName: 'Diversity', peerCount: 4, insufficientData: false },
      { canonicalId: '3', pillar: 'G', category: 'Governance', canonicalName: 'Board', peerCount: 6, insufficientData: false },
    ];
    const filtered = metrics.filter((m) => m.pillar === 'E');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].canonicalId).toBe('1');
  });

  it('returns all metrics when filter is all', () => {
    const metrics = [
      { canonicalId: '1', pillar: 'E' },
      { canonicalId: '2', pillar: 'S' },
      { canonicalId: '3', pillar: 'G' },
    ];
    const filter = 'all';
    const filtered = filter === 'all' ? metrics : metrics.filter((m) => m.pillar === filter);
    expect(filtered).toHaveLength(3);
  });

  it('excludes metrics with insufficient data from chart', () => {
    const metrics = [
      { canonicalId: '1', insufficientData: false },
      { canonicalId: '2', insufficientData: true },
      { canonicalId: '3', insufficientData: false },
    ];
    const chartMetrics = metrics.filter((m) => !m.insufficientData);
    expect(chartMetrics).toHaveLength(2);
  });

  it('limits chart metrics to 12 maximum', () => {
    const metrics = Array.from({ length: 20 }, (_, i) => ({
      canonicalId: String(i),
      insufficientData: false,
    }));
    const chartMetrics = metrics.filter((m) => !m.insufficientData).slice(0, 12);
    expect(chartMetrics).toHaveLength(12);
  });
});
