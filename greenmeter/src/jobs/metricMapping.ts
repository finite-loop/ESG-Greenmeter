import type { Job } from 'pg-boss';
import type { JobResult, JobProgress } from '@/lib/pgBoss';
import { reportProgress } from '@/lib/pgBoss';
import { db, setTenantContext } from '@/db';
import { rawExtractions, extractedMetrics, peerKpiValues, unmappedMetrics } from '@/db/schema/extraction';
import { documents } from '@/db/schema/extraction';
import { metricAliases, metricMappingRules } from '@/db/schema/mapping';
import { kpiParameters } from '@/db/schema/kpi';
import { parameterRepository } from '@/db/repositories/parameterRepository';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import {
  mapMetric,
  classifyMappingResult,
  DEFAULT_THRESHOLDS,
  type ExtractedMetricRow,
  type AliasRow,
  type MappingRuleRow,
  type MappingThresholds,
} from '@/services/mappingService';

export interface MetricMappingJobData {
  extractionId: string;
  tenantId: string;
}

export interface MetricMappingJobResult {
  mappedCount: number;
  unmappedCount: number;
  reviewCount: number;
}

/**
 * Pipeline stages for progress reporting.
 */
const STAGES = {
  initializing: { progress: 0, message: 'Starting metric mapping' },
  loading: { progress: 10, message: 'Loading extraction data and parameters' },
  mapping: { progress: 30, message: 'Running mapping cascade' },
  persisting: { progress: 80, message: 'Saving mapping results' },
  complete: { progress: 100, message: 'Mapping complete' },
} as const;

type StageName = keyof typeof STAGES;

async function updateProgress(jobId: string, stage: StageName): Promise<void> {
  try {
    const stageInfo = STAGES[stage];
    const progress: JobProgress = {
      stage,
      progress: stageInfo.progress,
      message: stageInfo.message,
    };
    await reportProgress('metric-mapping', jobId, progress);
  } catch (err) {
    logger.warn('Failed to report mapping job progress (non-fatal)', {
      jobId,
      stage,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Batch insert helper to stay within PostgreSQL parameter limits.
 */
const BATCH_SIZE = 500;

/**
 * Processes a single metric mapping job:
 *   1. Load extraction + extracted_metrics
 *   2. Load parameters, aliases, rules for matching
 *   3. Run 4-stage cascade for each metric
 *   4. Route results by confidence threshold
 *   5. Update extraction record with mapped_count
 */
async function processMappingJob(
  job: Job<MetricMappingJobData>
): Promise<MetricMappingJobResult> {
  const { extractionId, tenantId } = job.data;

  // Set tenant context for RLS
  await setTenantContext(tenantId);

  // 1. Load extraction record
  await updateProgress(job.id, 'loading');

  const extractionRows = await db
    .select()
    .from(rawExtractions)
    .where(eq(rawExtractions.extractionId, extractionId))
    .limit(1);

  const extraction = extractionRows[0];
  if (!extraction) {
    throw new Error(`Extraction not found: ${extractionId}`);
  }

  // Load the document to get peerId
  let peerId: string | null = null;
  if (extraction.docId) {
    const docRows = await db
      .select({ peerId: documents.peerId })
      .from(documents)
      .where(eq(documents.docId, extraction.docId))
      .limit(1);
    peerId = docRows[0]?.peerId ?? null;
  }

  // Load all extracted metrics for this extraction
  const metrics = await db
    .select()
    .from(extractedMetrics)
    .where(eq(extractedMetrics.extractionId, extractionId));

  if (metrics.length === 0) {
    logger.info('No metrics to map for extraction', { extractionId });
    await db
      .update(rawExtractions)
      .set({ status: 'mapped', mappedCount: 0 })
      .where(eq(rawExtractions.extractionId, extractionId));
    return { mappedCount: 0, unmappedCount: 0, reviewCount: 0 };
  }

  logger.info('Loading matching data for mapping', {
    extractionId,
    metricCount: metrics.length,
    standard: extraction.standard,
  });

  // 2. Load parameters, aliases, and rules
  const parameters = await parameterRepository.findAllForMatching(tenantId);

  const aliasRows = await db.select().from(metricAliases);
  const aliases: AliasRow[] = aliasRows.map((a) => ({
    aliasId: a.aliasId,
    paramId: a.paramId,
    aliasText: a.aliasText,
    standard: a.standard,
  }));

  const ruleRows = await db
    .select()
    .from(metricMappingRules)
    .where(eq(metricMappingRules.active, true));
  const rules: MappingRuleRow[] = ruleRows.map((r) => ({
    ruleId: r.ruleId,
    standard: r.standard,
    sectionPattern: r.sectionPattern,
    metricPattern: r.metricPattern,
    targetParamId: r.targetParamId,
    priority: r.priority,
    active: r.active,
  }));

  // TODO: Load thresholds from tenant_config when configService is available
  const thresholds: MappingThresholds = { ...DEFAULT_THRESHOLDS };

  // 3. Run mapping cascade for each metric
  await updateProgress(job.id, 'mapping');

  let mappedCount = 0;
  let unmappedCount = 0;
  let reviewCount = 0;

  // Collect DB operations for batched persistence
  const metricUpdates: Array<{
    metricId: string;
    paramId: string | null;
    confidence: number;
    method: string;
    status: string;
  }> = [];
  const peerValuesToInsert: Array<typeof peerKpiValues.$inferInsert> = [];
  const unmappedToInsert: Array<typeof unmappedMetrics.$inferInsert> = [];

  for (const metric of metrics) {
    const metricRow: ExtractedMetricRow = {
      metricId: metric.metricId,
      extractionId: metric.extractionId,
      tenantId: metric.tenantId,
      standard: metric.standard,
      section: metric.section,
      topic: metric.topic,
      metricName: metric.metricName,
      metricValue: metric.metricValue,
      parsedValue: metric.parsedValue,
      unit: metric.unit,
      indicatorType: metric.indicatorType,
      additionalContext: metric.additionalContext,
    };

    const result = await mapMetric(metricRow, parameters, aliases, rules, thresholds);
    const classification = classifyMappingResult(result, thresholds);

    // Find the matched parameter to get canonicalId
    const matchedParam = result.paramId
      ? parameters.find((p) => p.paramId === result.paramId)
      : null;

    if (classification === 'auto_mapped') {
      // High confidence: auto-map and create peer_kpi_values
      mappedCount++;
      metricUpdates.push({
        metricId: metric.metricId,
        paramId: result.paramId,
        confidence: result.confidence,
        method: result.method,
        status: 'auto_mapped',
      });

      if (peerId && metric.parsedValue !== null && result.paramId) {
        peerValuesToInsert.push({
          tenantId,
          peerId,
          paramId: result.paramId,
          canonicalId: matchedParam?.canonicalId ?? null,
          fiscalYear: extraction.fiscalYear,
          value: metric.parsedValue,
          unit: metric.unit,
          sourceExtractionId: extractionId,
          sourceMetricId: metric.metricId,
          confidence: result.confidence.toString(),
        });
      }
    } else if (classification === 'auto_mapped_review') {
      // Medium confidence: auto-map but flag for review
      reviewCount++;
      metricUpdates.push({
        metricId: metric.metricId,
        paramId: result.paramId,
        confidence: result.confidence,
        method: result.method,
        status: 'auto_mapped', // stored as auto_mapped in DB, review is implicit from confidence range
      });
    } else {
      // Low confidence: unmapped
      unmappedCount++;
      metricUpdates.push({
        metricId: metric.metricId,
        paramId: null,
        confidence: result.confidence,
        method: result.method,
        status: 'unmatched',
      });

      unmappedToInsert.push({
        extractionId,
        tenantId,
        peerId,
        standard: metric.standard,
        section: metric.section,
        metricName: metric.metricName,
        parsedValue: metric.parsedValue,
        unit: metric.unit,
        fiscalYear: extraction.fiscalYear,
        pillarGuess: result.pillarGuess ?? null,
        categoryGuess: result.categoryGuess ?? null,
      });
    }
  }

  // 4. Persist results in a transaction
  await updateProgress(job.id, 'persisting');

  await db.transaction(async (tx) => {
    // Set tenant context inside the transaction for RLS
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

    // Clean up previous unmapped_metrics for this extraction (idempotent on retry)
    await tx
      .delete(unmappedMetrics)
      .where(eq(unmappedMetrics.extractionId, extractionId));

    // Update extracted_metrics mapping fields
    for (const update of metricUpdates) {
      await tx
        .update(extractedMetrics)
        .set({
          paramId: update.paramId,
          mappingConfidence: update.confidence.toString(),
          mappingMethod: update.method === 'none' ? null : update.method,
          mappingStatus: update.status,
          mappedAt: new Date(),
        })
        .where(eq(extractedMetrics.metricId, update.metricId));
    }

    // Insert peer_kpi_values in batches (skip duplicates with onConflictDoNothing)
    for (let i = 0; i < peerValuesToInsert.length; i += BATCH_SIZE) {
      const batch = peerValuesToInsert.slice(i, i + BATCH_SIZE);
      await tx
        .insert(peerKpiValues)
        .values(batch)
        .onConflictDoNothing({ target: [peerKpiValues.tenantId, peerKpiValues.peerId, peerKpiValues.paramId, peerKpiValues.fiscalYear] });
    }

    // Insert unmapped_metrics in batches
    for (let i = 0; i < unmappedToInsert.length; i += BATCH_SIZE) {
      const batch = unmappedToInsert.slice(i, i + BATCH_SIZE);
      await tx.insert(unmappedMetrics).values(batch);
    }

    // Update extraction record
    const totalMapped = mappedCount + reviewCount;
    const status = unmappedCount === 0
      ? 'mapped'
      : totalMapped === 0
        ? 'pending_mapping'
        : 'partially_mapped';

    await tx
      .update(rawExtractions)
      .set({ mappedCount: totalMapped, status })
      .where(eq(rawExtractions.extractionId, extractionId));
  });

  logger.info('Metric mapping completed', {
    extractionId,
    mappedCount,
    reviewCount,
    unmappedCount,
    total: metrics.length,
  });

  await updateProgress(job.id, 'complete');

  return { mappedCount, unmappedCount, reviewCount };
}

/**
 * pg-boss handler for the metric-mapping queue.
 * Processes each job sequentially through the mapping pipeline.
 */
export async function handleMetricMapping(
  jobs: Job<MetricMappingJobData>[]
): Promise<JobResult<MetricMappingJobResult>[]> {
  const results: JobResult<MetricMappingJobResult>[] = [];

  for (const job of jobs) {
    const { extractionId, tenantId } = job.data;

    try {
      await updateProgress(job.id, 'initializing');

      const result = await processMappingJob(job);

      results.push({ success: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Metric mapping job failed', {
        extractionId,
        tenantId,
        jobId: job.id,
        error: message,
      });

      // Try to update extraction status to failed
      try {
        await setTenantContext(tenantId);
        await db
          .update(rawExtractions)
          .set({ status: 'failed' })
          .where(eq(rawExtractions.extractionId, extractionId));
      } catch (updateErr) {
        logger.error('Failed to update extraction status after mapping failure', {
          extractionId,
          error: updateErr instanceof Error ? updateErr.message : String(updateErr),
        });
      }

      results.push({ success: false, error: message });
    }
  }

  return results;
}
