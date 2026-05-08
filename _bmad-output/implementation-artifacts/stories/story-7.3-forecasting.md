# Story 7.3: Linear Regression Forecasting

Status: complete

## Story

As a CFO,
I want forecasted trajectories for ESG goals based on historical trends,
so that I can assess probability of meeting commitments.

## Acceptance Criteria

1. forecastService performs linear regression on historical KPI values (min 3 data points)
2. Produces 3 scenarios: BAU (current trend), moderate (+X%), aggressive (+Y%)
3. GET /api/goals/[goalId]/forecast returns scenarios with projected values + probability
4. ForecastChart shows historical points + 3 trendlines + goal target reference line
5. < 3 data points returns "Insufficient data" message instead of unreliable projection

## Tasks / Subtasks

- [x] Create forecastService (AC: #1, #2, #5)
  - [x] Implement linear regression (least-squares fit: y = mx + b) on historical (period, value) pairs
  - [x] Return "Insufficient data" when fewer than 3 data points
  - [x] Compute BAU scenario using raw slope
  - [x] Compute moderate scenario using slope * 1.5 multiplier
  - [x] Compute aggressive scenario using slope * 2.0 multiplier
  - [x] Calculate probability of achievement: P = 1 - normalCDF(target - projected_at_date, stdError)
- [x] Create forecast API endpoint (AC: #3)
  - [x] GET /api/goals/[goalId]/forecast — returns scenarios array
  - [x] Response shape: { scenarios: [{ name, slope, intercept, projectedValues: [{date, value}], probability }] }
  - [x] Handle insufficient data case with appropriate response
- [x] Build ForecastChart component (AC: #4)
  - [x] Line chart with Chart.js showing historical data points
  - [x] Overlay 3 scenario trendlines (BAU, moderate, aggressive)
  - [x] Display goal target as horizontal reference line
  - [x] Legend with scenario names and probabilities
  - [x] "Insufficient data" placeholder when < 3 data points

## Dev Notes

- Service: /src/services/forecastService.ts
- Linear regression: simple least-squares fit (y = mx + b) on historical (period, value) pairs
- Scenarios: BAU uses raw slope; moderate = slope * 1.5; aggressive = slope * 2.0 (configurable multipliers)
- Probability: based on whether projected line reaches goal target by target_date
- P(achievement) = 1 - normalCDF(target - projected_at_date, stdError) — simplified model
- Library: `simple-statistics` (linRegression) or implement manually (it's 10 lines)
- API: /src/app/api/goals/[goalId]/forecast/route.ts
- Response: { scenarios: [{ name, slope, intercept, projectedValues: [{date, value}], probability }] }
- Component: /src/components/goals/ForecastChart.tsx — Line chart with Chart.js

### Depends On
- Story 7.2 (milestones provide context)
- Story 4.3 (historical KPI values needed)

### References
- [Source: product-brief.md — linear regression forecasting]
- [Source: decisions-log.md#D7 — confirmed linear regression]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No issues encountered during implementation.

### Completion Notes List
- Implemented manual least-squares linear regression (no external library needed) with slope, intercept, and standard error computation.
- Implemented normalCDF approximation (Abramowitz & Stegun formula) for probability calculation.
- Probability accounts for goal direction: `lower_is_better` uses CDF directly, `higher_is_better` uses 1-CDF.
- 3 scenarios (BAU=1.0x, Moderate=1.5x, Aggressive=2.0x slope multipliers) with projected values and achievement probability.
- Insufficient data handling: returns `insufficientData: true` with empty `scenarios` when fewer than 3 numeric data points.
- API endpoint follows the existing middleware chain pattern (auth → tenant → role → handler).
- ForecastChart uses dynamic Chart.js import (SSR-safe), renderIdRef for race condition prevention, matching existing chart component patterns.
- Target value shown as a horizontal dashed red dataset across the full chart width.
- All 1472 existing tests pass (zero regressions), plus 28 new tests (17 service + 9 API + 2 component).
- No new dependencies added. Linear regression implemented manually; Chart.js and react-chartjs-2 were already installed.

### File List
- `greenmeter/src/services/forecastService.ts` (new)
- `greenmeter/src/services/forecastService.test.ts` (new)
- `greenmeter/src/app/api/goals/[goalId]/forecast/route.ts` (new)
- `greenmeter/src/app/api/goals/[goalId]/forecast/route.test.ts` (new)
- `greenmeter/src/components/goals/ForecastChart.tsx` (new)
- `greenmeter/src/components/goals/ForecastChart.test.ts` (new)

### Review Findings
- [x] [Review][Decision] Multi-node KPI aggregation — resolved: aggregate per period with SUM(). Added GROUP BY (periodId, periodName, endDate) to query.
- [x] [Review][Patch] Division by zero / infinite loop — fixed: avgMonthsPerPeriod defaults to 12 when calculated as <= 0.
- [x] [Review][Patch] Unbounded projection array — fixed: capped periodsToProject at MAX_PROJECTION_PERIODS (50).
- [x] [Review][Patch] Infinity values bypass isNaN filter — fixed: changed to Number.isFinite(numValue).
- [x] [Review][Patch] targetValue/targetYear NaN propagation — fixed: added Number.isFinite() guards, throws VALIDATION_ERROR.
- [x] [Review][Patch] No filter on kpiValues.notApplicable — fixed: added eq(kpiValues.notApplicable, false) to where clause.
- [x] [Review][Patch] Unused `targetYear` prop in ForecastChart — fixed: removed from useEffect deps array.
- [x] [Review][Patch] No error handling on async Chart.js import — fixed: added .catch() handler.
- [x] [Review][Defer] Thin ForecastChart component tests — only 2 smoke tests (module export + compile). No rendering tests for chart, insufficient data placeholder, or props. Matches existing RadarChart test pattern; Chart.js canvas testing requires heavy mocking. — deferred, pre-existing pattern

## Change Log
- 2026-05-07: Implemented forecastService with linear regression, 3 scenarios, probability calculation
- 2026-05-07: Created GET /api/goals/[goalId]/forecast endpoint with middleware chain
- 2026-05-07: Built ForecastChart component with Chart.js, historical data, scenario trendlines, target line, and insufficient data placeholder
- 2026-05-07: Added 28 tests (17 service, 9 API route, 2 component); all 1472 tests pass
- 2026-05-07: Code review patches applied — SUM aggregation, infinite loop guard, projection cap, Infinity filter, NaN guards, notApplicable filter, ForecastChart fixes; 5 new tests added (33 total)

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `review` — all tasks complete, all tests passing, ready for human review
- 2026-05-08: Status changed to `complete` — human review approved
