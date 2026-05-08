import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    periods: {
      all: ['periods'],
      list: vi.fn(() => ['periods', 'list']),
    },
    orgNodes: {
      all: ['org-nodes'],
      tree: vi.fn(() => ['org-nodes', 'tree']),
    },
    benchmarks: {
      all: ['peer-benchmarks'],
      list: vi.fn((filters: unknown) => ['peer-benchmarks', filters]),
    },
    esgScores: {
      all: ['esg-scores'],
      list: vi.fn((filters: unknown) => ['esg-scores', filters]),
    },
    recommendations: {
      all: ['recommendations'],
      list: vi.fn((filters: unknown) => ['recommendations', filters]),
    },
    reports: {
      all: ['reports'],
      coverage: vi.fn((filters: unknown) => ['reports', 'coverage', filters]),
    },
  },
}));

vi.mock('@/stores/filterStore', () => ({
  useFilterStore: vi.fn(() => ({
    activePeriod: null,
    selectedStandard: null,
  })),
}));

vi.mock('lucide-react', () => ({
  ArrowUp: () => 'ArrowUp',
  ArrowDown: () => 'ArrowDown',
  Minus: () => 'Minus',
}));

describe('DashboardPage', () => {
  it('exports default page component', async () => {
    const mod = await import('./page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('Period resolution logic', () => {
  it('selects first period when no active period is set', () => {
    const activePeriod: string | null = null;
    const periods = [
      { periodId: 'p1', fiscalYear: '2024-25' },
      { periodId: 'p2', fiscalYear: '2023-24' },
    ];

    const currentPeriod = activePeriod
      ? periods.find((p) => p.periodId === activePeriod) ?? periods[0]
      : periods[0];

    expect(currentPeriod.periodId).toBe('p1');
  });

  it('selects matching period when active period is set', () => {
    const activePeriod = 'p2';
    const periods = [
      { periodId: 'p1', fiscalYear: '2024-25' },
      { periodId: 'p2', fiscalYear: '2023-24' },
    ];

    const currentPeriod = activePeriod
      ? periods.find((p) => p.periodId === activePeriod) ?? periods[0]
      : periods[0];

    expect(currentPeriod.periodId).toBe('p2');
  });

  it('finds previous period correctly', () => {
    const periods = [
      { periodId: 'p1', fiscalYear: '2024-25' },
      { periodId: 'p2', fiscalYear: '2023-24' },
      { periodId: 'p3', fiscalYear: '2022-23' },
    ];

    const currentPeriod = periods[0];
    const idx = periods.findIndex(
      (p) => p.periodId === currentPeriod.periodId
    );
    const previousPeriod =
      idx >= 0 && idx + 1 < periods.length ? periods[idx + 1] : undefined;

    expect(previousPeriod?.periodId).toBe('p2');
  });

  it('returns undefined for previous when current is last', () => {
    const periods = [{ periodId: 'p1', fiscalYear: '2024-25' }];

    const currentPeriod = periods[0];
    const idx = periods.findIndex(
      (p) => p.periodId === currentPeriod.periodId
    );
    const previousPeriod =
      idx >= 0 && idx + 1 < periods.length ? periods[idx + 1] : undefined;

    expect(previousPeriod).toBeUndefined();
  });
});

describe('Root node resolution logic', () => {
  it('finds root node (no parent)', () => {
    const orgNodes = [
      { nodeId: 'n1', name: 'Dept A', parentNodeId: 'n2', nodeType: 'department', level: 2 },
      { nodeId: 'n2', name: 'Org', parentNodeId: null, nodeType: 'organization', level: 1 },
    ];

    const rootNode = orgNodes.find((n) => n.parentNodeId === null) ?? orgNodes[0];
    expect(rootNode.nodeId).toBe('n2');
  });

  it('falls back to first node if no root', () => {
    const orgNodes = [
      { nodeId: 'n1', name: 'Dept A', parentNodeId: 'n2', nodeType: 'department', level: 2 },
    ];

    const rootNode = orgNodes.find((n) => n.parentNodeId === null) ?? orgNodes[0];
    expect(rootNode.nodeId).toBe('n1');
  });
});

describe('Benchmark metric filtering', () => {
  it('filters out metrics with insufficient data', () => {
    const metrics = [
      { canonicalId: 'c1', insufficientData: false },
      { canonicalId: 'c2', insufficientData: true },
      { canonicalId: 'c3', insufficientData: false },
    ];

    const canonicalIds = metrics
      .filter((m) => !m.insufficientData)
      .map((m) => m.canonicalId);

    expect(canonicalIds).toEqual(['c1', 'c3']);
  });
});
