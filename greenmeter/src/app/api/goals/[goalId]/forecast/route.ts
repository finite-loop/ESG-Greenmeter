import { withApiHandler } from '@/middleware';
import { forecastService } from '@/services/forecastService';
import { extractUuidParam } from '@/lib/params';

/**
 * GET /api/goals/[goalId]/forecast — Returns forecast scenarios for a goal.
 *
 * Response shape:
 *   { data: ForecastResult }
 *
 * Where ForecastResult contains:
 *   - goalId, goalName, targetValue, targetYear, direction, unit
 *   - historicalData: [{ periodId, periodName, endDate, value }]
 *   - scenarios: [{ name, slope, intercept, projectedValues: [{ date, value }], probability }]
 *   - insufficientData: boolean
 *
 * When fewer than 3 data points are available, scenarios is [] and insufficientData is true.
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const goalId = extractUuidParam(req, 3, 'goal ID');
    const forecast = await forecastService.getForecast(goalId, ctx.tenantId);

    return { data: forecast };
  },
  { roles: ['admin', 'analyst', 'viewer'], audit: false }
);
