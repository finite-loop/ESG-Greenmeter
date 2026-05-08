import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'pg-boss';

vi.mock('pg-boss', () => {
  class MockPgBoss {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn();
    resume = vi.fn().mockResolvedValue(undefined);
  }
  return { PgBoss: MockPgBoss };
});

const mockGenerateForTenant = vi.fn();

vi.mock('@/services/recommendationService', () => ({
  recommendationService: {
    generateForTenant: (...args: unknown[]) => mockGenerateForTenant(...args),
  },
}));

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

vi.mock('@/db/schema/tenants', () => ({
  tenants: { tenantId: 'tenantId', active: 'active' },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('handleLlmRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/test');
  });

  function createMockJob(data: { tenantId: string; scope: 'full' | 'incremental' }): Job<typeof data>[] {
    return [{
      id: 'test-job-id',
      name: 'llm-recommendations',
      data,
      expireInSeconds: 900,
      heartbeatSeconds: null,
    } as Job<typeof data>];
  }

  it('processes a specific tenant when tenantId is provided', async () => {
    mockGenerateForTenant.mockResolvedValue(5);

    const { handleLlmRecommendations } = await import('./llmRecommendations');
    const jobs = createMockJob({ tenantId: 'tenant-1', scope: 'full' });
    const results = await handleLlmRecommendations(jobs);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].result?.recommendationsGenerated).toBe(5);
    expect(results[0].result?.tenantsProcessed).toBe(1);
    expect(mockGenerateForTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('handles tenant processing failure gracefully', async () => {
    mockGenerateForTenant.mockRejectedValue(new Error('DB connection failed'));

    const { handleLlmRecommendations } = await import('./llmRecommendations');
    const jobs = createMockJob({ tenantId: 'tenant-1', scope: 'full' });
    const results = await handleLlmRecommendations(jobs);

    // Job still succeeds overall, but with 0 processed
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].result?.recommendationsGenerated).toBe(0);
    expect(results[0].result?.tenantsProcessed).toBe(0);
  });

  it('returns correct result shape', async () => {
    mockGenerateForTenant.mockResolvedValue(3);

    const { handleLlmRecommendations } = await import('./llmRecommendations');
    const jobs = createMockJob({ tenantId: 'tenant-1', scope: 'full' });
    const results = await handleLlmRecommendations(jobs);

    expect(results[0]).toMatchObject({
      success: true,
      result: {
        recommendationsGenerated: expect.any(Number),
        tenantsProcessed: expect.any(Number),
      },
    });
  });
});
