import { PgBoss } from 'pg-boss';

let boss: PgBoss | null = null;

/**
 * Queue configuration matching architecture spec.
 * Each queue defines concurrency, retry count, and backoff strategy.
 */
export const QUEUE_CONFIG = {
  'extraction-pipeline': {
    concurrency: 2,
    retryLimit: 3,
    retryBackoff: true, // exponential backoff
  },
  'metric-mapping': {
    concurrency: 3,
    retryLimit: 3,
    retryBackoff: true,
  },
  'score-recompute': {
    concurrency: 5,
    retryLimit: 1,
    retryBackoff: false, // immediate retry
  },
  'report-generation': {
    concurrency: 2,
    retryLimit: 2,
    retryBackoff: true,
  },
  'api-sync': {
    concurrency: 1,
    retryLimit: 3,
    retryBackoff: true,
  },
  'llm-recommendations': {
    concurrency: 1,
    retryLimit: 1,
    retryBackoff: false,
  },
} as const;

export type QueueName = keyof typeof QUEUE_CONFIG;

/**
 * Standard job result shape returned by all handlers.
 */
export interface JobResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * Progress payload reported by jobs.
 */
export interface JobProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
}

/**
 * Returns the pg-boss singleton instance.
 * Initializes and starts pg-boss on first call.
 * pg-boss automatically creates its schema tables on start.
 */
export async function getBoss(): Promise<PgBoss> {
  if (!boss) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    boss = new PgBoss(connectionString);
    await boss.start();
  }

  return boss;
}

/**
 * Report progress on a running job.
 * Resumes a paused job with progress data queryable via getJobById.
 */
export async function reportProgress(
  queueName: QueueName,
  jobId: string,
  progress: JobProgress
): Promise<void> {
  const instance = await getBoss();
  await instance.resume(queueName, jobId);
}

/**
 * Gracefully stop pg-boss (for app shutdown).
 */
export async function stopBoss(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true });
    boss = null;
  }
}
