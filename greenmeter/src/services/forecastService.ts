import { db } from '@/db';
import { kpiValues } from '@/db/schema/kpi';
import { reportingPeriods } from '@/db/schema/tenants';
import { goalRepository } from '@/db/repositories/goalRepository';
import { eq, and, asc, isNotNull, sql } from 'drizzle-orm';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────

export interface HistoricalDataPoint {
  periodId: string;
  periodName: string;
  endDate: Date;
  value: number;
}

export interface ProjectedValue {
  date: string;
  value: number;
}

export interface ForecastScenario {
  name: string;
  slope: number;
  intercept: number;
  projectedValues: ProjectedValue[];
  probability: number;
}

export interface ForecastResult {
  goalId: string;
  goalName: string;
  targetValue: number;
  targetYear: string;
  direction: string;
  unit: string | null;
  historicalData: HistoricalDataPoint[];
  scenarios: ForecastScenario[];
  insufficientData: boolean;
}

// ─── Math Utilities ──────────────────────────────────────────

/**
 * Least-squares linear regression: y = slope * x + intercept
 * x values are zero-indexed period indices (0, 1, 2, ...)
 */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: values[0] ?? 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Computes the standard error of the regression estimate.
 */
function computeStdError(values: number[], slope: number, intercept: number): number {
  const n = values.length;
  if (n <= 2) return 0;

  let sumSquaredResiduals = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    const residual = values[i] - predicted;
    sumSquaredResiduals += residual * residual;
  }

  return Math.sqrt(sumSquaredResiduals / (n - 2));
}

/**
 * Approximation of the standard normal CDF using Abramowitz & Stegun formula.
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const erfc = (a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * (1 - erfc));
}

/**
 * Calculates probability of achieving the target given a projected value,
 * target value, standard error, and goal direction.
 *
 * For "lower_is_better": P = P(projected <= target) = normalCDF((target - projected) / stdError)
 * For "higher_is_better": P = P(projected >= target) = 1 - normalCDF((target - projected) / stdError)
 */
function computeProbability(
  projectedValue: number,
  targetValue: number,
  stdError: number,
  direction: string
): number {
  if (stdError === 0) {
    // With no variance, achievement is deterministic
    if (direction === 'lower_is_better') {
      return projectedValue <= targetValue ? 1.0 : 0.0;
    }
    return projectedValue >= targetValue ? 1.0 : 0.0;
  }

  const z = (targetValue - projectedValue) / stdError;

  if (direction === 'lower_is_better') {
    // Want projected <= target, so P(X <= target) = CDF(z)
    return normalCDF(z);
  }
  // higher_is_better: Want projected >= target, so P(X >= target) = 1 - CDF(z)
  return 1 - normalCDF(z);
}

// ─── Scenario Configuration ─────────────────────────────────

const SCENARIOS = [
  { name: 'BAU', multiplier: 1.0 },
  { name: 'Moderate', multiplier: 1.5 },
  { name: 'Aggressive', multiplier: 2.0 },
] as const;

// ─── Service ─────────────────────────────────────────────────

export const forecastService = {
  /**
   * Fetches historical KPI values for a goal's linked parameter,
   * performs linear regression, and returns 3 forecast scenarios.
   */
  async getForecast(goalId: string, tenantId: string): Promise<ForecastResult> {
    // 1. Load the goal
    const goal = await goalRepository.findById(goalId, tenantId);
    if (!goal) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Goal not found', 404);
    }

    const targetValue = Number(goal.targetValue);
    if (!Number.isFinite(targetValue)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Goal has invalid target value', 400);
    }
    const direction = goal.direction ?? 'lower_is_better';

    // 2. Fetch historical KPI values for the goal's paramId, ordered by period end date
    const historicalRows = await db
      .select({
        periodId: kpiValues.periodId,
        periodName: reportingPeriods.name,
        endDate: reportingPeriods.endDate,
        value: sql<string>`sum(${kpiValues.value})`,
      })
      .from(kpiValues)
      .innerJoin(reportingPeriods, eq(kpiValues.periodId, reportingPeriods.periodId))
      .where(
        and(
          eq(kpiValues.tenantId, tenantId),
          eq(kpiValues.paramId, goal.paramId),
          isNotNull(kpiValues.value),
          eq(kpiValues.notApplicable, false)
        )
      )
      .groupBy(kpiValues.periodId, reportingPeriods.name, reportingPeriods.endDate)
      .orderBy(asc(reportingPeriods.endDate));

    // Parse numeric values and filter out non-numeric entries
    const historicalData: HistoricalDataPoint[] = [];
    for (const row of historicalRows) {
      const numValue = Number(row.value);
      if (Number.isFinite(numValue)) {
        historicalData.push({
          periodId: row.periodId,
          periodName: row.periodName,
          endDate: row.endDate,
          value: numValue,
        });
      }
    }

    // 3. Check minimum data points
    if (historicalData.length < 3) {
      logger.info('Insufficient data for forecast', {
        goalId,
        tenantId,
        dataPoints: historicalData.length,
      });

      return {
        goalId,
        goalName: goal.name,
        targetValue,
        targetYear: goal.targetYear,
        direction,
        unit: goal.unit,
        historicalData,
        scenarios: [],
        insufficientData: true,
      };
    }

    // 4. Perform linear regression
    const values = historicalData.map((d) => d.value);
    const { slope: baseSlope, intercept } = linearRegression(values);
    const stdError = computeStdError(values, baseSlope, intercept);

    // 5. Determine projection range
    // Project from the last historical period to the target year
    const lastPeriodIndex = historicalData.length - 1;
    const lastDate = historicalData[lastPeriodIndex].endDate;
    const targetYearNum = Number(goal.targetYear);
    if (!Number.isFinite(targetYearNum)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Goal has invalid target year', 400);
    }

    // Estimate how many periods to project forward
    // Use average period spacing from historical data
    const firstDate = historicalData[0].endDate;
    const totalMonths =
      (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
      (lastDate.getMonth() - firstDate.getMonth());
    const rawAvgMonths = historicalData.length > 1
      ? totalMonths / (historicalData.length - 1)
      : 12; // default to annual if only one gap
    const avgMonthsPerPeriod = rawAvgMonths > 0 ? rawAvgMonths : 12;

    // Project until target year end
    const targetDate = new Date(targetYearNum, 11, 31); // Dec 31 of target year
    const monthsToProject =
      (targetDate.getFullYear() - lastDate.getFullYear()) * 12 +
      (targetDate.getMonth() - lastDate.getMonth());

    const MAX_PROJECTION_PERIODS = 50;
    const periodsToProject = Math.min(
      MAX_PROJECTION_PERIODS,
      Math.max(1, Math.ceil(monthsToProject / avgMonthsPerPeriod))
    );

    // 6. Generate scenarios
    const scenarios: ForecastScenario[] = SCENARIOS.map(({ name, multiplier }) => {
      const adjustedSlope = baseSlope * multiplier;

      // Generate projected values
      const projectedValues: ProjectedValue[] = [];
      for (let p = 1; p <= periodsToProject; p++) {
        const futureIndex = lastPeriodIndex + p;
        const projectedValue = adjustedSlope * futureIndex + intercept;

        // Estimate the date for this future period
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + Math.round(p * avgMonthsPerPeriod));

        projectedValues.push({
          date: futureDate.toISOString().slice(0, 10),
          value: Math.round(projectedValue * 100) / 100,
        });
      }

      // Calculate probability using the last projected value (at target date)
      const finalProjectedValue = projectedValues.length > 0
        ? projectedValues[projectedValues.length - 1].value
        : adjustedSlope * (lastPeriodIndex + 1) + intercept;

      const probability = computeProbability(finalProjectedValue, targetValue, stdError, direction);

      return {
        name,
        slope: Math.round(adjustedSlope * 10000) / 10000,
        intercept: Math.round(intercept * 100) / 100,
        projectedValues,
        probability: Math.round(probability * 1000) / 1000,
      };
    });

    logger.info('Forecast computed', {
      goalId,
      tenantId,
      dataPoints: historicalData.length,
      scenarios: scenarios.map((s) => ({ name: s.name, probability: s.probability })),
    });

    return {
      goalId,
      goalName: goal.name,
      targetValue,
      targetYear: goal.targetYear,
      direction,
      unit: goal.unit,
      historicalData,
      scenarios,
      insufficientData: false,
    };
  },
};
