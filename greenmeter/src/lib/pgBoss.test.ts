import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockStart = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn().mockResolvedValue(undefined);
const mockResume = vi.fn().mockResolvedValue(undefined);

vi.mock('pg-boss', () => {
  class MockPgBoss {
    start = mockStart;
    stop = mockStop;
    resume = mockResume;
  }
  return { PgBoss: MockPgBoss };
});

describe('pgBoss', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/test');
    mockStart.mockClear();
    mockStop.mockClear();
    mockResume.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getBoss', () => {
    it('creates and starts pg-boss instance on first call', async () => {
      const { getBoss } = await import('./pgBoss');
      const boss = await getBoss();

      expect(boss).toBeDefined();
      expect(mockStart).toHaveBeenCalledOnce();
    });

    it('returns same instance on subsequent calls (singleton)', async () => {
      const { getBoss } = await import('./pgBoss');
      const boss1 = await getBoss();
      const boss2 = await getBoss();

      expect(boss1).toBe(boss2);
      expect(mockStart).toHaveBeenCalledOnce();
    });

    it('throws if DATABASE_URL is not set', async () => {
      vi.stubEnv('DATABASE_URL', '');
      const { getBoss } = await import('./pgBoss');

      await expect(getBoss()).rejects.toThrow('DATABASE_URL environment variable is not set');
    });
  });

  describe('reportProgress', () => {
    it('calls resume with queue name and job ID', async () => {
      const { reportProgress, getBoss } = await import('./pgBoss');
      await getBoss();

      const progress = { stage: 'processing', progress: 50, message: 'Halfway done' };
      await reportProgress('extraction-pipeline', 'job-123', progress);

      expect(mockResume).toHaveBeenCalledWith('extraction-pipeline', 'job-123');
    });
  });

  describe('stopBoss', () => {
    it('gracefully stops the boss instance', async () => {
      const { getBoss, stopBoss } = await import('./pgBoss');
      await getBoss();

      await stopBoss();
      expect(mockStop).toHaveBeenCalledWith({ graceful: true });
    });

    it('does nothing if boss is not initialized', async () => {
      const { stopBoss } = await import('./pgBoss');
      await stopBoss();
      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe('QUEUE_CONFIG', () => {
    it('defines all six required queues', async () => {
      const { QUEUE_CONFIG } = await import('./pgBoss');

      expect(Object.keys(QUEUE_CONFIG)).toHaveLength(6);
      expect(QUEUE_CONFIG).toHaveProperty('extraction-pipeline');
      expect(QUEUE_CONFIG).toHaveProperty('metric-mapping');
      expect(QUEUE_CONFIG).toHaveProperty('score-recompute');
      expect(QUEUE_CONFIG).toHaveProperty('report-generation');
      expect(QUEUE_CONFIG).toHaveProperty('api-sync');
      expect(QUEUE_CONFIG).toHaveProperty('llm-recommendations');
    });

    it('extraction-pipeline: concurrency 2, retries 3, exponential backoff', async () => {
      const { QUEUE_CONFIG } = await import('./pgBoss');
      const config = QUEUE_CONFIG['extraction-pipeline'];

      expect(config.concurrency).toBe(2);
      expect(config.retryLimit).toBe(3);
      expect(config.retryBackoff).toBe(true);
    });

    it('metric-mapping: concurrency 3, retries 3', async () => {
      const { QUEUE_CONFIG } = await import('./pgBoss');
      const config = QUEUE_CONFIG['metric-mapping'];

      expect(config.concurrency).toBe(3);
      expect(config.retryLimit).toBe(3);
      expect(config.retryBackoff).toBe(true);
    });

    it('score-recompute: concurrency 5, retries 1, immediate', async () => {
      const { QUEUE_CONFIG } = await import('./pgBoss');
      const config = QUEUE_CONFIG['score-recompute'];

      expect(config.concurrency).toBe(5);
      expect(config.retryLimit).toBe(1);
      expect(config.retryBackoff).toBe(false);
    });

    it('report-generation: concurrency 2, retries 2', async () => {
      const { QUEUE_CONFIG } = await import('./pgBoss');
      const config = QUEUE_CONFIG['report-generation'];

      expect(config.concurrency).toBe(2);
      expect(config.retryLimit).toBe(2);
      expect(config.retryBackoff).toBe(true);
    });

    it('api-sync: concurrency 1, retries 3', async () => {
      const { QUEUE_CONFIG } = await import('./pgBoss');
      const config = QUEUE_CONFIG['api-sync'];

      expect(config.concurrency).toBe(1);
      expect(config.retryLimit).toBe(3);
      expect(config.retryBackoff).toBe(true);
    });

    it('llm-recommendations: concurrency 1, retries 1', async () => {
      const { QUEUE_CONFIG } = await import('./pgBoss');
      const config = QUEUE_CONFIG['llm-recommendations'];

      expect(config.concurrency).toBe(1);
      expect(config.retryLimit).toBe(1);
      expect(config.retryBackoff).toBe(false);
    });
  });
});
