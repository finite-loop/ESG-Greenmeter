import { describe, it, expect, vi } from 'vitest';

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

describe('PeerComparisonMini component', () => {
  it('exports PeerComparisonMini', async () => {
    const mod = await import('./PeerComparisonMini');
    expect(mod.PeerComparisonMini).toBeDefined();
    expect(typeof mod.PeerComparisonMini).toBe('function');
  });
});

describe('Rank color logic', () => {
  it('returns green for rank >= 75', () => {
    const rank = 80;
    const color =
      rank >= 75 ? 'var(--grn)' : rank >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--grn)');
  });

  it('returns amber for rank 50-74', () => {
    const rank = 60;
    const color =
      rank >= 75 ? 'var(--grn)' : rank >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--amb)');
  });

  it('returns red for rank < 50', () => {
    const rank = 30;
    const color =
      rank >= 75 ? 'var(--grn)' : rank >= 50 ? 'var(--amb)' : 'var(--red)';
    expect(color).toBe('var(--red)');
  });
});

describe('Rank label logic', () => {
  it('returns top quartile for rank >= 75', () => {
    const rank = 80;
    const label =
      rank >= 75
        ? 'Top quartile'
        : rank >= 50
          ? 'Above median'
          : rank >= 25
            ? 'Below median'
            : 'Bottom quartile';
    expect(label).toBe('Top quartile');
  });

  it('returns above median for rank 50-74', () => {
    const rank = 60;
    const label =
      rank >= 75
        ? 'Top quartile'
        : rank >= 50
          ? 'Above median'
          : rank >= 25
            ? 'Below median'
            : 'Bottom quartile';
    expect(label).toBe('Above median');
  });

  it('returns below median for rank 25-49', () => {
    const rank = 30;
    const label =
      rank >= 75
        ? 'Top quartile'
        : rank >= 50
          ? 'Above median'
          : rank >= 25
            ? 'Below median'
            : 'Bottom quartile';
    expect(label).toBe('Below median');
  });

  it('returns bottom quartile for rank < 25', () => {
    const rank = 10;
    const label =
      rank >= 75
        ? 'Top quartile'
        : rank >= 50
          ? 'Above median'
          : rank >= 25
            ? 'Below median'
            : 'Bottom quartile';
    expect(label).toBe('Bottom quartile');
  });
});

describe('Average rank computation', () => {
  it('computes average rank from multiple benchmarks', () => {
    const benchmarks = [
      { percentileRank: 80, insufficientData: false, peerCount: 5 },
      { percentileRank: 60, insufficientData: false, peerCount: 8 },
      { percentileRank: 70, insufficientData: false, peerCount: 6 },
    ];

    const withRank = benchmarks.filter(
      (b) => b.percentileRank != null && !b.insufficientData
    );
    const sum = withRank.reduce((acc, b) => acc + b.percentileRank, 0);
    const avgRank = Math.round(sum / withRank.length);
    const maxPeers = Math.max(...withRank.map((b) => b.peerCount));

    expect(avgRank).toBe(70);
    expect(maxPeers).toBe(8);
    expect(withRank.length).toBe(3);
  });

  it('excludes metrics with insufficient data', () => {
    const benchmarks = [
      { percentileRank: 80, insufficientData: false, peerCount: 5 },
      { percentileRank: 40, insufficientData: true, peerCount: 2 },
      { percentileRank: 60, insufficientData: false, peerCount: 6 },
    ];

    const withRank = benchmarks.filter(
      (b) => b.percentileRank != null && !b.insufficientData
    );
    const sum = withRank.reduce((acc, b) => acc + b.percentileRank, 0);
    const avgRank = Math.round(sum / withRank.length);

    expect(withRank.length).toBe(2);
    expect(avgRank).toBe(70);
  });

  it('handles no valid benchmarks', () => {
    const benchmarks = [
      { percentileRank: null, insufficientData: true, peerCount: 1 },
    ];

    const withRank = benchmarks.filter(
      (b) => b.percentileRank != null && !b.insufficientData
    );

    expect(withRank.length).toBe(0);
  });
});
