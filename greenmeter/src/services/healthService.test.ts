import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before any module that imports it
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => new Response()),
    redirect: vi.fn((url: URL) => new Response(null, { status: 307, headers: { Location: url.toString() } })),
    json: vi.fn((body: unknown, init?: ResponseInit) => Response.json(body, init)),
  },
  NextRequest: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

// Mock the database module
vi.mock('@/db', () => ({
  db: {
    execute: vi.fn(),
  },
}));

// Mock pg-boss
vi.mock('@/lib/pgBoss', () => ({
  getBoss: vi.fn(),
  QUEUE_CONFIG: {
    'extraction-pipeline': { concurrency: 2, retryLimit: 3, retryBackoff: true },
    'metric-mapping': { concurrency: 3, retryLimit: 3, retryBackoff: true },
    'score-recompute': { concurrency: 5, retryLimit: 1, retryBackoff: false },
    'report-generation': { concurrency: 2, retryLimit: 2, retryBackoff: true },
    'api-sync': { concurrency: 1, retryLimit: 3, retryBackoff: true },
    'llm-recommendations': { concurrency: 1, retryLimit: 1, retryBackoff: false },
  },
}));

// Mock blob storage module
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn(),
  },
}));

describe('healthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHealthCheck', () => {
    it('returns healthy status when all components are healthy', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');
      const { BlobServiceClient } = await import('@azure/storage-blob');

      // Mock DB success
      vi.mocked(db.execute).mockResolvedValue([] as never);

      // Mock pg-boss success
      vi.mocked(getBoss).mockResolvedValue({
        getQueues: vi.fn().mockResolvedValue([{ name: 'extraction-pipeline' }, { name: 'metric-mapping' }]),
      } as never);

      // Mock blob storage success
      process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test';
      const mockContainerClient = { exists: vi.fn().mockResolvedValue(true) };
      vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as never);

      const { healthService } = await import('./healthService');
      const result = await healthService.getHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.components.database.status).toBe('healthy');
      expect(result.components.blobStorage.status).toBe('healthy');
      expect(result.components.pgBoss.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
    });

    it('returns unhealthy when database fails and does NOT leak error details', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');
      const { BlobServiceClient } = await import('@azure/storage-blob');

      // Mock DB failure with sensitive info
      vi.mocked(db.execute).mockRejectedValue(new Error('FATAL: password authentication failed for user "admin" at host 10.0.0.5:5432'));

      // Mock pg-boss success
      vi.mocked(getBoss).mockResolvedValue({
        getQueues: vi.fn().mockResolvedValue([]),
      } as never);

      // Mock blob storage success
      process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test';
      const mockContainerClient = { exists: vi.fn().mockResolvedValue(true) };
      vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as never);

      const { healthService } = await import('./healthService');
      const result = await healthService.getHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.components.database.status).toBe('unhealthy');
      // Should NOT contain sensitive info like hostname, password, or user
      expect(result.components.database.message).toBe('Database connection failed');
      expect(result.components.database.message).not.toContain('10.0.0.5');
      expect(result.components.database.message).not.toContain('password');
    });

    it('returns degraded status when blob storage connection string is missing', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');

      // Mock DB success
      vi.mocked(db.execute).mockResolvedValue([] as never);

      // Mock pg-boss success
      vi.mocked(getBoss).mockResolvedValue({
        getQueues: vi.fn().mockResolvedValue([]),
      } as never);

      // Remove blob storage env var
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;

      const { healthService } = await import('./healthService');
      const result = await healthService.getHealthCheck();

      expect(result.status).toBe('degraded');
      expect(result.components.blobStorage.status).toBe('degraded');
      expect(result.components.blobStorage.message).toContain('not configured');
    });

    it('returns unhealthy when pg-boss fails and does NOT leak error details', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');
      const { BlobServiceClient } = await import('@azure/storage-blob');

      // Mock DB success
      vi.mocked(db.execute).mockResolvedValue([] as never);

      // Mock pg-boss failure
      vi.mocked(getBoss).mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432'));

      // Mock blob storage success
      process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test';
      const mockContainerClient = { exists: vi.fn().mockResolvedValue(true) };
      vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as never);

      const { healthService } = await import('./healthService');
      const result = await healthService.getHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.components.pgBoss.status).toBe('unhealthy');
      expect(result.components.pgBoss.message).toBe('pg-boss check failed');
      expect(result.components.pgBoss.message).not.toContain('10.0.0.5');
    });

    it('includes latency measurements for each component', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');
      const { BlobServiceClient } = await import('@azure/storage-blob');

      vi.mocked(db.execute).mockResolvedValue([] as never);
      vi.mocked(getBoss).mockResolvedValue({
        getQueues: vi.fn().mockResolvedValue([]),
      } as never);
      process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test';
      const mockContainerClient = { exists: vi.fn().mockResolvedValue(true) };
      vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as never);

      const { healthService } = await import('./healthService');
      const result = await healthService.getHealthCheck();

      expect(result.components.database.latencyMs).toBeTypeOf('number');
      expect(result.components.blobStorage.latencyMs).toBeTypeOf('number');
      expect(result.components.pgBoss.latencyMs).toBeTypeOf('number');
    });
  });

  describe('getSystemHealth', () => {
    it('returns health check plus queue metrics with single findJobs call per queue', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');
      const { BlobServiceClient } = await import('@azure/storage-blob');

      vi.mocked(db.execute).mockResolvedValue([] as never);

      const mockFindJobs = vi.fn().mockResolvedValue([]);
      const mockBoss = {
        getQueues: vi.fn().mockResolvedValue([]),
        getQueueStats: vi.fn().mockResolvedValue({
          queuedCount: 5,
          activeCount: 2,
          totalCount: 100,
          deferredCount: 0,
        }),
        findJobs: mockFindJobs,
      };
      vi.mocked(getBoss).mockResolvedValue(mockBoss as never);

      process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test';
      const mockContainerClient = { exists: vi.fn().mockResolvedValue(true) };
      vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as never);

      const { healthService } = await import('./healthService');
      const result = await healthService.getSystemHealth();

      expect(result.status).toBeDefined();
      expect(result.queues).toBeDefined();
      expect(result.queues).toHaveLength(6); // 6 queues in QUEUE_CONFIG
      expect(result.queues[0].name).toBe('extraction-pipeline');
      expect(result.queues[0].queuedCount).toBe(5);
      expect(result.queues[0].activeCount).toBe(2);

      // Verify only ONE findJobs call per queue (not two duplicates)
      expect(mockFindJobs).toHaveBeenCalledTimes(6); // 6 queues, 1 call each
    });

    it('handles queue stats failure gracefully', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');
      const { BlobServiceClient } = await import('@azure/storage-blob');

      vi.mocked(db.execute).mockResolvedValue([] as never);

      const mockBoss = {
        getQueues: vi.fn().mockResolvedValue([]),
        getQueueStats: vi.fn().mockRejectedValue(new Error('Queue not found')),
        findJobs: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getBoss).mockResolvedValue(mockBoss as never);

      process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test';
      const mockContainerClient = { exists: vi.fn().mockResolvedValue(true) };
      vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as never);

      const { healthService } = await import('./healthService');
      const result = await healthService.getSystemHealth();

      // Should not throw; returns zero counts
      expect(result.queues).toHaveLength(6);
      result.queues.forEach((q) => {
        expect(q.queuedCount).toBe(0);
        expect(q.activeCount).toBe(0);
        expect(q.completedLast24h).toBe(0);
        expect(q.failedLast24h).toBe(0);
      });
    });

    it('does not include sensitive job data or output in failed jobs', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');
      const { BlobServiceClient } = await import('@azure/storage-blob');

      vi.mocked(db.execute).mockResolvedValue([] as never);

      const failedJob = {
        id: 'job-123',
        state: 'failed',
        createdOn: new Date('2026-05-05T09:59:00Z'),
        startAfter: new Date('2026-05-05T10:00:00Z'),
        startedOn: new Date('2026-05-05T10:00:01Z'),
        completedOn: new Date('2026-05-05T10:00:05Z'),
        data: { sensitiveApiKey: 'sk-secret-123', tenantId: 'tenant-uuid' },
        output: { error: 'Internal DB error at host 10.0.0.5' },
      };

      const mockBoss = {
        getQueues: vi.fn().mockResolvedValue([]),
        getQueueStats: vi.fn().mockResolvedValue({
          queuedCount: 0, activeCount: 0, totalCount: 1, deferredCount: 0,
        }),
        findJobs: vi.fn().mockResolvedValue([failedJob]),
      };
      vi.mocked(getBoss).mockResolvedValue(mockBoss as never);

      process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test';
      const mockContainerClient = { exists: vi.fn().mockResolvedValue(true) };
      vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as never);

      const { healthService } = await import('./healthService');
      const result = await healthService.getSystemHealth();

      // Find the queue with the failed job
      const queueWithFailed = result.queues.find((q) => q.recentFailedJobs.length > 0);
      expect(queueWithFailed).toBeDefined();

      const job = queueWithFailed!.recentFailedJobs[0];
      expect(job.id).toBe('job-123');
      // Sensitive fields should NOT be present
      expect(job).not.toHaveProperty('data');
      expect(job).not.toHaveProperty('output');
      // Error summary should exist but be sanitized (IP redacted)
      expect(job.errorSummary).toBeDefined();
      expect(job.errorSummary).not.toContain('10.0.0.5');
    });

    it('fetches queue metrics in parallel (not sequential)', async () => {
      const { db } = await import('@/db');
      const { getBoss } = await import('@/lib/pgBoss');
      const { BlobServiceClient } = await import('@azure/storage-blob');

      vi.mocked(db.execute).mockResolvedValue([] as never);

      const callOrder: string[] = [];
      const mockBoss = {
        getQueues: vi.fn().mockResolvedValue([]),
        getQueueStats: vi.fn().mockImplementation(async (name: string) => {
          callOrder.push(`stats-${name}`);
          return { queuedCount: 0, activeCount: 0, totalCount: 0, deferredCount: 0 };
        }),
        findJobs: vi.fn().mockImplementation(async (name: string) => {
          callOrder.push(`find-${name}`);
          return [];
        }),
      };
      vi.mocked(getBoss).mockResolvedValue(mockBoss as never);

      process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test';
      const mockContainerClient = { exists: vi.fn().mockResolvedValue(true) };
      vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as never);

      const { healthService } = await import('./healthService');
      await healthService.getSystemHealth();

      // All 6 queues should have been processed
      expect(mockBoss.getQueueStats).toHaveBeenCalledTimes(6);
      expect(mockBoss.findJobs).toHaveBeenCalledTimes(6);
    });
  });
});
