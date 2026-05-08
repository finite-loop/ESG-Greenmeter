import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

// ─── Mocks ───────────────────────────────────────────────────

const mockFindById = vi.fn();

vi.mock('@/db/repositories/goalRepository', () => ({
  goalRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockInnerJoin = vi.fn();
const mockWhere = vi.fn();
const mockGroupBy = vi.fn();
const mockOrderBy = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Chain mock setup helper
function setupDbChain(rows: unknown[]) {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
  mockInnerJoin.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ groupBy: mockGroupBy });
  mockGroupBy.mockReturnValue({ orderBy: mockOrderBy });
  mockOrderBy.mockResolvedValue(rows);
}

import { forecastService } from './forecastService';

// ─── Test Data ───────────────────────────────────────────────

const TENANT_ID = 'tenant-abc';
const GOAL_ID = 'goal-123';

const baseGoal = {
  goalId: GOAL_ID,
  tenantId: TENANT_ID,
  paramId: 'param-1',
  canonicalId: null,
  name: 'Reduce Carbon Emissions',
  description: null,
  targetValue: '50',
  baselineValue: '100',
  baselineYear: '2020',
  targetYear: '2030',
  unit: 'tCO2e',
  direction: 'lower_is_better',
  status: 'active',
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function makeHistoricalRow(year: number, value: number) {
  return {
    periodId: `period-${year}`,
    periodName: `FY ${year}`,
    endDate: new Date(`${year}-03-31T00:00:00Z`),
    value: String(value),
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('forecastService.getForecast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_FOUND when goal does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      forecastService.getForecast('goal-missing', TENANT_ID)
    ).rejects.toThrow(AppError);

    try {
      await forecastService.getForecast('goal-missing', TENANT_ID);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });

  it('returns insufficientData=true when fewer than 3 data points', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 95),
      makeHistoricalRow(2023, 90),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.insufficientData).toBe(true);
    expect(result.scenarios).toHaveLength(0);
    expect(result.historicalData).toHaveLength(2);
    expect(result.goalId).toBe(GOAL_ID);
    expect(result.goalName).toBe('Reduce Carbon Emissions');
  });

  it('returns insufficientData=true when zero data points', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.insufficientData).toBe(true);
    expect(result.scenarios).toHaveLength(0);
    expect(result.historicalData).toHaveLength(0);
  });

  it('computes 3 scenarios with 3+ data points', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.insufficientData).toBe(false);
    expect(result.scenarios).toHaveLength(3);
    expect(result.scenarios[0].name).toBe('BAU');
    expect(result.scenarios[1].name).toBe('Moderate');
    expect(result.scenarios[2].name).toBe('Aggressive');
  });

  it('BAU scenario uses raw slope (multiplier 1.0)', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    const bau = result.scenarios.find((s) => s.name === 'BAU');
    expect(bau).toBeDefined();
    // Linear regression on [100, 90, 80] with x=[0,1,2] should give slope=-10
    expect(bau!.slope).toBe(-10);
    expect(bau!.intercept).toBe(100);
  });

  it('Moderate scenario uses slope * 1.5', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    const moderate = result.scenarios.find((s) => s.name === 'Moderate');
    expect(moderate).toBeDefined();
    expect(moderate!.slope).toBe(-15);
  });

  it('Aggressive scenario uses slope * 2.0', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    const aggressive = result.scenarios.find((s) => s.name === 'Aggressive');
    expect(aggressive).toBeDefined();
    expect(aggressive!.slope).toBe(-20);
  });

  it('each scenario has projected values array', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    for (const scenario of result.scenarios) {
      expect(scenario.projectedValues.length).toBeGreaterThan(0);
      for (const pv of scenario.projectedValues) {
        expect(pv.date).toBeDefined();
        expect(typeof pv.value).toBe('number');
      }
    }
  });

  it('each scenario has probability between 0 and 1', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    for (const scenario of result.scenarios) {
      expect(scenario.probability).toBeGreaterThanOrEqual(0);
      expect(scenario.probability).toBeLessThanOrEqual(1);
    }
  });

  it('higher_is_better direction: higher projected values increase probability', async () => {
    const higherGoal = { ...baseGoal, direction: 'higher_is_better', targetValue: '200' };
    mockFindById.mockResolvedValue(higherGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 120),
      makeHistoricalRow(2024, 140),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    // Aggressive scenario should have higher probability than BAU
    const bau = result.scenarios.find((s) => s.name === 'BAU')!;
    const aggressive = result.scenarios.find((s) => s.name === 'Aggressive')!;
    expect(aggressive.probability).toBeGreaterThanOrEqual(bau.probability);
  });

  it('lower_is_better direction: steeper decline increases probability', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    // Aggressive scenario (slope*2) should reduce faster, higher probability of meeting target
    const bau = result.scenarios.find((s) => s.name === 'BAU')!;
    const aggressive = result.scenarios.find((s) => s.name === 'Aggressive')!;
    expect(aggressive.probability).toBeGreaterThanOrEqual(bau.probability);
  });

  it('returns correct goal metadata in result', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.goalId).toBe(GOAL_ID);
    expect(result.goalName).toBe('Reduce Carbon Emissions');
    expect(result.targetValue).toBe(50);
    expect(result.targetYear).toBe('2030');
    expect(result.direction).toBe('lower_is_better');
    expect(result.unit).toBe('tCO2e');
  });

  it('filters out non-numeric kpi values', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      { periodId: 'period-bad', periodName: 'FY Bad', endDate: new Date('2023-03-31'), value: 'N/A' },
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    // Non-numeric "N/A" should be filtered out, leaving 3 valid points
    expect(result.insufficientData).toBe(false);
    expect(result.historicalData).toHaveLength(3);
    expect(result.scenarios).toHaveLength(3);
  });

  it('handles flat data (zero slope) without errors', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 80),
      makeHistoricalRow(2023, 80),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.insufficientData).toBe(false);
    expect(result.scenarios).toHaveLength(3);

    const bau = result.scenarios.find((s) => s.name === 'BAU')!;
    expect(bau.slope).toBe(0);
    // All projected values should be 80 (flat line)
    for (const pv of bau.projectedValues) {
      expect(pv.value).toBe(80);
    }
  });

  it('handles exactly 3 data points (minimum threshold)', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 95),
      makeHistoricalRow(2024, 90),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.insufficientData).toBe(false);
    expect(result.scenarios).toHaveLength(3);
  });

  it('handles many data points', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2018, 130),
      makeHistoricalRow(2019, 125),
      makeHistoricalRow(2020, 118),
      makeHistoricalRow(2021, 110),
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.insufficientData).toBe(false);
    expect(result.scenarios).toHaveLength(3);
    expect(result.historicalData).toHaveLength(7);
  });

  it('throws VALIDATION_ERROR when targetValue is non-numeric', async () => {
    const badGoal = { ...baseGoal, targetValue: 'TBD' };
    mockFindById.mockResolvedValue(badGoal);

    await expect(
      forecastService.getForecast(GOAL_ID, TENANT_ID)
    ).rejects.toThrow(AppError);

    try {
      await forecastService.getForecast(GOAL_ID, TENANT_ID);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('VALIDATION_ERROR');
      expect(appErr.status).toBe(400);
    }
  });

  it('throws VALIDATION_ERROR when targetYear is non-numeric', async () => {
    const badGoal = { ...baseGoal, targetYear: 'FY2030' };
    mockFindById.mockResolvedValue(badGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    await expect(
      forecastService.getForecast(GOAL_ID, TENANT_ID)
    ).rejects.toThrow(AppError);

    try {
      await forecastService.getForecast(GOAL_ID, TENANT_ID);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('VALIDATION_ERROR');
      expect(appErr.status).toBe(400);
    }
  });

  it('filters out Infinity values from historical data', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      { periodId: 'period-inf', periodName: 'FY Inf', endDate: new Date('2023-03-31'), value: 'Infinity' },
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.historicalData).toHaveLength(3);
    expect(result.insufficientData).toBe(false);
  });

  it('caps projection periods to prevent unbounded arrays', async () => {
    const farGoal = { ...baseGoal, targetYear: '2200' };
    mockFindById.mockResolvedValue(farGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    // Should be capped at 50 periods max
    for (const scenario of result.scenarios) {
      expect(scenario.projectedValues.length).toBeLessThanOrEqual(50);
    }
  });

  it('handles identical historical dates without infinite loop', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    setupDbChain([
      { periodId: 'p1', periodName: 'FY 2024 Q1', endDate: new Date('2024-03-31T00:00:00Z'), value: '100' },
      { periodId: 'p2', periodName: 'FY 2024 Q2', endDate: new Date('2024-03-31T00:00:00Z'), value: '90' },
      { periodId: 'p3', periodName: 'FY 2024 Q3', endDate: new Date('2024-03-31T00:00:00Z'), value: '80' },
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    // Should not hang; avgMonthsPerPeriod defaults to 12 when calculated as 0
    expect(result.insufficientData).toBe(false);
    expect(result.scenarios).toHaveLength(3);
    for (const scenario of result.scenarios) {
      expect(scenario.projectedValues.length).toBeGreaterThan(0);
      expect(scenario.projectedValues.length).toBeLessThanOrEqual(50);
    }
  });

  it('handles goal with null direction (defaults to lower_is_better)', async () => {
    const nullDirGoal = { ...baseGoal, direction: null };
    mockFindById.mockResolvedValue(nullDirGoal);
    setupDbChain([
      makeHistoricalRow(2022, 100),
      makeHistoricalRow(2023, 90),
      makeHistoricalRow(2024, 80),
    ]);

    const result = await forecastService.getForecast(GOAL_ID, TENANT_ID);

    expect(result.direction).toBe('lower_is_better');
    expect(result.insufficientData).toBe(false);
  });
});
