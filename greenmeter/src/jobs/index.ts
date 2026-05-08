import type { Job } from 'pg-boss';
import { getBoss, QUEUE_CONFIG, type QueueName } from '@/lib/pgBoss';
import { handleExtractionPipeline } from './extractionPipeline';
import { handleMetricMapping } from './metricMapping';
import { handleScoreRecompute } from './scoreRecompute';
import { handleReportGeneration } from './reportGeneration';
import { handleApiSync } from './apiSync';
import type { ApiSyncJobData } from './apiSync';
import { handleLlmRecommendations } from './llmRecommendations';
import { db } from '@/db';
import { tenantConfig } from '@/db/schema/config';
import { like } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import type { IntegrationConfigValue, IntegrationType } from '@/schemas/integration';

type JobHandler = (jobs: Job<never>[]) => Promise<unknown>;

/**
 * Map of queue names to their handler functions.
 */
const handlers: Record<QueueName, JobHandler> = {
  'extraction-pipeline': handleExtractionPipeline as JobHandler,
  'metric-mapping': handleMetricMapping as JobHandler,
  'score-recompute': handleScoreRecompute as JobHandler,
  'report-generation': handleReportGeneration as JobHandler,
  'api-sync': handleApiSync as JobHandler,
  'llm-recommendations': handleLlmRecommendations as JobHandler,
};

/**
 * Cron schedules for recurring jobs.
 * Format: standard cron expression (minute hour day month weekday).
 */
const CRON_SCHEDULES: { queue: QueueName; cron: string; data: Record<string, unknown> }[] = [
  {
    queue: 'llm-recommendations',
    cron: '0 2 * * *', // Every day at 2:00 AM
    data: { scope: 'full' }, // No tenantId = process all active tenants
  },
];

/**
 * Register all job handlers with pg-boss.
 * Called once during application initialization.
 * Each queue is configured with its specific concurrency and retry settings.
 */
export async function registerAllJobs(): Promise<void> {
  const boss = await getBoss();

  const queueNames = Object.keys(QUEUE_CONFIG) as QueueName[];

  for (const queueName of queueNames) {
    const config = QUEUE_CONFIG[queueName];
    const handler = handlers[queueName];

    await boss.work(
      queueName,
      { localConcurrency: config.concurrency },
      handler
    );
  }

  // Register cron schedules
  for (const schedule of CRON_SCHEDULES) {
    await boss.schedule(schedule.queue, schedule.cron, schedule.data);
  }
}

/**
 * Submit a job to a queue.
 * Applies the queue's retry configuration automatically.
 */
export async function submitJob<T extends object>(
  queueName: QueueName,
  data: T,
  options?: { priority?: number; startAfter?: Date | string; singletonKey?: string }
): Promise<string | null> {
  const boss = await getBoss();
  const config = QUEUE_CONFIG[queueName];

  return boss.send(queueName, data, {
    retryLimit: config.retryLimit,
    retryBackoff: config.retryBackoff,
    priority: options?.priority,
    startAfter: options?.startAfter,
    singletonKey: options?.singletonKey,
  });
}

/**
 * Get the status and progress of a job by ID.
 */
export async function getJobStatus(queueName: QueueName, jobId: string) {
  const boss = await getBoss();
  return boss.getJobById(queueName, jobId);
}

/**
 * Register API sync cron schedules from tenant integration configs.
 * Reads all enabled integration configs with cron schedules and registers
 * them with pg-boss. Each schedule uses a singletonKey to prevent duplicate
 * scheduling across restarts.
 *
 * Called during application initialization after registerAllJobs().
 */
export async function registerApiSyncSchedules(): Promise<void> {
  const boss = await getBoss();

  try {
    const configs = await db
      .select()
      .from(tenantConfig)
      .where(like(tenantConfig.key, 'integration_%'));

    let registered = 0;

    for (const row of configs) {
      const value = row.value as IntegrationConfigValue;
      if (!value.enabled || !value.scheduleCron) continue;

      // Extract integration type from key: 'integration_sap' → 'sap'
      const integrationType = row.key.replace('integration_', '') as IntegrationType;

      // Skip LLM integrations — they don't have api-sync jobs
      if (integrationType === 'llm') continue;

      const jobData: ApiSyncJobData = {
        tenantId: row.tenantId,
        integrationType,
      };

      await boss.schedule(
        'api-sync',
        value.scheduleCron,
        jobData as unknown as object,
        {
          key: `${row.tenantId}-${integrationType}`,
        }
      );

      registered++;

      logger.info('Registered API sync cron schedule', {
        tenantId: row.tenantId,
        integrationType,
        cron: value.scheduleCron,
      });
    }

    logger.info('API sync schedule registration complete', { registered });
  } catch (err: unknown) {
    logger.error('Failed to register API sync schedules', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
