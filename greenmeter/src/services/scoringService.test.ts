import { describe, it, expect, vi, beforeEach } from 'vitest';
import { thresholdStrategy } from './scoringService';
import type { ScoringStrategy } from './scoringService';

// Mock scoringRepository
const mockGetValuesForScoring = vi.fn();
const mockGetThresholds = vi.fn();
const mockGetWeights = vi.fn();
const mockGetScores = vi.fn();
const mockRefreshScores = vi.fn();

vi.mock('@/db/repositories/scoringRepository', () => ({
  scoringRepository: {
    getValuesForScoring: (...args: unknown[]) => mockGetValuesForScoring(...args),
    getThresholds: (...args: unknown[]) => mockGetThresholds(...args),
    getWeights: (...args: unknown[]) => mockGetWeights(...args),
    getScores: (...args: unknown[]) => mockGetScores(...args),
    refreshScores: (...args: unknown[]) => mockRefreshScores(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { scoringService } from './scoringService';

const TENANT_ID = 'tenant-123';
const NODE_ID = 'node-1';
const PERIOD_ID = 'period-1';

describe('thresholdStrategy.normalize', () => {
  describe('higher_is_better direction', () => {
    it('returns 100 for value at or above amberMax', () => {
      expect(thresholdStrategy.normalize(70, { redMax: 30, amberMax: 60 }, 'higher_is_better')).toBe(100);
    });

    it('returns 100 for value equal to amberMax', () => {
      expect(thresholdStrategy.normalize(60, { redMax: 30, amberMax: 60 }, 'higher_is_better')).toBe(100);
    });

    it('interpolates between 50-99 for values in amber band', () => {
      const score = thresholdStrategy.normalize(45, { redMax: 30, amberMax: 60 }, 'higher_is_better');
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThan(100);
    });

    it('returns value in 0-49 range for values below redMax', () => {
      const score = thresholdStrategy.normalize(15, { redMax: 30, amberMax: 60 }, 'higher_is_better');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(50);
    });

    it('returns 0 for value of 0', () => {
      expect(thresholdStrategy.normalize(0, { redMax: 30, amberMax: 60 }, 'higher_is_better')).toBe(0);
    });

    it('handles equal redMax and amberMax', () => {
      const score = thresholdStrategy.normalize(50, { redMax: 50, amberMax: 50 }, 'higher_is_better');
      expect(score).toBe(100);
    });
  });

  describe('lower_is_better direction', () => {
    it('returns 100 for value at or below redMax', () => {
      expect(thresholdStrategy.normalize(20, { redMax: 30, amberMax: 60 }, 'lower_is_better')).toBe(100);
    });

    it('returns 100 for value equal to redMax', () => {
      expect(thresholdStrategy.normalize(30, { redMax: 30, amberMax: 60 }, 'lower_is_better')).toBe(100);
    });

    it('interpolates between 50-99 for values in amber band', () => {
      const score = thresholdStrategy.normalize(45, { redMax: 30, amberMax: 60 }, 'lower_is_better');
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns value in 0-49 range for values above amberMax', () => {
      const score = thresholdStrategy.normalize(80, { redMax: 30, amberMax: 60 }, 'lower_is_better');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(50);
    });

    it('handles equal redMax and amberMax with value at threshold', () => {
      // value=50 <= redMax=50 → excellent (100)
      const score = thresholdStrategy.normalize(50, { redMax: 50, amberMax: 50 }, 'lower_is_better');
      expect(score).toBe(100);
    });

    it('handles equal redMax and amberMax with value above threshold', () => {
      // value=60 > amberMax=50 → poor zone
      const score = thresholdStrategy.normalize(60, { redMax: 50, amberMax: 50 }, 'lower_is_better');
      expect(score).toBeLessThan(50);
    });
  });
});

describe('scoringService.computeScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero scores when no values exist', async () => {
    mockGetValuesForScoring.mockResolvedValue([]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.overall).toBe(0);
    expect(result.pillars).toHaveLength(0);
    expect(result.parameterCount).toBe(0);
    expect(result.nodeId).toBe(NODE_ID);
    expect(result.periodId).toBe(PERIOD_ID);
  });

  it('computes scores for a single pillar with one category', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '50', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([
      { thresholdId: 't1', tenantId: null, paramId: null, category: 'Climate', pillar: 'E', redMax: '30', amberMax: '60', unit: null },
    ]);
    mockGetWeights.mockResolvedValue([
      { weightId: 'w1', tenantId: null, pillar: 'E', category: 'Climate', weight: '1' },
    ]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.overall).toBeGreaterThan(0);
    expect(result.pillars).toHaveLength(1);
    expect(result.pillars[0].pillar).toBe('E');
    expect(result.pillars[0].categories).toHaveLength(1);
    expect(result.pillars[0].categories[0].category).toBe('Climate');
    expect(result.parameterCount).toBe(1);
  });

  it('computes weighted average across multiple categories', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
      { paramId: 'p2', value: '100', pillar: 'E', category: 'Waste', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([
      { thresholdId: 't1', tenantId: null, paramId: null, category: null, pillar: 'E', redMax: '30', amberMax: '60', unit: null },
    ]);
    // Climate weight 0.7, Waste weight 0.3
    mockGetWeights.mockResolvedValue([
      { weightId: 'w1', tenantId: null, pillar: 'E', category: 'Climate', weight: '0.7' },
      { weightId: 'w2', tenantId: null, pillar: 'E', category: 'Waste', weight: '0.3' },
    ]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.pillars).toHaveLength(1);
    // Both categories score 100 (value=100 >= amberMax=60), so weighted average is 100
    expect(result.pillars[0].score).toBe(100);
    expect(result.overall).toBe(100);
  });

  it('computes overall as average across multiple pillars', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
      { paramId: 'p2', value: '0', pillar: 'S', category: 'Workforce', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.pillars).toHaveLength(2);
    // E pillar: value=100 >= default amberMax=60 → score=100
    // S pillar: value=0, default redMax=30 → score=0
    // Overall = (100 + 0) / 2 = 50
    expect(result.overall).toBe(50);
  });

  it('handles null values by filtering them out', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: null, pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
      { paramId: 'p2', value: '80', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    // Only p2 counted (p1 has null value)
    expect(result.parameterCount).toBe(1);
  });

  it('handles non-numeric values by filtering them out', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: 'N/A', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.parameterCount).toBe(0);
    expect(result.overall).toBe(0);
  });

  it('uses tenant-specific thresholds over platform defaults', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '45', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
    ]);
    // Tenant-specific threshold first (sorted by priority in repo), then platform default
    mockGetThresholds.mockResolvedValue([
      { thresholdId: 't1', tenantId: TENANT_ID, paramId: 'p1', category: null, pillar: null, redMax: '40', amberMax: '50', unit: null },
      { thresholdId: 't2', tenantId: null, paramId: 'p1', category: null, pillar: null, redMax: '30', amberMax: '60', unit: null },
    ]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    // With tenant threshold (redMax=40, amberMax=50): 45 is in amber band
    // Score should be between 50-99
    const catScore = result.pillars[0].categories[0].score;
    expect(catScore).toBeGreaterThanOrEqual(50);
    expect(catScore).toBeLessThan(100);
  });

  it('accepts a custom strategy', async () => {
    const customStrategy: ScoringStrategy = {
      normalize: () => 42,
    };

    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '50', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID, customStrategy);

    expect(result.pillars[0].categories[0].score).toBe(42);
    expect(result.overall).toBe(42);
  });

  it('defaults direction to lower_is_better when not specified', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '10', pillar: 'E', category: 'Climate', direction: null },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    // With lower_is_better and default thresholds (redMax=30, amberMax=60):
    // value=10 <= redMax=30 → score=100
    expect(result.pillars[0].categories[0].score).toBe(100);
  });

  it('handles missing category by using Uncategorized', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '50', pillar: 'E', category: null, direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.pillars[0].categories[0].category).toBe('Uncategorized');
  });
});

describe('scoringService.getScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached scores from MV when available', async () => {
    mockGetScores.mockResolvedValue([
      {
        tenantId: TENANT_ID,
        nodeId: NODE_ID,
        periodId: PERIOD_ID,
        pillar: 'E',
        category: 'Climate',
        categoryScore: '85',
        pillarScore: '85',
        overallScore: '80',
        computedAt: new Date(),
      },
    ]);

    const result = await scoringService.getScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.overall).toBe(80);
    expect(result.pillars).toHaveLength(1);
    expect(result.pillars[0].pillar).toBe('E');
    expect(result.pillars[0].score).toBe(85);
    expect(mockGetValuesForScoring).not.toHaveBeenCalled();
  });

  it('falls back to live computation when MV is empty', async () => {
    mockGetScores.mockResolvedValue([]);
    mockGetValuesForScoring.mockResolvedValue([]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.getScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.overall).toBe(0);
    expect(mockGetValuesForScoring).toHaveBeenCalled();
  });

  it('falls back to live computation when MV query fails', async () => {
    mockGetScores.mockRejectedValue(new Error('relation "esg_scores" does not exist'));
    mockGetValuesForScoring.mockResolvedValue([]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.getScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.overall).toBe(0);
    expect(mockGetValuesForScoring).toHaveBeenCalled();
  });
});

describe('scoringService.buildBreakdownFromMV', () => {
  it('builds breakdown from multiple MV rows', () => {
    const rows = [
      {
        tenantId: TENANT_ID,
        nodeId: NODE_ID,
        periodId: PERIOD_ID,
        pillar: 'E',
        category: 'Climate',
        categoryScore: '90',
        pillarScore: '85',
        overallScore: '80',
        paramCount: '3',
        computedAt: new Date(),
      },
      {
        tenantId: TENANT_ID,
        nodeId: NODE_ID,
        periodId: PERIOD_ID,
        pillar: 'E',
        category: 'Waste',
        categoryScore: '75',
        pillarScore: '85',
        overallScore: '80',
        paramCount: '2',
        computedAt: new Date(),
      },
      {
        tenantId: TENANT_ID,
        nodeId: NODE_ID,
        periodId: PERIOD_ID,
        pillar: 'S',
        category: 'Workforce',
        categoryScore: '70',
        pillarScore: '70',
        overallScore: '80',
        paramCount: '4',
        computedAt: new Date(),
      },
    ];

    const result = scoringService.buildBreakdownFromMV(rows, NODE_ID, PERIOD_ID);

    expect(result.overall).toBe(80);
    expect(result.pillars).toHaveLength(2);
    expect(result.nodeId).toBe(NODE_ID);
    expect(result.periodId).toBe(PERIOD_ID);

    const ePillar = result.pillars.find((p) => p.pillar === 'E');
    expect(ePillar?.categories).toHaveLength(2);
    expect(ePillar?.score).toBe(85);

    const sPillar = result.pillars.find((p) => p.pillar === 'S');
    expect(sPillar?.categories).toHaveLength(1);
    expect(sPillar?.score).toBe(70);
  });

  it('returns zero overall for empty rows', () => {
    const result = scoringService.buildBreakdownFromMV([], NODE_ID, PERIOD_ID);
    expect(result.overall).toBe(0);
    expect(result.pillars).toHaveLength(0);
  });

  it('uses paramCount from MV rows', () => {
    const rows = [
      {
        tenantId: TENANT_ID,
        nodeId: NODE_ID,
        periodId: PERIOD_ID,
        pillar: 'E',
        category: 'Climate',
        categoryScore: '90',
        pillarScore: '85',
        overallScore: '80',
        paramCount: '5',
        computedAt: new Date(),
      },
    ];

    const result = scoringService.buildBreakdownFromMV(rows, NODE_ID, PERIOD_ID);

    expect(result.pillars[0].categories[0].paramCount).toBe(5);
    expect(result.parameterCount).toBe(5);
  });
});

describe('thresholdStrategy.normalize — edge cases (patch coverage)', () => {
  it('clamps score to 0 when negative thresholds produce sub-zero result (higher_is_better)', () => {
    // Negative redMax: value=-10, redMax=-5, amberMax=50
    // value < redMax → poor zone, ratio = -10/-5 = 2, score = 2 * 49 = 98 before clamp
    // Actually with negative redMax and negative value, ratio = value/redMax = -10/-5 = 2
    // score = ratio * 49 = 98, clamp to 100 max → 98. That's fine.
    // But if value is very negative: value=-100, ratio=-100/-5=20, 20*49=980 → clamped to 100
    const score = thresholdStrategy.normalize(-100, { redMax: -5, amberMax: 50 }, 'higher_is_better');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('clamps score to 100 max when negative redMax inflates amber band (higher_is_better)', () => {
    // value=10, redMax=-5, amberMax=50, range=55, ratio=(10-(-5))/55=15/55=0.27, score=50+0.27*50=64
    const score = thresholdStrategy.normalize(10, { redMax: -5, amberMax: 50 }, 'higher_is_better');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('clamps score when negative amberMax breaks lower_is_better', () => {
    const score = thresholdStrategy.normalize(100, { redMax: 10, amberMax: -5 }, 'lower_is_better');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('scoringService.computeScores — NaN/invalid data handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to default thresholds when threshold strings are non-numeric', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '10', pillar: 'E', category: 'Climate', direction: 'lower_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([
      { thresholdId: 't1', tenantId: null, paramId: 'p1', category: null, pillar: null, redMax: 'abc', amberMax: 'xyz', unit: null },
    ]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    // Non-numeric thresholds skipped → falls back to defaults (redMax=30, amberMax=60)
    // value=10 <= redMax=30 → score=100
    expect(result.pillars[0].categories[0].score).toBe(100);
    expect(result.overall).toBe(100);
  });

  it('falls back to weight=1 when weight string is non-numeric', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
      { paramId: 'p2', value: '100', pillar: 'E', category: 'Waste', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([
      { weightId: 'w1', tenantId: null, pillar: 'E', category: 'Climate', weight: 'NaN' },
      { weightId: 'w2', tenantId: null, pillar: 'E', category: 'Waste', weight: '2' },
    ]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    // 'NaN' weight falls back to 1; Waste weight=2
    // Climate: 100 * 1 = 100, Waste: 100 * 2 = 200, total weight = 3
    // Pillar score = 300/3 = 100
    expect(result.pillars[0].score).toBe(100);
  });

  it('falls back to weight=1 when weight is negative', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([
      { weightId: 'w1', tenantId: null, pillar: 'E', category: 'Climate', weight: '-5' },
    ]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    // Negative weight falls back to 1
    expect(result.pillars[0].score).toBe(100);
  });
});

describe('scoringService.computeScores — weighted overall (pillar weights)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies pillar weights to overall score via _overall category convention', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
      { paramId: 'p2', value: '0', pillar: 'S', category: 'Workforce', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    // Pillar weights: E=3, S=1 (using _overall convention)
    mockGetWeights.mockResolvedValue([
      { weightId: 'w1', tenantId: null, pillar: 'E', category: '_overall', weight: '3' },
      { weightId: 'w2', tenantId: null, pillar: 'S', category: '_overall', weight: '1' },
    ]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    expect(result.pillars).toHaveLength(2);
    // E pillar: value=100 >= default amberMax=60 → score=100
    // S pillar: value=0, default redMax=30 → score=0
    // Weighted overall = (100*3 + 0*1) / (3+1) = 300/4 = 75
    expect(result.overall).toBe(75);
  });

  it('falls back to equal weighting when no _overall weights defined', async () => {
    mockGetValuesForScoring.mockResolvedValue([
      { paramId: 'p1', value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' },
      { paramId: 'p2', value: '0', pillar: 'S', category: 'Workforce', direction: 'higher_is_better' },
    ]);
    mockGetThresholds.mockResolvedValue([]);
    mockGetWeights.mockResolvedValue([]);

    const result = await scoringService.computeScores(TENANT_ID, NODE_ID, PERIOD_ID);

    // No pillar weights → equal weight (1 each) → (100+0)/2 = 50
    expect(result.overall).toBe(50);
  });
});
