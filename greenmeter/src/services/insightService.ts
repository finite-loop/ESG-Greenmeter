import { recommendationService } from '@/services/recommendationService';
import { goalService } from '@/services/goalService';
import { benchmarkService } from '@/services/benchmarkService';
import { reportService } from '@/services/reportService';
import { kpiService } from '@/services/kpiService';
import { db } from '@/db';
import { reportingPeriods } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────

export interface InsightItem {
  text: string;
  metric?: string;
  pillar?: string;
  severity?: 'critical' | 'warning' | 'info' | 'good';
}

export interface InsightSection {
  id: 'risk' | 'position' | 'actions' | 'compliance' | 'trends';
  title: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  items: InsightItem[];
}

export interface InsightBriefing {
  generatedAt: string;
  periodId: string;
  summary: string;
  sections: InsightSection[];
}

// ── Helpers ──────────────────────────────────────────────────

async function safeCall<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    logger.warn(`Insight: ${label} data source failed`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function highestSeverity(items: InsightItem[]): 'critical' | 'warning' | 'info' | 'good' {
  if (items.some(i => i.severity === 'critical')) return 'critical';
  if (items.some(i => i.severity === 'warning')) return 'warning';
  if (items.some(i => i.severity === 'info')) return 'info';
  return 'good';
}

function formatNumber(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  return val.toFixed(1);
}

// ── Section builders ─────────────────────────────────────────

function buildRiskSection(
  recommendations: Awaited<ReturnType<typeof recommendationService.getRecommendations>> | null,
  goals: Awaited<ReturnType<typeof goalService.list>> | null
): InsightSection | null {
  const items: InsightItem[] = [];

  if (recommendations && recommendations.length > 0) {
    const critical = recommendations.filter(r => r.priority === 'critical');
    const warning = recommendations.filter(r => r.priority === 'warning');

    if (critical.length > 0) {
      items.push({
        text: `${critical.length} critical metric${critical.length > 1 ? 's' : ''} detected.`,
        severity: 'critical',
      });
      // Top 3 critical alerts
      critical.slice(0, 3).forEach(r => {
        const valStr = r.currentValue != null ? ` at ${formatNumber(Number(r.currentValue))}` : '';
        const threshStr = r.thresholdValue != null ? ` (threshold: ${formatNumber(Number(r.thresholdValue))})` : '';
        items.push({
          text: `${r.metric}${valStr}${threshStr} — ${r.recommendationText}`,
          metric: r.metric,
          pillar: r.pillar ?? undefined,
          severity: 'critical',
        });
      });
    }

    if (warning.length > 0) {
      items.push({
        text: `${warning.length} warning-level alert${warning.length > 1 ? 's' : ''} active.`,
        severity: 'warning',
      });
    }
  }

  if (goals?.data) {
    const atRisk = goals.data.filter(g => g.status === 'at_risk' || g.status === 'missed');
    if (atRisk.length > 0) {
      atRisk.slice(0, 3).forEach(g => {
        items.push({
          text: `Goal "${g.name}" is ${g.status === 'missed' ? 'missed' : 'at risk'} (progress: ${g.progress}%).`,
          severity: g.status === 'missed' ? 'critical' : 'warning',
        });
      });
    }
  }

  if (items.length === 0) return null;
  return { id: 'risk', title: 'Risk Summary', severity: highestSeverity(items), items };
}

function buildPositionSection(
  benchmarks: (Awaited<ReturnType<typeof benchmarkService.getBenchmark>> | null)[]
): InsightSection | null {
  const items: InsightItem[] = [];
  const validBenchmarks = benchmarks.filter(
    (b): b is NonNullable<typeof b> => b != null && !b.insufficientData
  );

  if (validBenchmarks.length === 0) return null;

  validBenchmarks.forEach(b => {
    const pctText = b.percentileRank != null ? `${Math.round(b.percentileRank)}th percentile` : 'no rank';
    const gap = b.tenantValue != null && b.q1 != null
      ? Number(b.tenantValue) - Number(b.q1)
      : null;
    const gapText = gap != null ? ` (gap to top quartile: ${formatNumber(Math.abs(gap))})` : '';
    items.push({
      text: `${b.canonicalName}: ${pctText} in sector${gapText}.`,
      metric: b.canonicalName,
      pillar: b.pillar ?? undefined,
      severity: b.percentileRank != null && b.percentileRank < 25 ? 'warning' : 'info',
    });
  });

  return { id: 'position', title: 'Relative Position', severity: highestSeverity(items), items };
}

function buildActionsSection(
  recommendations: Awaited<ReturnType<typeof recommendationService.getRecommendations>> | null
): InsightSection | null {
  if (!recommendations || recommendations.length === 0) return null;

  const top5 = recommendations.slice(0, 5);
  const items: InsightItem[] = top5.map(r => ({
    text: r.recommendationText,
    metric: r.metric,
    pillar: r.pillar ?? undefined,
    severity: r.priority === 'critical' ? 'critical' : r.priority === 'warning' ? 'warning' : 'info',
  }));

  return { id: 'actions', title: 'Recommended Actions', severity: highestSeverity(items), items };
}

function buildComplianceSection(
  coverages: ({ framework: string; data: Awaited<ReturnType<typeof reportService.getCoverage>> } | null)[]
): InsightSection | null {
  const items: InsightItem[] = [];
  const valid = coverages.filter((c): c is NonNullable<typeof c> => c != null);

  if (valid.length === 0) return null;

  valid.forEach(({ framework, data: cov }) => {
    const pct = Math.round(cov.percentComplete);
    const severity: InsightItem['severity'] = pct >= 80 ? 'good' : pct >= 50 ? 'warning' : 'critical';
    items.push({
      text: `${framework.toUpperCase()}: ${pct}% complete (${cov.hasValue}/${cov.totalParams} parameters disclosed).`,
      severity,
    });

    if (cov.belowThreshold) {
      items.push({
        text: `Coverage is below threshold in ${framework.toUpperCase()} (${pct}% < ${cov.warningThreshold}%).`,
        severity: 'warning',
      });
    }
  });

  return { id: 'compliance', title: 'Compliance Status', severity: highestSeverity(items), items };
}

function buildTrendsSection(
  currentValues: Awaited<ReturnType<typeof kpiService.listValues>> | null,
  priorValues: Awaited<ReturnType<typeof kpiService.listValues>> | null
): InsightSection | null {
  if (!currentValues?.data || currentValues.data.length === 0) return null;

  const items: InsightItem[] = [];

  if (priorValues?.data && priorValues.data.length > 0) {
    // Build a map of prior values by paramId
    const priorMap = new Map<string, number>();
    priorValues.data.forEach(v => {
      if (v.paramId && v.value != null) {
        const num = Number(v.value);
        if (!Number.isNaN(num)) priorMap.set(v.paramId, num);
      }
    });

    // Calculate deltas for current values
    type Delta = { name: string; delta: number; pillar: string | null };
    const deltas: Delta[] = [];

    currentValues.data.forEach(v => {
      if (v.paramId && v.value != null) {
        const currNum = Number(v.value);
        if (Number.isNaN(currNum)) return;
        const prior = priorMap.get(v.paramId);
        if (prior != null && prior !== 0) {
          const pctChange = ((currNum - prior) / Math.abs(prior)) * 100;
          deltas.push({
            name: v.paramName ?? v.paramId,
            delta: pctChange,
            pillar: v.pillar ?? null,
          });
        }
      }
    });

    // Sort by absolute delta, take biggest movers
    deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const topMovers = deltas.slice(0, 5);

    topMovers.forEach(d => {
      const direction = d.delta > 0 ? 'increased' : 'decreased';
      items.push({
        text: `${d.name} ${direction} ${Math.abs(d.delta).toFixed(1)}% year-over-year.`,
        metric: d.name,
        pillar: d.pillar ?? undefined,
        severity: Math.abs(d.delta) > 20 ? 'warning' : 'info',
      });
    });
  } else {
    items.push({
      text: `${currentValues.data.length} KPI values reported for current period.`,
      severity: 'info',
    });
  }

  if (items.length === 0) return null;
  return { id: 'trends', title: 'Trend Highlights', severity: highestSeverity(items), items };
}

// ── Main service ─────────────────────────────────────────────

const CANONICAL_BENCHMARK_IDS = [
  'ghg_scope1_intensity',
  'energy_intensity',
  'water_intensity',
  'renewable_energy_pct',
  'women_mgmt_pct',
];

const FRAMEWORKS = ['brsr', 'gri', 'esrs'];

/**
 * Resolve the latest and prior reporting period IDs for a tenant.
 * Periods are ordered by start_date DESC, so index 0 = latest, index 1 = prior.
 */
async function resolvePeriods(tenantId: string, periodId?: string): Promise<{ current: string | null; prior: string | null; fiscalYear: string | null }> {
  try {
    const rows = await db
      .select({
        periodId: reportingPeriods.periodId,
        fiscalYear: reportingPeriods.fiscalYear,
      })
      .from(reportingPeriods)
      .where(eq(reportingPeriods.tenantId, tenantId))
      .orderBy(desc(reportingPeriods.startDate))
      .limit(2);

    if (periodId) {
      // Caller specified a periodId — use it as current, try to find the one before it
      const idx = rows.findIndex(r => r.periodId === periodId);
      const current = periodId;
      const prior = idx >= 0 && idx + 1 < rows.length ? rows[idx + 1].periodId : null;
      const fiscalYear = idx >= 0 ? rows[idx].fiscalYear : rows[0]?.fiscalYear ?? null;
      return { current, prior, fiscalYear };
    }

    // No periodId specified — use the two most recent
    return {
      current: rows[0]?.periodId ?? null,
      prior: rows[1]?.periodId ?? null,
      fiscalYear: rows[0]?.fiscalYear ?? null,
    };
  } catch (err) {
    logger.warn('Insight: failed to resolve periods', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { current: null, prior: null, fiscalYear: null };
  }
}

export const insightService = {
  async generateBriefing(
    tenantId: string,
    periodId?: string
  ): Promise<InsightBriefing> {
    // Resolve real period IDs from the database
    const periods = await resolvePeriods(tenantId, periodId);
    const currentPeriodId = periods.current;
    const priorPeriodId = periods.prior;
    const fiscalYear = periods.fiscalYear;

    // Gather data from all sources in parallel
    const [
      recommendationsResult,
      goalsResult,
      benchmarkResults,
      coverageResults,
      currentKpiResult,
      priorKpiResult,
    ] = await Promise.allSettled([
      // Recommendations
      safeCall('recommendations', () =>
        recommendationService.getRecommendations(tenantId, 20)
      ),
      // Goals
      safeCall('goals', () =>
        goalService.list(tenantId, { page: 1, pageSize: 50 })
      ),
      // Benchmarks (parallel for each canonical metric)
      Promise.allSettled(
        CANONICAL_BENCHMARK_IDS.map(canonicalId =>
          safeCall('benchmark-' + canonicalId, () =>
            benchmarkService.getBenchmark(tenantId, canonicalId, fiscalYear ?? 'FY2024')
          )
        )
      ),
      // Coverage per framework (skip if no current period)
      currentPeriodId
        ? Promise.allSettled(
            FRAMEWORKS.map(fw =>
              safeCall('coverage-' + fw, async () => {
                const cov = await reportService.getCoverage(fw, tenantId, currentPeriodId);
                return { framework: fw, data: cov };
              })
            )
          )
        : Promise.resolve([]),
      // Current period KPI values (omit periodId filter if none resolved, to get all data)
      safeCall('kpi-current', () =>
        kpiService.listValues(tenantId, {
          ...(currentPeriodId ? { periodId: currentPeriodId } : {}),
          page: 1,
          pageSize: 100,
        })
      ),
      // Prior period KPI values (skip if no prior period)
      priorPeriodId
        ? safeCall('kpi-prior', () =>
            kpiService.listValues(tenantId, { periodId: priorPeriodId, page: 1, pageSize: 100 })
          )
        : Promise.resolve(null),
    ]);

    // Extract values from settled results
    const recommendations = recommendationsResult.status === 'fulfilled' ? recommendationsResult.value : null;
    const goals = goalsResult.status === 'fulfilled' ? goalsResult.value : null;

    const benchmarks = benchmarkResults.status === 'fulfilled'
      ? benchmarkResults.value.map(r => r.status === 'fulfilled' ? r.value : null)
      : [];

    const coverages = coverageResults.status === 'fulfilled'
      ? coverageResults.value.map(r => r.status === 'fulfilled' ? r.value : null)
      : [];

    const currentKpi = currentKpiResult.status === 'fulfilled' ? currentKpiResult.value : null;
    const priorKpi = priorKpiResult.status === 'fulfilled' ? priorKpiResult.value : null;

    // Build sections
    const sections: InsightSection[] = [];

    const risk = buildRiskSection(recommendations, goals);
    if (risk) sections.push(risk);

    const position = buildPositionSection(benchmarks);
    if (position) sections.push(position);

    const actions = buildActionsSection(recommendations);
    if (actions) sections.push(actions);

    const compliance = buildComplianceSection(coverages);
    if (compliance) sections.push(compliance);

    const trends = buildTrendsSection(currentKpi, priorKpi);
    if (trends) sections.push(trends);

    // Generate summary
    const summary = generateSummary(sections);

    return {
      generatedAt: new Date().toISOString(),
      periodId: currentPeriodId ?? 'none',
      summary,
      sections,
    };
  },
};

function generateSummary(sections: InsightSection[]): string {
  if (sections.length === 0) {
    return 'No insight data available for this period.';
  }

  const hasCritical = sections.some(s => s.severity === 'critical');
  const hasWarning = sections.some(s => s.severity === 'warning');
  const sectionCount = sections.length;

  if (hasCritical) {
    const criticalSections = sections.filter(s => s.severity === 'critical').map(s => s.title);
    return `Attention required: critical issues detected in ${criticalSections.join(', ')}. ${sectionCount} areas analysed.`;
  }

  if (hasWarning) {
    return `Some areas need attention. ${sectionCount} areas analysed with warnings in ${sections.filter(s => s.severity === 'warning').map(s => s.title).join(', ')}.`;
  }

  return `ESG performance is on track across ${sectionCount} areas analysed.`;
}
