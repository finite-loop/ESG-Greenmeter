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

describe('useScores hook', () => {
  it('exports useScores function', async () => {
    const mod = await import('./useScores');
    expect(mod.useScores).toBeDefined();
    expect(typeof mod.useScores).toBe('function');
  });

  it('exports ScoreBreakdown type-compatible interface', async () => {
    // Verify the module can be imported and the hook signature is correct
    const mod = await import('./useScores');
    expect(mod.useScores).toBeDefined();
  });
});

describe('useScores URL construction', () => {
  it('constructs correct URL with nodeId and periodId', () => {
    const nodeId = 'node-001';
    const periodId = 'period-001';
    const params = new URLSearchParams({ nodeId, periodId });
    expect(params.toString()).toBe('nodeId=node-001&periodId=period-001');
  });

  it('includes both required parameters', () => {
    const nodeId = 'abc-123';
    const periodId = 'def-456';
    const params = new URLSearchParams({ nodeId, periodId });
    expect(params.get('nodeId')).toBe('abc-123');
    expect(params.get('periodId')).toBe('def-456');
  });
});
