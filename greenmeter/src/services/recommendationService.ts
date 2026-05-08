import { db } from '@/db';
import { kpiValues, kpiParameters } from '@/db/schema/kpi';
import { thresholds, recommendations } from '@/db/schema/config';
import { tenants, reportingPeriods } from '@/db/schema/tenants';
import { recommendationRepository, type RecommendationInsert, type RecommendationRow } from '@/db/repositories/recommendationRepository';
import { createLlmClient } from '@/lib/llm';
import { logger } from '@/lib/logger';
import { eq, and, sql, desc } from 'drizzle-orm';

interface ValueWithThreshold {
  paramId: string;
  paramName: string;
  value: number;
  redMax: number;
  amberMax: number;
  direction: string;
  pillar: string;
  category: string | null;
  unit: string;
}

const LLM_SYSTEM_PROMPT = `You are an ESG improvement advisor. Given a metric that is underperforming, provide a concise, actionable recommendation for improvement. Return ONLY a JSON object with this shape:
{ "recommendation": "string (1-2 sentences of actionable advice)", "confidence": number (0-100) }
Do not include any other text.`;

/**
 * Determine priority level based on how far value is from thresholds.
 */
function determinePriority(
  value: number,
  redMax: number,
  amberMax: number,
  direction: string
): 'critical' | 'warning' | 'info' {
  if (direction === 'lower_is_better') {
    if (amberMax <= 0) return 'warning'; // Zero threshold — degenerate; default to warning
    if (value > amberMax * 1.5) return 'critical';
    if (value > amberMax) return 'warning';
    return 'info';
  }
  // higher_is_better: Lower value = worse. Value < redMax is in "poor" band
  if (redMax <= 0) return 'warning'; // Zero threshold — degenerate; default to warning
  if (value < redMax * 0.5) return 'critical';
  if (value < redMax) return 'warning';
  return 'info';
}

/**
 * Check if a value is in the "poor" band based on thresholds and direction.
 */
function isInPoorBand(
  value: number,
  redMax: number,
  amberMax: number,
  direction: string
): boolean {
  if (direction === 'lower_is_better') {
    if (amberMax <= 0) return false; // Zero threshold — skip to avoid alert flooding
    return value > amberMax;
  }
  if (redMax <= 0) return false; // Zero threshold — skip to avoid silent suppression
  return value < redMax;
}

export const recommendationService = {
  /**
   * Generate rule-based alert recommendations for a tenant.
   * Queries KPI values, joins with thresholds, identifies values in the "poor" band.
   */
  async generateRuleBasedAlerts(tenantId: string): Promise<RecommendationInsert[]> {
    const alerts: RecommendationInsert[] = [];

    // Get the most recent active period for this tenant
    const periods = await db
      .select()
      .from(reportingPeriods)
      .where(
        and(
          eq(reportingPeriods.tenantId, tenantId),
          eq(reportingPeriods.active, true)
        )
      )
      .orderBy(desc(reportingPeriods.endDate))
      .limit(1);

    if (periods.length === 0) {
      logger.info('No active reporting period found for tenant', { tenantId });
      return alerts;
    }

    const periodId = periods[0].periodId;

    // Get all KPI values with their parameters for this tenant/period
    const valuesWithParams = await db
      .select({
        paramId: kpiParameters.paramId,
        paramName: kpiParameters.name,
        value: kpiValues.value,
        direction: kpiParameters.direction,
        pillar: kpiParameters.pillar,
        category: kpiParameters.category,
        unit: kpiParameters.unit,
      })
      .from(kpiValues)
      .innerJoin(
        kpiParameters,
        and(
          eq(kpiValues.paramId, kpiParameters.paramId),
          eq(kpiValues.tenantId, kpiParameters.tenantId)
        )
      )
      .where(
        and(
          eq(kpiValues.tenantId, tenantId),
          eq(kpiValues.periodId, periodId),
          eq(kpiValues.notApplicable, false),
          sql`${kpiValues.value} IS NOT NULL`
        )
      );

    if (valuesWithParams.length === 0) {
      logger.info('No KPI values found for rule-based alerts', { tenantId, periodId });
      return alerts;
    }

    // Get all thresholds for this tenant (tenant overrides + platform defaults)
    const allThresholds = await db
      .select()
      .from(thresholds)
      .where(
        sql`${thresholds.tenantId} = ${tenantId} OR ${thresholds.tenantId} IS NULL`
      )
      .orderBy(
        // Tenant-specific first
        sql`CASE WHEN ${thresholds.tenantId} IS NOT NULL THEN 0 ELSE 1 END`
      );

    // Build threshold lookup: param-specific → category-level → pillar-level → default
    const DEFAULT_RED_MAX = 30;
    const DEFAULT_AMBER_MAX = 60;

    for (const vp of valuesWithParams) {
      if (vp.value == null) continue;
      const numValue = Number(vp.value);
      if (isNaN(numValue)) continue;

      const direction = vp.direction ?? 'lower_is_better';

      // Resolve threshold for this parameter
      let redMax = DEFAULT_RED_MAX;
      let amberMax = DEFAULT_AMBER_MAX;

      // Priority: param-specific > category > pillar > default
      const paramThreshold = allThresholds.find((t) => t.paramId === vp.paramId);
      const categoryThreshold = allThresholds.find(
        (t) => !t.paramId && t.category === vp.category && t.pillar === vp.pillar
      );
      const pillarThreshold = allThresholds.find(
        (t) => !t.paramId && !t.category && t.pillar === vp.pillar
      );

      const resolved = paramThreshold ?? categoryThreshold ?? pillarThreshold;
      if (resolved) {
        redMax = resolved.redMax != null ? Number(resolved.redMax) : DEFAULT_RED_MAX;
        amberMax = resolved.amberMax != null ? Number(resolved.amberMax) : DEFAULT_AMBER_MAX;
      }

      if (isInPoorBand(numValue, redMax, amberMax, direction)) {
        const priority = determinePriority(numValue, redMax, amberMax, direction);
        const thresholdRef = direction === 'lower_is_better' ? amberMax : redMax;

        const directionLabel = direction === 'lower_is_better' ? 'below' : 'above';
        const targetLabel = direction === 'lower_is_better'
          ? `needs to be ${directionLabel} ${amberMax}`
          : `needs to be ${directionLabel} ${redMax}`;

        alerts.push({
          tenantId,
          paramId: vp.paramId,
          metric: vp.paramName,
          recommendationText: `${vp.paramName} is at ${numValue} ${vp.unit} — ${targetLabel} ${vp.unit} to exit the poor band.`,
          priority,
          source: 'rule',
          currentValue: numValue,
          thresholdValue: thresholdRef,
          pillar: vp.pillar,
          category: vp.category,
        });
      }
    }

    return alerts;
  },

  /**
   * Generate LLM-powered recommendations for underperforming metrics.
   * Selects bottom-performing metrics and asks the LLM for improvement suggestions.
   * Gracefully degrades if LLM is unavailable.
   */
  async generateLlmRecommendations(
    tenantId: string,
    ruleAlerts: RecommendationInsert[]
  ): Promise<RecommendationInsert[]> {
    const llmRecommendations: RecommendationInsert[] = [];

    // Only generate LLM recommendations for the top N worst-performing metrics
    const MAX_LLM_RECOMMENDATIONS = 5;
    const candidates = ruleAlerts
      .filter((a) => a.priority === 'critical' || a.priority === 'warning')
      .slice(0, MAX_LLM_RECOMMENDATIONS);

    if (candidates.length === 0) {
      logger.info('No candidates for LLM recommendations', { tenantId });
      return llmRecommendations;
    }

    let llmClient;
    try {
      llmClient = createLlmClient();
    } catch (error) {
      logger.warn('LLM client creation failed — skipping LLM recommendations', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return llmRecommendations;
    }

    for (const candidate of candidates) {
      try {
        const userPrompt = `Metric: ${candidate.metric}
Current value: ${candidate.currentValue} (threshold: ${candidate.thresholdValue})
Pillar: ${candidate.pillar ?? 'Unknown'}
Category: ${candidate.category ?? 'General'}
Priority: ${candidate.priority}

Suggest improvements for this ESG metric.`;

        const response = await llmClient.complete(LLM_SYSTEM_PROMPT, userPrompt, {
          temperature: 0.3,
          maxTokens: 256,
        });

        // Parse LLM response
        const parsed = parseLlmResponse(response);
        if (parsed) {
          llmRecommendations.push({
            tenantId,
            paramId: candidate.paramId,
            metric: candidate.metric,
            recommendationText: parsed.recommendation,
            priority: candidate.priority,
            confidence: parsed.confidence,
            source: 'llm',
            currentValue: candidate.currentValue,
            thresholdValue: candidate.thresholdValue,
            pillar: candidate.pillar,
            category: candidate.category,
          });
        }
      } catch (error) {
        logger.warn('LLM recommendation failed for metric — continuing with others', {
          tenantId,
          metric: candidate.metric,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return llmRecommendations;
  },

  /**
   * Run the full recommendation pipeline for a tenant:
   * 1. Delete old recommendations
   * 2. Generate rule-based alerts
   * 3. Generate LLM recommendations (graceful degradation)
   * 4. Store all recommendations
   */
  async generateForTenant(tenantId: string): Promise<number> {
    // Step 1: Rule-based alerts (reads — outside transaction to minimize tx duration)
    const ruleAlerts = await this.generateRuleBasedAlerts(tenantId);
    logger.info('Generated rule-based alerts', { tenantId, count: ruleAlerts.length });

    // Step 2: LLM recommendations (network calls — outside transaction)
    let llmRecs: RecommendationInsert[] = [];
    try {
      llmRecs = await this.generateLlmRecommendations(tenantId, ruleAlerts);
      logger.info('Generated LLM recommendations', { tenantId, count: llmRecs.length });
    } catch (error) {
      logger.warn('LLM recommendation generation failed — proceeding with rule-based only', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Step 3: Atomic swap — delete old + insert new in a single transaction
    const allRecs = [...ruleAlerts, ...llmRecs];
    const inserted = await db.transaction(async (tx) => {
      // Set tenant context within transaction for RLS
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

      // Delete old recommendations
      const deleted = await tx
        .delete(recommendations)
        .where(eq(recommendations.tenantId, tenantId))
        .returning({ id: recommendations.recommendationId });
      logger.info('Expired old recommendations', { tenantId, deleted: deleted.length });

      if (allRecs.length === 0) return 0;

      // Insert new recommendations in chunks to stay under PG parameter limits
      const CHUNK_SIZE = 500;
      let totalInserted = 0;
      for (let i = 0; i < allRecs.length; i += CHUNK_SIZE) {
        const chunk = allRecs.slice(i, i + CHUNK_SIZE);
        const values = chunk.map((item) => ({
          tenantId: item.tenantId,
          paramId: item.paramId ?? null,
          metric: item.metric,
          recommendationText: item.recommendationText,
          priority: item.priority,
          confidence: item.confidence != null ? String(item.confidence) : null,
          source: item.source,
          currentValue: item.currentValue != null ? String(item.currentValue) : null,
          thresholdValue: item.thresholdValue != null ? String(item.thresholdValue) : null,
          pillar: item.pillar ?? null,
          category: item.category ?? null,
        }));
        const result = await tx
          .insert(recommendations)
          .values(values)
          .returning({ id: recommendations.recommendationId });
        totalInserted += result.length;
      }
      return totalInserted;
    });

    logger.info('Stored recommendations', { tenantId, total: inserted, rule: ruleAlerts.length, llm: llmRecs.length });
    return inserted;
  },

  /**
   * Get recommendations for a tenant (for display in AlertsPanel).
   */
  async getRecommendations(tenantId: string, limit = 20): Promise<RecommendationRow[]> {
    return recommendationRepository.getByTenant(tenantId, limit);
  },
};

/**
 * Parse LLM response into a structured recommendation.
 */
function parseLlmResponse(response: string): { recommendation: string; confidence: number } | null {
  try {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    if (
      typeof parsed.recommendation === 'string' &&
      parsed.recommendation.length > 0 &&
      typeof parsed.confidence === 'number'
    ) {
      return {
        recommendation: parsed.recommendation,
        confidence: Math.max(0, Math.min(100, parsed.confidence)),
      };
    }
    logger.warn('LLM response JSON missing required fields', { response: response.substring(0, 200) });
    return null;
  } catch {
    logger.warn('LLM response is not valid JSON', { response: response.substring(0, 200) });
    return null;
  }
}
