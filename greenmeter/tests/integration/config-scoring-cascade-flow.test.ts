import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TENANT_A,
  NODE_ROOT,
  PERIOD_FY24,
  PARAM_GHG,
  PARAM_WATER,
  PARAM_WASTE,
  makeKpiValueForScoring,
  makeThreshold,
  makeWeight,
} from './helpers/test-fixtures';

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockGetValuesForScoring = vi.fn();
const mockGetThresholds = vi.fn();
const mockGetWeights = vi.fn();
const mockGetScores = vi.fn();

vi.mock('@/db/repositories/scoringRepository', () => ({
  scoringRepository: {
    getValuesForScoring: (...args: unknown[]) => mockGetValuesForScoring(...args),
    getThresholds: (...args: unknown[]) => mockGetThresholds(...args),
    getWeights: (...args: unknown[]) => mockGetWeights(...args),
    getScores: (...args: unknown[]) => mockGetScores(...args),
    refreshScores: vi.fn(),
  },
}));

// Import AFTER mocks
import { scoringService, thresholdStrategy } from '@/services/scoringService';

// ─── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Integration: Config Change → Scoring Impact', () => {
  // ── Threshold Change Impact ────────────────────────────────

  describe('Threshold change impact', () => {
    it('same KPI value produces different scores with different thresholds', async () => {
      const values = [
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '50', direction: 'higher_is_better' }),
      ];

      // Scenario 1: relaxed thresholds (redMax=20, amberMax=60)
      mockGetValuesForScoring.mockResolvedValue(values);
      mockGetThresholds.mockResolvedValue([
        makeThreshold({ paramId: PARAM_GHG, redMax: '20', amberMax: '60' }),
      ]);
      mockGetWeights.mockResolvedValue([]);

      const result1 = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);
      const score1 = result1.pillars[0].categories[0].score;

      // Scenario 2: strict thresholds (redMax=40, amberMax=80)
      mockGetValuesForScoring.mockResolvedValue(values);
      mockGetThresholds.mockResolvedValue([
        makeThreshold({ paramId: PARAM_GHG, redMax: '40', amberMax: '80' }),
      ]);
      mockGetWeights.mockResolvedValue([]);

      const result2 = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);
      const score2 = result2.pillars[0].categories[0].score;

      // Relaxed: value=50, redMax=20, amberMax=60, ratio=(50-20)/40=0.75, score=50+0.75*50=88
      // Strict: value=50, redMax=40, amberMax=80, ratio=(50-40)/40=0.25, score=50+0.25*50=63
      expect(score1).toBe(88);
      expect(score2).toBe(63);
      expect(score1).toBeGreaterThan(score2);
    });

    it('value that was excellent becomes amber when thresholds tighten', () => {
      // With relaxed thresholds: value=40 >= amberMax=30 → excellent (100)
      const score1 = thresholdStrategy.normalize(40, { redMax: 10, amberMax: 30 }, 'higher_is_better');
      expect(score1).toBe(100);

      // With strict thresholds: value=40, redMax=30, amberMax=60 → amber band
      const score2 = thresholdStrategy.normalize(40, { redMax: 30, amberMax: 60 }, 'higher_is_better');
      expect(score2).toBeGreaterThanOrEqual(50);
      expect(score2).toBeLessThan(100);
    });
  });

  // ── Weight Change Impact ───────────────────────────────────

  describe('Weight change impact', () => {
    it('changing Climate weight from 0.5 to 0.8 shifts pillar score', async () => {
      // Two categories in E pillar with different normalized scores
      const values = [
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' }),
        makeKpiValueForScoring({ paramId: PARAM_WASTE, value: '0', pillar: 'E', category: 'Waste', direction: 'higher_is_better' }),
      ];
      // Default thresholds: value=100 → score=100, value=0 → score=0

      // Scenario 1: Climate=0.5, Waste=0.5
      mockGetValuesForScoring.mockResolvedValue(values);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([
        makeWeight({ pillar: 'E', category: 'Climate', weight: '0.5' }),
        makeWeight({ pillar: 'E', category: 'Waste', weight: '0.5' }),
      ]);

      const result1 = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);
      // Climate=100, Waste=0, weights 0.5/0.5 → (100*0.5 + 0*0.5)/1 = 50
      expect(result1.pillars[0].score).toBe(50);

      // Scenario 2: Climate=0.8, Waste=0.2
      mockGetValuesForScoring.mockResolvedValue(values);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([
        makeWeight({ pillar: 'E', category: 'Climate', weight: '0.8' }),
        makeWeight({ pillar: 'E', category: 'Waste', weight: '0.2' }),
      ]);

      const result2 = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);
      // Climate=100, Waste=0, weights 0.8/0.2 → (100*0.8 + 0*0.2)/1 = 80
      expect(result2.pillars[0].score).toBe(80);

      expect(result2.pillars[0].score).toBeGreaterThan(result1.pillars[0].score);
    });
  });

  // ── Threshold Merge (Tenant Override) ──────────────────────

  describe('Threshold merge: tenant override beats platform default', () => {
    it('uses tenant-specific threshold when both exist for same paramId', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '45', direction: 'higher_is_better' }),
      ]);
      // Tenant threshold appears first (repo sorts by priority: tenant > platform)
      mockGetThresholds.mockResolvedValue([
        makeThreshold({ tenantId: TENANT_A, paramId: PARAM_GHG, redMax: '40', amberMax: '50' }),
        makeThreshold({ tenantId: null, paramId: PARAM_GHG, redMax: '20', amberMax: '80' }),
      ]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // Tenant threshold: redMax=40, amberMax=50
      // value=45, ratio=(45-40)/(50-40)=0.5, score=50+0.5*50=75
      expect(result.pillars[0].categories[0].score).toBe(75);
    });
  });

  // ── Equal Weight Fallback ──────────────────────────────────

  describe('Equal weight fallback', () => {
    it('uses equal weight (1) for all categories when no weights defined', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' }),
        makeKpiValueForScoring({ paramId: PARAM_WATER, value: '100', pillar: 'E', category: 'Water', direction: 'higher_is_better' }),
        makeKpiValueForScoring({ paramId: PARAM_WASTE, value: '100', pillar: 'E', category: 'Waste', direction: 'higher_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]); // No weights → equal fallback

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // All score 100, equal weight → pillar=100
      expect(result.pillars[0].score).toBe(100);
      expect(result.pillars[0].categories).toHaveLength(3);
    });
  });

  // ── Default Thresholds ─────────────────────────────────────

  describe('Default thresholds: redMax=30, amberMax=60', () => {
    it('applies defaults when no thresholds configured at any level', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ value: '45', direction: 'higher_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // Default: redMax=30, amberMax=60, higher_is_better, value=45
      // ratio = (45-30)/(60-30) = 0.5, score = 50 + 0.5*50 = 75
      expect(result.pillars[0].categories[0].score).toBe(75);
    });

    it('default lower_is_better: value=20 → 100 (below redMax=30)', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        makeKpiValueForScoring({ value: '20', direction: 'lower_is_better' }),
      ]);
      mockGetThresholds.mockResolvedValue([]);
      mockGetWeights.mockResolvedValue([]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(result.pillars[0].categories[0].score).toBe(100);
    });
  });

  // ── Multi-pillar with mixed configs ────────────────────────

  describe('Multi-pillar with mixed config', () => {
    it('computes correct overall with per-pillar thresholds and weights', async () => {
      mockGetValuesForScoring.mockResolvedValue([
        // E pillar: value=100 (higher_is_better)
        makeKpiValueForScoring({ paramId: PARAM_GHG, value: '100', pillar: 'E', category: 'Climate', direction: 'higher_is_better' }),
        // S pillar: value=50 (higher_is_better)
        makeKpiValueForScoring({ paramId: PARAM_WATER, value: '50', pillar: 'S', category: 'Workforce', direction: 'higher_is_better' }),
      ]);
      // E pillar gets custom threshold, S gets defaults (30/60)
      mockGetThresholds.mockResolvedValue([
        makeThreshold({ pillar: 'E', redMax: '0', amberMax: '100' }),
      ]);
      // Pillar weights: E=2, S=1
      mockGetWeights.mockResolvedValue([
        makeWeight({ pillar: 'E', category: '_overall', weight: '2' }),
        makeWeight({ pillar: 'S', category: '_overall', weight: '1' }),
      ]);

      const result = await scoringService.computeScores(TENANT_A, NODE_ROOT, PERIOD_FY24);

      // E: value=100, thresh 0/100 → 100 (>= amberMax)
      // S: value=50, default thresh 30/60 → ratio=(50-30)/30=0.667, score=50+0.667*50=83
      const ePillar = result.pillars.find(p => p.pillar === 'E')!;
      const sPillar = result.pillars.find(p => p.pillar === 'S')!;
      expect(ePillar.score).toBe(100);
      expect(sPillar.score).toBe(83);

      // Overall: (100*2 + 83*1)/(2+1) = 283/3 = 94
      expect(result.overall).toBe(94);
    });
  });
});
