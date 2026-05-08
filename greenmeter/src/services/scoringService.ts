import { scoringRepository } from '@/db/repositories/scoringRepository';
import type {
  KpiValueForScoring,
  ThresholdRow,
  WeightRow,
  EsgScoreRow,
} from '@/db/repositories/scoringRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Strategy interface for scoring normalization.
 * Implementations define how raw KPI values map to 0-100 scores.
 */
export interface ScoringStrategy {
  normalize(
    value: number,
    thresholds: { redMax: number; amberMax: number },
    direction: 'lower_is_better' | 'higher_is_better'
  ): number;
}

/**
 * Default threshold-based scoring strategy.
 * Bands: excellent=100, good=75, fair=50, poor=25, critical=0.
 *
 * For higher_is_better:
 *   value >= amberMax → excellent (100)
 *   value >= redMax   → good-to-fair (interpolated 50-99)
 *   value < redMax    → poor (interpolated 0-49)
 *
 * For lower_is_better (inverted):
 *   value <= redMax   → excellent (100)
 *   value <= amberMax → good-to-fair (interpolated 50-99)
 *   value > amberMax  → poor (interpolated 0-49)
 */
export const thresholdStrategy: ScoringStrategy = {
  normalize(
    value: number,
    thresholds: { redMax: number; amberMax: number },
    direction: 'lower_is_better' | 'higher_is_better'
  ): number {
    const { redMax, amberMax } = thresholds;
    let score: number;

    if (direction === 'lower_is_better') {
      // Lower values are better: below redMax is excellent, above amberMax is poor
      if (value <= redMax) {
        score = 100;
      } else if (value <= amberMax) {
        const range = amberMax - redMax;
        if (range === 0) {
          score = 75;
        } else {
          const ratio = (value - redMax) / range;
          score = 100 - ratio * 50;
        }
      } else {
        // Above amberMax: poor zone, interpolate down from 49 to 0
        const worstCase = Math.abs(amberMax) * 2 || 1;
        const ratio = Math.min((value - amberMax) / worstCase, 1);
        score = 49 * (1 - ratio);
      }
    } else {
      // higher_is_better: above amberMax is excellent, below redMax is poor
      if (value >= amberMax) {
        score = 100;
      } else if (value >= redMax) {
        const range = amberMax - redMax;
        if (range === 0) {
          score = 75;
        } else {
          const ratio = (value - redMax) / range;
          score = 50 + ratio * 50;
        }
      } else {
        if (redMax === 0) {
          score = 0;
        } else {
          const ratio = value / redMax;
          score = ratio * 49;
        }
      }
    }

    // Clamp to valid 0-100 range (guards against negative thresholds edge cases)
    return Math.round(Math.max(0, Math.min(100, score)));
  },
};

/** Score breakdown at category level */
export interface CategoryScore {
  pillar: string;
  category: string;
  score: number;
  paramCount: number;
}

/** Score breakdown at pillar level */
export interface PillarScore {
  pillar: string;
  score: number;
  categoryCount: number;
  categories: CategoryScore[];
}

/** Full score breakdown for a node/period */
export interface ScoreBreakdown {
  overall: number;
  pillars: PillarScore[];
  nodeId: string;
  periodId: string;
  parameterCount: number;
}

/** Resolved threshold for a parameter, with fallback chain */
interface ResolvedThreshold {
  redMax: number;
  amberMax: number;
}

/**
 * Resolve the best-matching threshold for a parameter.
 * Priority: param-specific → category-level → pillar-level → default.
 * Tenant-specific thresholds override platform defaults (already sorted by priority in repository).
 */
function resolveThreshold(
  paramId: string,
  category: string | null,
  pillar: string,
  thresholdRows: ThresholdRow[]
): ResolvedThreshold {
  // Find param-specific threshold first
  const paramThreshold = thresholdRows.find(
    (t) => t.paramId === paramId
  );
  if (paramThreshold?.redMax != null && paramThreshold?.amberMax != null) {
    const redMax = Number(paramThreshold.redMax);
    const amberMax = Number(paramThreshold.amberMax);
    if (isFinite(redMax) && isFinite(amberMax)) {
      return { redMax, amberMax };
    }
  }

  // Category-level threshold
  if (category) {
    const catThreshold = thresholdRows.find(
      (t) => !t.paramId && t.category === category && t.pillar === pillar
    );
    if (catThreshold?.redMax != null && catThreshold?.amberMax != null) {
      const redMax = Number(catThreshold.redMax);
      const amberMax = Number(catThreshold.amberMax);
      if (isFinite(redMax) && isFinite(amberMax)) {
        return { redMax, amberMax };
      }
    }
  }

  // Pillar-level threshold
  const pillarThreshold = thresholdRows.find(
    (t) => !t.paramId && !t.category && t.pillar === pillar
  );
  if (pillarThreshold?.redMax != null && pillarThreshold?.amberMax != null) {
    const redMax = Number(pillarThreshold.redMax);
    const amberMax = Number(pillarThreshold.amberMax);
    if (isFinite(redMax) && isFinite(amberMax)) {
      return { redMax, amberMax };
    }
  }

  // Default threshold bands
  return { redMax: 30, amberMax: 60 };
}

/**
 * Resolve the weight for a pillar+category pair.
 * Tenant-specific weights override platform defaults (already sorted by priority in repository).
 * Falls back to equal weighting if no weight is defined.
 */
function resolveWeight(
  pillar: string,
  category: string,
  weightRows: WeightRow[]
): number {
  const weight = weightRows.find(
    (w) => w.pillar === pillar && w.category === category
  );
  if (weight) {
    const w = Number(weight.weight);
    if (isFinite(w) && w > 0) return w;
  }
  return 1;
}

/**
 * Resolve the weight for a pillar in the overall score.
 * Uses scoring_weights entries with category='_overall' as pillar-level weights.
 * Falls back to equal weighting (1) if not defined.
 */
function resolvePillarWeight(
  pillar: string,
  weightRows: WeightRow[]
): number {
  const weight = weightRows.find(
    (w) => w.pillar === pillar && w.category === '_overall'
  );
  if (weight) {
    const w = Number(weight.weight);
    if (isFinite(w) && w > 0) return w;
  }
  return 1;
}

export const scoringService = {
  /**
   * Computes ESG scores from raw KPI data using the strategy pattern.
   * Algorithm: normalize each param → weighted average per category → per pillar → overall.
   */
  async computeScores(
    tenantId: string,
    nodeId: string,
    periodId: string,
    strategy: ScoringStrategy = thresholdStrategy
  ): Promise<ScoreBreakdown> {
    // Fetch all required data
    const [values, thresholdRows, weightRows] = await Promise.all([
      scoringRepository.getValuesForScoring(tenantId, nodeId, periodId),
      scoringRepository.getThresholds(tenantId),
      scoringRepository.getWeights(tenantId),
    ]);

    if (values.length === 0) {
      return {
        overall: 0,
        pillars: [],
        nodeId,
        periodId,
        parameterCount: 0,
      };
    }

    // Step 1: Normalize each parameter value to 0-100
    const normalizedValues = values
      .filter((v) => v.value != null)
      .map((v) => {
        const numValue = Number(v.value);
        if (isNaN(numValue)) return null;

        const threshold = resolveThreshold(
          v.paramId,
          v.category,
          v.pillar,
          thresholdRows
        );
        const direction = (v.direction || 'lower_is_better') as
          | 'lower_is_better'
          | 'higher_is_better';

        const score = strategy.normalize(numValue, threshold, direction);
        return {
          paramId: v.paramId,
          pillar: v.pillar,
          category: v.category || 'Uncategorized',
          score,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    // Step 2: Group by pillar → category
    const pillarMap = new Map<
      string,
      Map<string, { scores: number[]; paramCount: number }>
    >();

    for (const nv of normalizedValues) {
      if (!pillarMap.has(nv.pillar)) {
        pillarMap.set(nv.pillar, new Map());
      }
      const categoryMap = pillarMap.get(nv.pillar)!;
      if (!categoryMap.has(nv.category)) {
        categoryMap.set(nv.category, { scores: [], paramCount: 0 });
      }
      const entry = categoryMap.get(nv.category)!;
      entry.scores.push(nv.score);
      entry.paramCount += 1;
    }

    // Step 3: Compute category scores (simple average of param scores within category)
    const pillars: PillarScore[] = [];

    for (const [pillar, categoryMap] of pillarMap) {
      const categories: CategoryScore[] = [];

      for (const [category, { scores, paramCount }] of categoryMap) {
        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;

        categories.push({
          pillar,
          category,
          score: avgScore,
          paramCount,
        });
      }

      // Step 4: Compute pillar score (weighted average of category scores)
      let pillarScore: number;
      const totalWeight = categories.reduce(
        (sum, cat) => sum + resolveWeight(pillar, cat.category, weightRows),
        0
      );

      if (totalWeight > 0) {
        const weightedSum = categories.reduce(
          (sum, cat) =>
            sum + cat.score * resolveWeight(pillar, cat.category, weightRows),
          0
        );
        pillarScore = Math.round(weightedSum / totalWeight);
      } else {
        // Equal weight fallback
        pillarScore =
          categories.length > 0
            ? Math.round(
                categories.reduce((sum, cat) => sum + cat.score, 0) /
                  categories.length
              )
            : 0;
      }

      pillars.push({
        pillar,
        score: pillarScore,
        categoryCount: categories.length,
        categories,
      });
    }

    // Step 5: Compute overall score (weighted average of pillar scores)
    let overall: number;
    const totalPillarWeight = pillars.reduce(
      (sum, p) => sum + resolvePillarWeight(p.pillar, weightRows),
      0
    );

    if (totalPillarWeight > 0 && pillars.length > 0) {
      const weightedSum = pillars.reduce(
        (sum, p) =>
          sum + p.score * resolvePillarWeight(p.pillar, weightRows),
        0
      );
      overall = Math.round(weightedSum / totalPillarWeight);
    } else {
      // Equal weight fallback
      overall =
        pillars.length > 0
          ? Math.round(
              pillars.reduce((sum, p) => sum + p.score, 0) / pillars.length
            )
          : 0;
    }

    return {
      overall,
      pillars,
      nodeId,
      periodId,
      parameterCount: normalizedValues.length,
    };
  },

  /**
   * Get pre-computed scores from the materialized view.
   * Falls back to live computation if MV is empty.
   */
  async getScores(
    tenantId: string,
    nodeId: string,
    periodId: string
  ): Promise<ScoreBreakdown> {
    try {
      const cached = await scoringRepository.getScores(
        tenantId,
        nodeId,
        periodId
      );

      if (cached.length > 0) {
        return this.buildBreakdownFromMV(cached, nodeId, periodId);
      }
    } catch {
      // MV may not exist yet; fall through to live computation
      logger.warn('esg_scores materialized view query failed, computing live', {
        tenantId,
        nodeId,
        periodId,
      });
    }

    // Fallback: live computation
    return this.computeScores(tenantId, nodeId, periodId);
  },

  /**
   * Build a ScoreBreakdown from materialized view rows.
   */
  buildBreakdownFromMV(
    rows: EsgScoreRow[],
    nodeId: string,
    periodId: string
  ): ScoreBreakdown {
    const pillarMap = new Map<string, PillarScore>();

    for (const row of rows) {
      if (!pillarMap.has(row.pillar)) {
        pillarMap.set(row.pillar, {
          pillar: row.pillar,
          score: Number(row.pillarScore),
          categoryCount: 0,
          categories: [],
        });
      }

      const pillarEntry = pillarMap.get(row.pillar)!;
      pillarEntry.categories.push({
        pillar: row.pillar,
        category: row.category,
        score: Number(row.categoryScore),
        paramCount: Number(row.paramCount) || 0,
      });
      pillarEntry.categoryCount = pillarEntry.categories.length;
    }

    const pillars = Array.from(pillarMap.values());

    // Overall from first row (same for all rows of same node/period)
    const overall = rows.length > 0 ? Number(rows[0].overallScore) : 0;

    // Sum param counts across all categories for total
    const parameterCount = pillars.reduce(
      (sum, p) => sum + p.categories.reduce((s, c) => s + c.paramCount, 0),
      0
    );

    return {
      overall,
      pillars,
      nodeId,
      periodId,
      parameterCount,
    };
  },
};
