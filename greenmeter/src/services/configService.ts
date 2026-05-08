import { configRepository } from '@/db/repositories/configRepository';
import type {
  ThresholdRow,
  ThresholdWithParam,
  WeightRow,
  UpsertThresholdInput,
  UpsertWeightInput,
} from '@/db/repositories/configRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { submitJob } from '@/jobs';
import type { ScoreRecomputeJobData } from '@/jobs/scoreRecompute';

/** Merged threshold: platform default with optional tenant override applied */
export interface MergedThreshold {
  thresholdId: string;
  paramId: string | null;
  paramName: string | null;
  paramCode: string | null;
  category: string | null;
  pillar: string | null;
  redMax: string | null;
  amberMax: string | null;
  unit: string | null;
  source: 'platform' | 'tenant';
}

/** Merged weight entry */
export interface MergedWeight {
  weightId: string;
  pillar: string;
  category: string;
  weight: string;
  source: 'platform' | 'tenant';
}

/** Structured weight output for API response */
export interface WeightsByLevel {
  categories: MergedWeight[];
  pillars: MergedWeight[];
}

/**
 * Generates a unique key for a threshold scope (paramId + category + pillar).
 */
function thresholdScopeKey(row: { paramId: string | null; category: string | null; pillar: string | null }): string {
  return `${row.paramId ?? '_'}|${row.category ?? '_'}|${row.pillar ?? '_'}`;
}

/**
 * Generates a unique key for a weight scope (pillar + category).
 */
function weightScopeKey(row: { pillar: string; category: string }): string {
  return `${row.pillar}|${row.category}`;
}

export const configService = {
  /**
   * Get merged thresholds for a tenant.
   * Tenant overrides take precedence over platform defaults (by matching scope key).
   */
  async getThresholds(tenantId: string): Promise<MergedThreshold[]> {
    const rows = await configRepository.getThresholdsWithParams(tenantId);

    // Build map: scope key → best threshold (tenant wins over platform)
    const merged = new Map<string, MergedThreshold>();

    for (const row of rows) {
      const key = thresholdScopeKey(row);
      const source: 'platform' | 'tenant' = row.tenantId ? 'tenant' : 'platform';

      // Tenant rows come first in the ordering, so first occurrence wins
      if (!merged.has(key)) {
        merged.set(key, {
          thresholdId: row.thresholdId,
          paramId: row.paramId,
          paramName: row.paramName,
          paramCode: row.paramCode,
          category: row.category,
          pillar: row.pillar,
          redMax: row.redMax,
          amberMax: row.amberMax,
          unit: row.unit,
          source,
        });
      }
    }

    return Array.from(merged.values());
  },

  /**
   * Upsert a tenant-specific threshold override.
   * Returns old and new values for audit logging.
   */
  async upsertThreshold(
    tenantId: string,
    input: UpsertThresholdInput
  ): Promise<{ oldValue: ThresholdRow | null; newValue: ThresholdRow }> {
    // Validate redMax <= amberMax
    const redMax = Number(input.redMax);
    const amberMax = Number(input.amberMax);

    if (isNaN(redMax) || isNaN(amberMax)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'redMax and amberMax must be valid numbers',
        400
      );
    }

    if (redMax > amberMax) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Red threshold must be less than or equal to amber threshold',
        400
      );
    }

    const result = await configRepository.upsertThreshold(tenantId, input);

    logger.info('Threshold override saved', {
      tenantId,
      thresholdId: result.newValue.thresholdId,
      paramId: input.paramId ?? null,
      category: input.category ?? null,
      pillar: input.pillar ?? null,
    });

    return result;
  },

  /**
   * Get merged weights for a tenant, structured by level.
   * Category weights have specific category values.
   * Pillar weights use category='_overall'.
   */
  async getWeights(tenantId: string): Promise<WeightsByLevel> {
    const rows = await configRepository.getWeights(tenantId);

    // Build map: scope key → best weight (tenant wins over platform)
    const merged = new Map<string, MergedWeight>();

    for (const row of rows) {
      const key = weightScopeKey(row);
      const source: 'platform' | 'tenant' = row.tenantId ? 'tenant' : 'platform';

      if (!merged.has(key)) {
        merged.set(key, {
          weightId: row.weightId,
          pillar: row.pillar,
          category: row.category,
          weight: row.weight,
          source,
        });
      }
    }

    const allWeights = Array.from(merged.values());

    return {
      categories: allWeights.filter((w) => w.category !== '_overall'),
      pillars: allWeights.filter((w) => w.category === '_overall'),
    };
  },

  /**
   * Save tenant-specific weight overrides.
   * Validates that category weights sum to 100% per pillar and pillar weights sum to 100%.
   * Triggers a score-recompute job after saving.
   */
  async saveWeights(
    tenantId: string,
    userId: string,
    weights: UpsertWeightInput[]
  ): Promise<{ oldValues: WeightRow[]; newValues: WeightRow[] }> {
    // Validate individual weight values first (prevents NaN propagation in sum checks)
    for (const w of weights) {
      const val = Number(w.weight);
      if (isNaN(val) || val < 0 || val > 100) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          `Weight value "${w.weight}" for ${w.pillar}/${w.category} must be between 0 and 100`,
          400
        );
      }
    }

    // Check for duplicate category/pillar entries
    const seen = new Set<string>();
    for (const w of weights) {
      const key = `${w.pillar}|${w.category}`;
      if (seen.has(key)) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          `Duplicate weight entry for ${w.pillar}/${w.category}`,
          400
        );
      }
      seen.add(key);
    }

    // Separate into category weights and pillar weights
    const categoryWeights = weights.filter((w) => w.category !== '_overall');
    const pillarWeights = weights.filter((w) => w.category === '_overall');

    // Validate category weights sum to 100% per pillar
    const categoryByPillar = new Map<string, number>();
    for (const w of categoryWeights) {
      const current = categoryByPillar.get(w.pillar) ?? 0;
      categoryByPillar.set(w.pillar, current + Number(w.weight));
    }

    for (const [pillar, sum] of categoryByPillar) {
      if (Math.abs(sum - 100) > 0.01) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          `Category weights for pillar "${pillar}" sum to ${sum.toFixed(2)}%, must equal 100%`,
          400
        );
      }
    }

    // Validate pillar weights sum to 100%
    if (pillarWeights.length > 0) {
      const pillarSum = pillarWeights.reduce((sum, w) => sum + Number(w.weight), 0);
      if (Math.abs(pillarSum - 100) > 0.01) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          `Pillar weights sum to ${pillarSum.toFixed(2)}%, must equal 100%`,
          400
        );
      }
    }

    const result = await configRepository.replaceWeights(tenantId, weights);

    logger.info('Weights saved', {
      tenantId,
      categoryCount: categoryWeights.length,
      pillarCount: pillarWeights.length,
    });

    // Trigger score-recompute job
    await enqueueScoreRecompute(tenantId, userId);

    return result;
  },
};

/**
 * Enqueue a score-recompute job after weight changes.
 * Non-blocking — does not fail the weight save if job submission fails.
 */
async function enqueueScoreRecompute(
  tenantId: string,
  triggeredBy: string
): Promise<void> {
  try {
    await submitJob<ScoreRecomputeJobData>('score-recompute', {
      tenantId,
      periodId: '', // empty periodId signals "recompute all periods"
      triggeredBy,
    }, {
      singletonKey: `score-recompute-weights-${tenantId}`,
    });

    logger.info('Score recompute job queued after weight change', { tenantId });
  } catch (err: unknown) {
    logger.error('Failed to enqueue score-recompute job after weight change', {
      error: err instanceof Error ? err.message : String(err),
      tenantId,
    });
  }
}
