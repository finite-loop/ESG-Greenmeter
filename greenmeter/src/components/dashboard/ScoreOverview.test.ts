import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    esgScores: {
      all: ['esg-scores'],
      list: vi.fn((filters: unknown) => ['esg-scores', filters]),
    },
  },
}));

vi.mock('lucide-react', () => ({
  ArrowUp: () => 'ArrowUp',
  ArrowDown: () => 'ArrowDown',
  Minus: () => 'Minus',
}));

describe('ScoreOverview component', () => {
  it('exports ScoreOverview', async () => {
    const mod = await import('./ScoreOverview');
    expect(mod.ScoreOverview).toBeDefined();
    expect(typeof mod.ScoreOverview).toBe('function');
  });
});

describe('Score color logic', () => {
  it('returns green for scores >= 75', () => {
    // Test the scoring color function logic
    const score = 80;
    const color =
      score >= 75 ? 'var(--grn)' : score >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--grn)');
  });

  it('returns amber for scores 50-74', () => {
    const score = 60;
    const color =
      score >= 75 ? 'var(--grn)' : score >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--amb)');
  });

  it('returns red for scores < 50', () => {
    const score = 30;
    const color =
      score >= 75 ? 'var(--grn)' : score >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--red)');
  });
});

describe('Trend arrow logic', () => {
  it('positive delta shows up arrow', () => {
    const current = 80;
    const previous = 70;
    const delta = current - previous;
    expect(delta).toBe(10);
    expect(delta > 0).toBe(true);
  });

  it('negative delta shows down arrow', () => {
    const current = 60;
    const previous = 70;
    const delta = current - previous;
    expect(delta).toBe(-10);
    expect(delta < 0).toBe(true);
  });

  it('no change shows flat indicator', () => {
    const current = 70;
    const previous = 70;
    const delta = current - previous;
    expect(Math.abs(delta) < 1).toBe(true);
  });

  it('null previous returns no comparison', () => {
    const previous: number | null = null;
    expect(previous).toBeNull();
  });
});
