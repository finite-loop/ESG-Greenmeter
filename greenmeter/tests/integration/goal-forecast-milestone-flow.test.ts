import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TENANT_A,
  GOAL_1,
  PARAM_GHG,
  MILESTONE_1,
  MILESTONE_2,
  makeGoalRow,
  makeMilestoneRow,
} from './helpers/test-fixtures';

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockGoalFindById = vi.fn();
const mockFindPendingMilestonesByGoalParam = vi.fn();
const mockMarkMilestoneAchieved = vi.fn();
const mockGetMilestones = vi.fn();
const mockGetComponents = vi.fn();
const mockMarkMilestonesMissed = vi.fn();

vi.mock('@/db/repositories/goalRepository', () => ({
  goalRepository: {
    findById: (...args: unknown[]) => mockGoalFindById(...args),
    findPendingMilestonesByGoalParam: (...args: unknown[]) => mockFindPendingMilestonesByGoalParam(...args),
    markMilestoneAchieved: (...args: unknown[]) => mockMarkMilestoneAchieved(...args),
    getMilestones: (...args: unknown[]) => mockGetMilestones(...args),
    getComponents: (...args: unknown[]) => mockGetComponents(...args),
    markMilestonesMissed: (...args: unknown[]) => mockMarkMilestonesMissed(...args),
  },
}));

// Mock the db module used directly in forecastService for historical queries
const mockDbExecute = vi.fn();
const mockDbSelect = vi.fn();

vi.mock('@/db', () => {
  // Build a chainable query builder mock
  const createChainable = (mockSelect: ReturnType<typeof vi.fn>) => {
    const chain: Record<string, unknown> = {};
    const methods = ['from', 'innerJoin', 'where', 'groupBy', 'orderBy', 'select'];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    // Terminal: returns the mock data
    chain.orderBy = vi.fn().mockImplementation(() => mockSelect());
    chain.select = vi.fn().mockReturnValue(chain);
    chain.from = vi.fn().mockReturnValue(chain);
    chain.innerJoin = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.groupBy = vi.fn().mockReturnValue(chain);
    return chain;
  };

  return {
    db: {
      select: vi.fn().mockImplementation(() => {
        const chain = createChainable(mockDbSelect);
        return chain;
      }),
      execute: (...args: unknown[]) => mockDbExecute(...args),
    },
  };
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  isNotNull: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('@/db/schema/kpi', () => ({
  kpiValues: { periodId: 'periodId', paramId: 'paramId', tenantId: 'tenantId', value: 'value', notApplicable: 'notApplicable' },
  kpiParameters: {},
}));

vi.mock('@/db/schema/tenants', () => ({
  reportingPeriods: { periodId: 'periodId', name: 'name', endDate: 'endDate' },
}));

// Import AFTER mocks
import { forecastService } from '@/services/forecastService';
import { goalService } from '@/services/goalService';

// ─── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Integration: Goal → Forecast → Milestone Pipeline', () => {
  // ── Linear Regression ──────────────────────────────────────

  describe('Linear regression and scenarios', () => {
    it('computes correct slope and intercept for [100, 90, 80]', async () => {
      mockGoalFindById.mockResolvedValue(
        makeGoalRow({ targetValue: '50', targetYear: '2030', direction: 'lower_is_better' })
      );

      // Historical data: 3 periods with declining values
      mockDbSelect.mockReturnValue([
        { periodId: 'p1', periodName: 'FY22', endDate: new Date('2022-03-31'), value: '100' },
        { periodId: 'p2', periodName: 'FY23', endDate: new Date('2023-03-31'), value: '90' },
        { periodId: 'p3', periodName: 'FY24', endDate: new Date('2024-03-31'), value: '80' },
      ]);

      const result = await forecastService.getForecast(GOAL_1, TENANT_A);

      expect(result.insufficientData).toBe(false);
      expect(result.scenarios).toHaveLength(3);

      // BAU scenario: multiplier 1.0x, slope ≈ -10
      const bau = result.scenarios.find(s => s.name === 'BAU')!;
      expect(bau.slope).toBeCloseTo(-10, 0);
      expect(bau.intercept).toBeCloseTo(100, 0);

      // Moderate scenario: multiplier 1.5x, slope ≈ -15
      const moderate = result.scenarios.find(s => s.name === 'Moderate')!;
      expect(moderate.slope).toBeCloseTo(-15, 0);

      // Aggressive scenario: multiplier 2.0x, slope ≈ -20
      const aggressive = result.scenarios.find(s => s.name === 'Aggressive')!;
      expect(aggressive.slope).toBeCloseTo(-20, 0);
    });

    it('returns higher probability for BAU when lower_is_better and projected < target', async () => {
      mockGoalFindById.mockResolvedValue(
        makeGoalRow({ targetValue: '50', targetYear: '2028', direction: 'lower_is_better' })
      );

      mockDbSelect.mockReturnValue([
        { periodId: 'p1', periodName: 'FY22', endDate: new Date('2022-03-31'), value: '100' },
        { periodId: 'p2', periodName: 'FY23', endDate: new Date('2023-03-31'), value: '80' },
        { periodId: 'p3', periodName: 'FY24', endDate: new Date('2024-03-31'), value: '60' },
      ]);

      const result = await forecastService.getForecast(GOAL_1, TENANT_A);

      // Steep decline (-20/period), target=50, BAU should project well below target
      // Probability should be > 0.5 for all scenarios
      const bau = result.scenarios.find(s => s.name === 'BAU')!;
      expect(bau.probability).toBeGreaterThan(0.5);

      // Aggressive scenario should have even higher probability
      const aggressive = result.scenarios.find(s => s.name === 'Aggressive')!;
      expect(aggressive.probability).toBeGreaterThanOrEqual(bau.probability);
    });

    it('handles higher_is_better direction for probability', async () => {
      mockGoalFindById.mockResolvedValue(
        makeGoalRow({ targetValue: '200', targetYear: '2028', direction: 'higher_is_better' })
      );

      // Values increasing: 100, 120, 140
      mockDbSelect.mockReturnValue([
        { periodId: 'p1', periodName: 'FY22', endDate: new Date('2022-03-31'), value: '100' },
        { periodId: 'p2', periodName: 'FY23', endDate: new Date('2023-03-31'), value: '120' },
        { periodId: 'p3', periodName: 'FY24', endDate: new Date('2024-03-31'), value: '140' },
      ]);

      const result = await forecastService.getForecast(GOAL_1, TENANT_A);

      // Slope = +20/period, increasing toward target=200
      expect(result.scenarios).toHaveLength(3);
      const aggressive = result.scenarios.find(s => s.name === 'Aggressive')!;
      // Aggressive has steeper slope → higher probability of reaching 200
      expect(aggressive.probability).toBeGreaterThan(0);
    });
  });

  // ── Insufficient Data ──────────────────────────────────────

  describe('Insufficient data handling', () => {
    it('returns insufficientData=true with < 3 data points', async () => {
      mockGoalFindById.mockResolvedValue(
        makeGoalRow({ targetValue: '50', targetYear: '2030' })
      );

      // Only 2 data points
      mockDbSelect.mockReturnValue([
        { periodId: 'p1', periodName: 'FY23', endDate: new Date('2023-03-31'), value: '100' },
        { periodId: 'p2', periodName: 'FY24', endDate: new Date('2024-03-31'), value: '90' },
      ]);

      const result = await forecastService.getForecast(GOAL_1, TENANT_A);

      expect(result.insufficientData).toBe(true);
      expect(result.scenarios).toHaveLength(0);
    });

    it('returns insufficientData=true with 0 data points', async () => {
      mockGoalFindById.mockResolvedValue(
        makeGoalRow({ targetValue: '50', targetYear: '2030' })
      );

      mockDbSelect.mockReturnValue([]);

      const result = await forecastService.getForecast(GOAL_1, TENANT_A);

      expect(result.insufficientData).toBe(true);
      expect(result.scenarios).toHaveLength(0);
      expect(result.historicalData).toHaveLength(0);
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles flat slope (constant values)', async () => {
      mockGoalFindById.mockResolvedValue(
        makeGoalRow({ targetValue: '50', targetYear: '2030', direction: 'lower_is_better' })
      );

      // All values identical → slope=0
      mockDbSelect.mockReturnValue([
        { periodId: 'p1', periodName: 'FY22', endDate: new Date('2022-03-31'), value: '80' },
        { periodId: 'p2', periodName: 'FY23', endDate: new Date('2023-03-31'), value: '80' },
        { periodId: 'p3', periodName: 'FY24', endDate: new Date('2024-03-31'), value: '80' },
      ]);

      const result = await forecastService.getForecast(GOAL_1, TENANT_A);

      // Flat slope: all scenarios project same value (80)
      expect(result.insufficientData).toBe(false);
      for (const scenario of result.scenarios) {
        expect(scenario.slope).toBe(0);
        // Intercept should be around 80
        expect(scenario.intercept).toBeCloseTo(80, 0);
      }
    });

    it('caps projection at MAX_PROJECTION_PERIODS (50)', async () => {
      mockGoalFindById.mockResolvedValue(
        makeGoalRow({ targetValue: '0', targetYear: '2200', direction: 'lower_is_better' }) // far future
      );

      mockDbSelect.mockReturnValue([
        { periodId: 'p1', periodName: 'FY22', endDate: new Date('2022-03-31'), value: '100' },
        { periodId: 'p2', periodName: 'FY23', endDate: new Date('2023-03-31'), value: '90' },
        { periodId: 'p3', periodName: 'FY24', endDate: new Date('2024-03-31'), value: '80' },
      ]);

      const result = await forecastService.getForecast(GOAL_1, TENANT_A);

      // Each scenario should have at most 50 projected values
      for (const scenario of result.scenarios) {
        expect(scenario.projectedValues.length).toBeLessThanOrEqual(50);
      }
    });
  });

  // ── Milestone Auto-Achievement ─────────────────────────────

  describe('Milestone auto-achievement', () => {
    it('marks milestone achieved when lower_is_better target met (target=50, current=45)', async () => {
      mockFindPendingMilestonesByGoalParam.mockResolvedValue([
        makeMilestoneRow({
          milestoneId: MILESTONE_1,
          targetValue: '50',
          goalDirection: 'lower_is_better',
        }),
      ]);
      mockMarkMilestoneAchieved.mockResolvedValue(
        makeMilestoneRow({ milestoneId: MILESTONE_1, status: 'achieved' })
      );

      const achieved = await goalService.checkMilestonesForParam(TENANT_A, PARAM_GHG, 45);

      expect(achieved).toHaveLength(1);
      expect(mockMarkMilestoneAchieved).toHaveBeenCalledWith(MILESTONE_1, TENANT_A);
    });

    it('does not mark milestone achieved when lower_is_better target not met (target=50, current=55)', async () => {
      mockFindPendingMilestonesByGoalParam.mockResolvedValue([
        makeMilestoneRow({
          milestoneId: MILESTONE_1,
          targetValue: '50',
          goalDirection: 'lower_is_better',
        }),
      ]);

      const achieved = await goalService.checkMilestonesForParam(TENANT_A, PARAM_GHG, 55);

      expect(achieved).toHaveLength(0);
      expect(mockMarkMilestoneAchieved).not.toHaveBeenCalled();
    });

    it('marks milestone achieved when higher_is_better target met (target=50, current=55)', async () => {
      mockFindPendingMilestonesByGoalParam.mockResolvedValue([
        makeMilestoneRow({
          milestoneId: MILESTONE_1,
          targetValue: '50',
          goalDirection: 'higher_is_better',
        }),
      ]);
      mockMarkMilestoneAchieved.mockResolvedValue(
        makeMilestoneRow({ milestoneId: MILESTONE_1, status: 'achieved' })
      );

      const achieved = await goalService.checkMilestonesForParam(TENANT_A, PARAM_GHG, 55);

      expect(achieved).toHaveLength(1);
    });

    it('does not mark milestone when higher_is_better target not met (target=50, current=45)', async () => {
      mockFindPendingMilestonesByGoalParam.mockResolvedValue([
        makeMilestoneRow({
          milestoneId: MILESTONE_1,
          targetValue: '50',
          goalDirection: 'higher_is_better',
        }),
      ]);

      const achieved = await goalService.checkMilestonesForParam(TENANT_A, PARAM_GHG, 45);

      expect(achieved).toHaveLength(0);
    });

    it('handles multiple milestones — achieves some, skips others', async () => {
      mockFindPendingMilestonesByGoalParam.mockResolvedValue([
        makeMilestoneRow({
          milestoneId: MILESTONE_1,
          targetValue: '80',
          goalDirection: 'lower_is_better',
        }),
        makeMilestoneRow({
          milestoneId: MILESTONE_2,
          targetValue: '50',
          goalDirection: 'lower_is_better',
        }),
      ]);
      mockMarkMilestoneAchieved.mockResolvedValue(
        makeMilestoneRow({ milestoneId: MILESTONE_1, status: 'achieved' })
      );

      // currentValue=70: meets target=80 (lower_is_better), but not target=50
      const achieved = await goalService.checkMilestonesForParam(TENANT_A, PARAM_GHG, 70);

      expect(achieved).toHaveLength(1);
      expect(mockMarkMilestoneAchieved).toHaveBeenCalledWith(MILESTONE_1, TENANT_A);
      expect(mockMarkMilestoneAchieved).not.toHaveBeenCalledWith(MILESTONE_2, TENANT_A);
    });

    it('skips milestones with null targetValue', async () => {
      mockFindPendingMilestonesByGoalParam.mockResolvedValue([
        makeMilestoneRow({ milestoneId: MILESTONE_1, targetValue: null }),
      ]);

      const achieved = await goalService.checkMilestonesForParam(TENANT_A, PARAM_GHG, 42);

      expect(achieved).toHaveLength(0);
      expect(mockMarkMilestoneAchieved).not.toHaveBeenCalled();
    });

    it('marks milestone at exact boundary (lower_is_better: current=target)', async () => {
      mockFindPendingMilestonesByGoalParam.mockResolvedValue([
        makeMilestoneRow({
          milestoneId: MILESTONE_1,
          targetValue: '50',
          goalDirection: 'lower_is_better',
        }),
      ]);
      mockMarkMilestoneAchieved.mockResolvedValue(
        makeMilestoneRow({ milestoneId: MILESTONE_1, status: 'achieved' })
      );

      const achieved = await goalService.checkMilestonesForParam(TENANT_A, PARAM_GHG, 50);

      expect(achieved).toHaveLength(1);
    });
  });
});
