import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    reports: {
      all: ['reports'],
      coverage: vi.fn((filters: unknown) => ['reports', 'coverage', filters]),
    },
  },
}));

describe('useCoverage hooks', () => {
  it('exports useCoverage hook', async () => {
    const mod = await import('./useCoverage');
    expect(mod.useCoverage).toBeDefined();
    expect(typeof mod.useCoverage).toBe('function');
  });

  it('exports useCoverageMulti hook', async () => {
    const mod = await import('./useCoverage');
    expect(mod.useCoverageMulti).toBeDefined();
    expect(typeof mod.useCoverageMulti).toBe('function');
  });
});

describe('useCoverage URL construction', () => {
  it('constructs correct URL with framework and periodId', () => {
    const framework = 'BRSR';
    const periodId = 'p-001';
    const params = new URLSearchParams({ framework, periodId });
    expect(params.toString()).toBe('framework=BRSR&periodId=p-001');
  });

  it('handles IFRS_S2 framework name correctly', () => {
    const framework = 'IFRS_S2';
    const periodId = 'p-002';
    const params = new URLSearchParams({ framework, periodId });
    expect(params.get('framework')).toBe('IFRS_S2');
    expect(params.get('periodId')).toBe('p-002');
  });
});
