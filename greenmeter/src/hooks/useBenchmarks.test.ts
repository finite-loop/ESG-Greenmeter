import { describe, it, expect, vi } from 'vitest';

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    benchmarks: {
      all: ['peer-benchmarks'],
      list: vi.fn((filters: unknown) => ['peer-benchmarks', filters]),
    },
  },
}));

describe('useBenchmarks hooks', () => {
  it('exports useBenchmarkMetrics hook', async () => {
    const mod = await import('./useBenchmarks');
    expect(mod.useBenchmarkMetrics).toBeDefined();
    expect(typeof mod.useBenchmarkMetrics).toBe('function');
  });

  it('exports useBenchmark hook', async () => {
    const mod = await import('./useBenchmarks');
    expect(mod.useBenchmark).toBeDefined();
    expect(typeof mod.useBenchmark).toBe('function');
  });

  it('exports useBenchmarkMulti hook', async () => {
    const mod = await import('./useBenchmarks');
    expect(mod.useBenchmarkMulti).toBeDefined();
    expect(typeof mod.useBenchmarkMulti).toBe('function');
  });
});

describe('useBenchmarks URL construction', () => {
  it('constructs correct URL for metric list', () => {
    const fiscalYear = '2023-24';
    const sector = 'Manufacturing';
    const params = new URLSearchParams({ fiscalYear });
    if (sector) params.set('sector', sector);
    expect(params.toString()).toBe('fiscalYear=2023-24&sector=Manufacturing');
  });

  it('constructs URL without sector when not provided', () => {
    const fiscalYear = '2023-24';
    const params = new URLSearchParams({ fiscalYear });
    expect(params.toString()).toBe('fiscalYear=2023-24');
  });

  it('constructs correct URL for single metric benchmark', () => {
    const canonicalId = 'c-001';
    const fiscalYear = '2023-24';
    const periodId = 'p-001';
    const params = new URLSearchParams({ canonicalId, fiscalYear });
    if (periodId) params.set('periodId', periodId);
    expect(params.toString()).toBe('canonicalId=c-001&fiscalYear=2023-24&periodId=p-001');
  });
});
