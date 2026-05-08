import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWork = vi.fn().mockResolvedValue('worker-id');
const mockSend = vi.fn().mockResolvedValue('job-id-123');
const mockSchedule = vi.fn().mockResolvedValue(undefined);
const mockGetJobById = vi.fn().mockResolvedValue({
  id: 'job-id-123',
  name: 'extraction-pipeline',
  state: 'active',
  data: { documentId: 'doc-1', tenantId: 'tenant-1' },
  progress: { stage: 'processing', progress: 50, message: 'Halfway' },
});
const mockStart = vi.fn().mockResolvedValue(undefined);

vi.mock('pg-boss', () => {
  class MockPgBoss {
    start = mockStart;
    stop = vi.fn();
    resume = vi.fn();
    work = mockWork;
    send = mockSend;
    schedule = mockSchedule;
    getJobById = mockGetJobById;
  }
  return { PgBoss: MockPgBoss };
});

// Mock database and related imports added by registerApiSyncSchedules
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  setTenantContext: vi.fn(),
}));

vi.mock('@/db/schema/config', () => ({
  tenantConfig: { key: 'key' },
}));

vi.mock('drizzle-orm', () => ({
  like: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('jobs/index', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/test');
    mockWork.mockClear();
    mockSend.mockClear();
    mockSchedule.mockClear();
    mockGetJobById.mockClear();
  });

  describe('registerAllJobs', () => {
    it('registers handlers for all 6 queues', async () => {
      const { registerAllJobs } = await import('./index');

      await registerAllJobs();

      expect(mockWork).toHaveBeenCalledTimes(6);

      const registeredQueues = mockWork.mock.calls.map((call) => call[0]);
      expect(registeredQueues).toContain('extraction-pipeline');
      expect(registeredQueues).toContain('metric-mapping');
      expect(registeredQueues).toContain('score-recompute');
      expect(registeredQueues).toContain('report-generation');
      expect(registeredQueues).toContain('api-sync');
      expect(registeredQueues).toContain('llm-recommendations');
    });

    it('configures correct concurrency for each queue', async () => {
      const { registerAllJobs } = await import('./index');

      await registerAllJobs();

      const calls = mockWork.mock.calls;
      const findCall = (name: string) => calls.find((c) => c[0] === name);

      expect(findCall('extraction-pipeline')?.[1]).toMatchObject({
        localConcurrency: 2,
      });
      expect(findCall('metric-mapping')?.[1]).toMatchObject({
        localConcurrency: 3,
      });
      expect(findCall('score-recompute')?.[1]).toMatchObject({
        localConcurrency: 5,
      });
      expect(findCall('report-generation')?.[1]).toMatchObject({
        localConcurrency: 2,
      });
      expect(findCall('api-sync')?.[1]).toMatchObject({
        localConcurrency: 1,
      });
      expect(findCall('llm-recommendations')?.[1]).toMatchObject({
        localConcurrency: 1,
      });
    });

    it('passes handler functions for each queue', async () => {
      const { registerAllJobs } = await import('./index');

      await registerAllJobs();

      for (const call of mockWork.mock.calls) {
        expect(typeof call[2]).toBe('function');
      }
    });

    it('registers nightly cron schedule for llm-recommendations', async () => {
      const { registerAllJobs } = await import('./index');

      await registerAllJobs();

      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith(
        'llm-recommendations',
        '0 2 * * *',
        expect.objectContaining({ scope: 'full' })
      );
    });
  });

  describe('submitJob', () => {
    it('sends a job to the specified queue with retry config', async () => {
      const { submitJob } = await import('./index');

      const jobId = await submitJob('extraction-pipeline', {
        documentId: 'doc-1',
        tenantId: 'tenant-1',
      });

      expect(jobId).toBe('job-id-123');
      expect(mockSend).toHaveBeenCalledWith(
        'extraction-pipeline',
        { documentId: 'doc-1', tenantId: 'tenant-1' },
        expect.objectContaining({
          retryLimit: 3,
          retryBackoff: true,
        })
      );
    });

    it('passes priority option when provided', async () => {
      const { submitJob } = await import('./index');

      await submitJob(
        'score-recompute',
        { tenantId: 't1', periodId: 'p1', triggeredBy: 'user' },
        { priority: 10 }
      );

      expect(mockSend).toHaveBeenCalledWith(
        'score-recompute',
        { tenantId: 't1', periodId: 'p1', triggeredBy: 'user' },
        expect.objectContaining({
          retryLimit: 1,
          retryBackoff: false,
          priority: 10,
        })
      );
    });

    it('passes startAfter option when provided', async () => {
      const { submitJob } = await import('./index');
      const future = new Date('2026-06-01T00:00:00Z');

      await submitJob(
        'api-sync',
        { tenantId: 't1', integrationId: 'i1', syncType: 'full' as const },
        { startAfter: future }
      );

      expect(mockSend).toHaveBeenCalledWith(
        'api-sync',
        { tenantId: 't1', integrationId: 'i1', syncType: 'full' },
        expect.objectContaining({
          startAfter: future,
        })
      );
    });
  });

  describe('getJobStatus', () => {
    it('returns job details including progress', async () => {
      const { getJobStatus } = await import('./index');

      const job = await getJobStatus('extraction-pipeline', 'job-id-123');

      expect(mockGetJobById).toHaveBeenCalledWith('extraction-pipeline', 'job-id-123');
      expect(job).toMatchObject({
        id: 'job-id-123',
        name: 'extraction-pipeline',
        state: 'active',
        progress: { stage: 'processing', progress: 50, message: 'Halfway' },
      });
    });
  });
});
