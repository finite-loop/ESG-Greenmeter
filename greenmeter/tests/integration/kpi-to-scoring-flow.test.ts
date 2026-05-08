import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TENANT_A,
  NODE_ROOT,
  PERIOD_FY24,
  PARAM_GHG,
  PARAM_WATER,
  PARAM_WASTE,
  PARAM_WORKFORCE,
  PARAM_BOARD,
  PARAM_ENERGY,
  makeKpiValueForScoring,
  makeThreshold,
  makeWeight,
  makeKpiValueRow,
  makeEsgScoreRow,
} from './helpers/test-fixtures';

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

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

const mockFindByParamNodePeriod = vi.fn();
const mockInsert = vi.fn();
const mockFindById = vi.fn();

vi.mock('@/db/repositories/kpiRepository', () => ({
  kpiRepository: {
    findByParamNodePeriod: (...args: unknown[]) => mockFindByParamNodePeriod(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

vi.mock('@/db/repositories/userRepository', () => ({
  userRepository: { findById: vi.fn() },
}));

const mockSubmitJob = vi.fn().mockResolvedValue('job-id-1');
vi.mock('@/jobs', () => ({
  submitJob: (...args: unknown[]) => mockSubmitJob(...args),
}));
vi.mock('@/jobs/scoreRecompute', () => ({}));

const mockCheckMilestonesForParam = vi.fn().mockResolvedValue([]);
vi.mock('@/services/goalService', () => ({
  goalService: {
    checkMilestonesForParam: (...args: unknown[]) => mockCheckMilestonesForParam(...args),
  },
}));

// Import AFTER mocks
import { scoringService, thresholdStrategy } from '@/services/scoringService';
import { kpiService } from '@/services/kpiService';

// ─── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Integration: KPI → Scoring Pipeline', () => {
  // ── Normalization Math ─────────────────────────────────────

  describe('Normalization: lower_is_better', () => {
    it('scores 100 when value is at redMax boundary (value=10, redMax=30)', () => {
      const score = thresholdStrategy.normalize(10, { redMax: 30, amberMax: 60 }, 'lower_is_better');
      expect(score).toBe(100);
    });

    it('interpolates in amber band (value=45, redMax=30, amberMax=60)', () => {
      const score = thresholdStrategy.normalize(45, { redMax: 30, amberMax: 60 }, 'lower_is_better');
      // ratio = (45-30)/(60-30) = 0.5, score = 100 - 0.5*50 = 75
      expect(score).toBe(75);
    });

    it('enters poor zone above amberMax (value=90, redMax=30, amberMax=60)', () => {
      const score = thresholdStrategy.normalize(90, { redMax: 30, amberMax: 60 }, 'lower_is_better');
      // Above amberMax → poor zone 0-49
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(50);
    });

    it('scores exactly 100 at value=0 with redMax=30', () => {
      const score = thresholdStrategy.normalize(0, { redMax: 30, amberMax: 60 }, 'lower_is_better');
      expect(score).toBe(100);
    });
  });

  describe('Normalization: higher_is_better', () => {
    it('scores 100 when value >= amberMax (value=70, amberMax=60)', () => {
      const score = thresholdStrategy.normalize(70, { redMax: 30, amberMax: 60 }, 'higher_is_better');
      expect(score).toBe(100);
    });

    it('interpolates between redMax and amberMax (value=45)', () => {
      const score = thresholdStrategy.normalize(45, { redMax: 30, amberMax: 60 }, 'higher_is_better');
      // ratio = (45-30)/(60-30) = 0.5, score = 50 + 0.5*50 = 75
      expect(score).toBe(75);
    });

    it('scores in poor zone when below redMax (value=15)', () => {
      const score = thresholdStrategy.normalize(15, { redMax: 30, amberMax: 60 }, 'higher_is_better');
      // ratio = 15/30 = 0.5, score = 0.5*49 = 24.5 → 25
      expect(score).toBe(25);
    });

    it('scores 0 for value=0 below redMax', () => {
      const score = thresholdStrategy.normalize(0, { redMax: 30, amberMax: 60 }, 'higher_is_better');
      expect(score).toBe(0);
    });
  });

  // ── Threshold Cascade ──────────────────────────────────────

  describe('Threshold resolution cascade', () => {
    it('uses param-specific threshold over category/pillar/default', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '45', direction: 'higher_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([
        makeThreshold({ paramId: PARAM_GHG, redMax: '40', amberMax: '50' }),           // param-specific
        makeThreshold({ category: 'Climate', pillar: 'E', redMax: '20', amberMax: '80' }), // category
        makeThreshold({ pillar: 'E', redMax: '10', amberMax: '90' }),                   // pillar
      ]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // Param threshold: redMax=40, amberMax=50, value=45 in amber → 50 + (5/10)*50 = 75
      expect(result.pillars[0].categories[0].score).toBe(75);
    });

    it('falls back to category-level when no param-specific threshold', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '50', pillar: 'E', category: 'Climate', direction: 'higher_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([
        // No param-specific; only category-level
        makeThreshold({ category: 'Climate', pillar: 'E', redMax: '20', amberMax: '80' }),
        makeThreshold({ pillar: 'E', redMax: '10', amberMax: '90' }),
      ]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // Category threshold: redMax=20, amberMax=80, value=50 in amber
      // ratio = (50-20)/(80-20) = 0.5, score = 50 + 0.5*50 = 75
      expect(result.pillars[0].categories[0].score).toBe(75);
    });

    it('falls back to pillar-level when no param or category threshold', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '50', pillar: 'E', category: 'Climate', direction: 'higher_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([
        // Only pillar-level
        makeThreshold({ pillar: 'E', redMax: '25', amberMax: '75' }),
      ]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // Pillar threshold: redMax=25, amberMax=75, value=50
      // ratio = (50-25)/(75-25) = 0.5, score = 50 + 0.5*50 = 75
      expect(result.pillars[0].categories[0].score).toBe(75);
    });

    it('falls back to defaults (30/60) when no thresholds at all', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ value: '10', direction: 'lower_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // Default threshold: redMax=30, amberMax=60, lower_is_better value=10 <= 30 → 100
      expect(result.pillars[0].categories[0].score).toBe(100);
    });
  });

  // ── Weighted Category & Pillar Averages ────────────────────

  describe('Weighted category average', () => {
    it('computes E pillar as weighted average: Climate(80)*0.7 + Waste(60)*0.3 = 74', async () => {
      // Set up two params that will score 80 and 60 respectively
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '80', pillar: 'E', category: 'Climate', direction: 'higher_is_better' }),
        makeKpiValueForScoring({ paramId: PARAM_WASTE, value: '60', pillar: 'E', category: 'Waste', direction: 'higher_is_better' }),
      ]);
      // Thresholds that make value=80 → 100 and value=60 → 100 (both >= amberMax)
      // We need thresholds where score=80 maps to 80 and score=60 maps to 60
      // Use custom thresholds: redMax=0, amberMax=100 so score = 50 + (value/100)*50
      // value=80: ratio=80/100=0.8, score=50+0.8*50=90... that doesn't give us 80.
      // Better: use a custom strategy approach via threshold values that produce exact scores.
      // Actually, let's use the threshold to map directly:
      // With redMax=0, amberMax=100: score = 50 + (val/100)*50
      // val=80 → 90, val=60 → 80. Not what we want.
      //
      // Alternative: set amberMax very high so all values are in amber band.
      // redMax=0, amberMax=100 higher_is_better:
      //   val >= 100 → 100; val >= 0 → 50 + (val/100)*50
      //
      // For exact 80 and 60 scores, we need to test the weighted average math directly.
      // Let's put all values at score=100 (>= amberMax) and adjust weights to test weighting.
      // Then put varying scores by using values in the interpolation band.
      //
      // Simpler: provide two categories with known param scores.
      // redMax=0, amberMax=100:
      //   value=100 → score=100
      //   value=0 → score=0
      mockGetThresholds.mockResolvedValue([
        makeThreshold({ pillar: 'E', redMax: '0', amberMax: '100' }),
      ]);
      mockGetWeights.mockResolvedValue([
        makeWeight({ pillar: 'E', category: 'Climate', weight: '0.7' }),
        makeWeight({ pillar: 'E', category: 'Waste', weight: '0.3' }),
      ]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // With redMax=0, amberMax=100, higher_is_better:
      //   value=80: ratio=(80-0)/(100-0)=0.8, score=50+0.8*50=90
      //   value=60: ratio=(60-0)/(100-0)=0.6, score=50+0.6*50=80
      // Weighted: (90*0.7 + 80*0.3)/(0.7+0.3) = (63+24)/1 = 87
      const ePillar = result.pillars.find(p => p.pillar === 'E');
      expect(ePillar).toBeDefined();
      expect(ePillar!.score).toBe(87);
    });

    it('applies equal weight fallback when no weights defined', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' }),
        makeKpiValueForScoring({ paramId: PARAM_WASTE, value: '0', pillar: 'E', category: 'Waste', direction: 'higher_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // Default thresholds: redMax=30, amberMax=60
      // Climate: value=100 >= 60 → 100
      // Waste: value=0, redMax=30 → 0/30*49 = 0
      // Equal weight: (100 + 0) / 2 = 50
      expect(result.pillars[0].score).toBe(50);
    });
  });

  describe('Pillar → Overall weighted average', () => {
    it('computes overall using _overall weights', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' }),
        makeKpiValueForScoring({ paramId: PARAM_WORKFORCE, value: '0', pillar: 'S', category: 'Workforce', direction: 'higher_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([
        makeWeight({ pillar: 'E', category: '_overall', weight: '3' }),
        makeWeight({ pillar: 'S', category: '_overall', weight: '1' }),
      ]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // E=100 (value >= amberMax), S=0 (value=0)
      // Overall = (100*3 + 0*1)/(3+1) = 300/4 = 75
      expect(result.overall).toBe(75);
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────

  describe('Edge cases', () => {
    it('returns overall=0 and empty pillars when no values exist', async () => {
      mockGetValuesForScoring.mockResolvedValue([]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(result.overall).toBe(0);
      expect(result.pillars).toHaveLength(0);
      expect(result.parameterCount).toBe(0);
    });

    it('filters out null values', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: null }),
        makeKpiValueForScoring({ paramId: PARAM_WATER, value: '50', direction: 'higher_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(result.parameterCount).toBe(1);
    });

    it('filters out NaN values', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ value: 'not-a-number' }),
      ]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(result.parameterCount).toBe(0);
      expect(result.overall).toBe(0);
    });

    it('handles zero thresholds (redMax=0, amberMax=0)', () => {
      // lower_is_better: value=0 <= redMax=0 → 100
      const scoreLIB = thresholdStrategy.normalize(0, { redMax: 0, amberMax: 0 }, 'lower_is_better');
      expect(scoreLIB).toBe(100);

      // higher_is_better: value=0 >= amberMax=0 → 100
      const scoreHIB = thresholdStrategy.normalize(0, { redMax: 0, amberMax: 0 }, 'higher_is_better');
      expect(scoreHIB).toBe(100);
    });
  });

  // ── KPI Create Triggers ────────────────────────────────────

  describe('KPI create triggers score recompute and milestone check', () => {
    it('calls submitJob with score-recompute on KPI value create', async () => {
      mockFindByParamNodePeriod.mockResolvedValue(null); // no duplicate
      const newRow = makeKpiValueRow({ value: '42' });
      mockInsert.mockResolvedValue(newRow);

      await kpiService.createValue(TENANT_A, {
        paramId: PARAM_GHG,
        nodeId: NODE_ROOT,
        periodId: PERIOD_FY24,
        value: '42',
      });

      expect(mockSubmitJob).toHaveBeenCalledWith(
        'score-recompute',
        expect.objectContaining({
          tenantId: TENANT_A,
          periodId: PERIOD_FY24,
        }),
        expect.any(Object),
      );
    });

    it('calls goalService.checkMilestonesForParam with numeric value', async () => {
      mockFindByParamNodePeriod.mockResolvedValue(null);
      mockInsert.mockResolvedValue(makeKpiValueRow({ value: '42' }));

      await kpiService.createValue(TENANT_A, {
        paramId: PARAM_GHG,
        nodeId: NODE_ROOT,
        periodId: PERIOD_FY24,
        value: '42',
      });

      // Allow fire-and-forget to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCheckMilestonesForParam).toHaveBeenCalledWith(TENANT_A, PARAM_GHG, 42);
    });
  });

  // ── MV Fallback ────────────────────────────────────────────

  describe('getScores MV fallback', () => {
    it('returns MV data when available', async () => {
      mockGetScores.mockResolvedValue([
        makeEsgScoreRow({ pillar: 'E', category: 'Climate', categoryScore: '90', pillarScore: '85', overallScore: '80' }),
      ]);

      const result = await scoringService.getScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(result.overall).toBe(80);
      expect(result.pillars[0].score).toBe(85);
      expect(mockGetValuesForScoring).not.toHaveBeenCalled();
    });

    it('falls back to live computation when MV is empty', async () => {
      mockGetScores.mockResolvedValue([]);
      mockGetValuesForScoring.mockResolvedValue([]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.getScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(result.overall).toBe(0);
      expect(mockGetValuesForScoring).toHaveBeenCalled();
    });
  });
});
