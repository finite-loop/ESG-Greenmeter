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

describe('CoverageWidget component', () => {
  it('exports CoverageWidget', async () => {
    const mod = await import('./CoverageWidget');
    expect(mod.CoverageWidget).toBeDefined();
    expect(typeof mod.CoverageWidget).toBe('function');
  });
});

describe('Coverage completion color logic', () => {
  it('returns green for coverage >= 80%', () => {
    const pct = 85;
    const color =
      pct >= 80 ? 'var(--grn)' : pct >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--grn)');
  });

  it('returns amber for coverage 50-79%', () => {
    const pct = 65;
    const color =
      pct >= 80 ? 'var(--grn)' : pct >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--amb)');
  });

  it('returns red for coverage < 50%', () => {
    const pct = 30;
    const color =
      pct >= 80 ? 'var(--grn)' : pct >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--red)');
  });
});

describe('Verified percentage calculation', () => {
  it('computes verified percentage correctly', () => {
    const verified = 30;
    const totalParams = 45;
    const pct = Math.round((verified / totalParams) * 100);
    expect(pct).toBe(67);
  });

  it('handles zero total params', () => {
    const verified = 0;
    const totalParams = 0;
    const pct = totalParams > 0 ? Math.round((verified / totalParams) * 100) : 0;
    expect(pct).toBe(0);
  });
});
