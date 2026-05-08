import { sql } from 'drizzle-orm';
import { getBoss, QUEUE_CONFIG, type QueueName } from '@/lib/pgBoss';
import type { QueueResult, JobWithMetadata } from 'pg-boss';

type Job = JobWithMetadata<object>;
import { logger } from '@/lib/logger';

export type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  status: ComponentStatus;
  message: string;
  latencyMs?: number;
}

export interface QueueMetrics {
  name: QueueName;
  queuedCount: number;
  activeCount: number;
  totalCount: number;
  deferredCount: number;
}

export interface FailedJob {
  id: string;
  queue: string;
  state: string;
  createdOn: Date;
  completedOn: Date | null;
  errorSummary: string;
}

export interface QueueDetailedMetrics extends QueueMetrics {
  completedLast24h: number;
  failedLast24h: number;
  avgProcessingTimeMs: number | null;
  recentFailedJobs: FailedJob[];
}

export interface HealthCheckResult {
  status: ComponentStatus;
  timestamp: string;
  components: {
    database: ComponentHealth;
    blobStorage: ComponentHealth;
    pgBoss: ComponentHealth;
  };
}

export interface SystemHealthResult extends HealthCheckResult {
  queues: QueueDetailedMetrics[];
}

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

function deriveOverallStatus(components: Record<string, ComponentHealth>): ComponentStatus {
  const statuses = Object.values(components).map((c) => c.status);
  if (statuses.some((s) => s === 'unhealthy')) return 'unhealthy';
  if (statuses.some((s) => s === 'degraded')) return 'degraded';
  return 'healthy';
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const { db } = await import('@/db');
    await withTimeout(db.execute(sql`SELECT 1`), HEALTH_CHECK_TIMEOUT_MS, 'Database check');
    return {
      status: 'healthy',
      message: 'Database connection successful',
      latencyMs: Date.now() - start,
    };
  } catch (error: unknown) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      latencyMs: Date.now() - start,
    };
  }
}

async function checkBlobStorage(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return {
        status: 'degraded',
        message: 'Blob storage not configured',
        latencyMs: Date.now() - start,
      };
    }

    const { BlobServiceClient } = await import('@azure/storage-blob');
    const client = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = client.getContainerClient('documents');
    const exists = await withTimeout(
      containerClient.exists(),
      HEALTH_CHECK_TIMEOUT_MS,
      'Blob storage check'
    );

    return {
      status: exists ? 'healthy' : 'degraded',
      message: exists
        ? 'Blob storage container accessible'
        : 'Documents container does not exist',
      latencyMs: Date.now() - start,
    };
  } catch (error: unknown) {
    logger.error('Blob storage health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 'unhealthy',
      message: 'Blob storage check failed',
      latencyMs: Date.now() - start,
    };
  }
}

async function checkPgBoss(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const boss = await getBoss();
    const queues = await withTimeout(
      boss.getQueues(),
      HEALTH_CHECK_TIMEOUT_MS,
      'pg-boss check'
    );
    return {
      status: 'healthy',
      message: `pg-boss connected, ${queues.length} queues registered`,
      latencyMs: Date.now() - start,
    };
  } catch (error: unknown) {
    logger.error('pg-boss health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 'unhealthy',
      message: 'pg-boss check failed',
      latencyMs: Date.now() - start,
    };
  }
}

const SENSITIVE_PATTERNS = /\b(\d{1,3}\.){3}\d{1,3}\b|password|credential|secret|token|apikey|connectionstring/gi;

function sanitizeErrorSummary(output: unknown): string {
  if (output == null) return 'No error details';
  let msg: string;
  if (typeof output === 'string') {
    msg = output;
  } else if (typeof output === 'object' && output !== null) {
    const obj = output as Record<string, unknown>;
    msg = typeof obj.message === 'string'
      ? obj.message
      : typeof obj.error === 'string'
        ? obj.error
        : 'Job failed';
  } else {
    msg = String(output);
  }
  return msg.replace(SENSITIVE_PATTERNS, '[REDACTED]').substring(0, 100);
}

async function getQueueDetailedMetrics(): Promise<QueueDetailedMetrics[]> {
  let boss;
  try {
    boss = await getBoss();
  } catch (error: unknown) {
    logger.error('Failed to connect to pg-boss for queue metrics', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  const queueNames = Object.keys(QUEUE_CONFIG) as QueueName[];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const metricsPromises = queueNames.map(async (queueName): Promise<QueueDetailedMetrics> => {
    try {
      const perQueueWork = async () => {
        const stats: QueueResult = await boss.getQueueStats(queueName);

        // Single findJobs call, filter results in-memory
        const recentJobs: Job[] = await boss
          .findJobs<object>(queueName, { queued: false })
          .catch(() => []);

      // Limit to most recent 500 jobs to bound memory usage
      const boundedJobs = recentJobs.slice(0, 500);

      const completedLast24h = boundedJobs.filter(
        (j) => j.state === 'completed' && j.completedOn && new Date(j.completedOn) >= oneDayAgo
      ).length;

      const failedLast24h = boundedJobs.filter(
        (j) => j.state === 'failed' && j.completedOn && new Date(j.completedOn) >= oneDayAgo
      ).length;

      // Calculate avg processing time from completed jobs in last 24h
      const recentCompleted = boundedJobs.filter(
        (j): j is Job & { completedOn: Date } =>
          j.state === 'completed' &&
          j.startedOn != null &&
          j.completedOn != null &&
          new Date(j.completedOn) >= oneDayAgo
      );

      let avgProcessingTimeMs: number | null = null;
      if (recentCompleted.length > 0) {
        const totalMs = recentCompleted.reduce((sum, j) => {
          const started = new Date(j.startedOn).getTime();
          const completed = new Date(j.completedOn).getTime();
          return sum + (completed - started);
        }, 0);
        avgProcessingTimeMs = Math.round(totalMs / recentCompleted.length);
      }

      // Get recent failed jobs for display — strip data/output to avoid leaking sensitive payloads
      const recentFailedJobs: FailedJob[] = boundedJobs
        .filter((j) => j.state === 'failed')
        .slice(0, 10)
        .map((j) => ({
          id: j.id,
          queue: queueName,
          state: j.state,
          createdOn: new Date(j.createdOn),
          completedOn: j.completedOn ? new Date(j.completedOn) : null,
          errorSummary: sanitizeErrorSummary(j.output),
        }));

        return {
          name: queueName,
          queuedCount: stats.queuedCount,
          activeCount: stats.activeCount,
          totalCount: stats.totalCount,
          deferredCount: stats.deferredCount,
          completedLast24h,
          failedLast24h,
          avgProcessingTimeMs,
          recentFailedJobs,
        };
      };

      return await withTimeout(perQueueWork(), HEALTH_CHECK_TIMEOUT_MS, `Queue metrics: ${queueName}`);
    } catch (error: unknown) {
      logger.warn(`Failed to get metrics for queue ${queueName}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        name: queueName,
        queuedCount: 0,
        activeCount: 0,
        totalCount: 0,
        deferredCount: 0,
        completedLast24h: 0,
        failedLast24h: 0,
        avgProcessingTimeMs: null,
        recentFailedJobs: [],
      };
    }
  });

  return Promise.all(metricsPromises);
}

export const healthService = {
  async getHealthCheck(): Promise<HealthCheckResult> {
    const [database, blobStorage, pgBoss] = await Promise.all([
      checkDatabase(),
      checkBlobStorage(),
      checkPgBoss(),
    ]);

    const components = { database, blobStorage, pgBoss };

    return {
      status: deriveOverallStatus(components),
      timestamp: new Date().toISOString(),
      components,
    };
  },

  async getSystemHealth(): Promise<SystemHealthResult> {
    const [healthCheck, queues] = await Promise.all([
      healthService.getHealthCheck(),
      getQueueDetailedMetrics(),
    ]);

    return {
      ...healthCheck,
      queues,
    };
  },
};
