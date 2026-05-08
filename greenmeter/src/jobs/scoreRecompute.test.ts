import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'pg-boss';

// Mock dependencies before importing handler
vi.mock('pg-boss', () => {
  class MockPgBoss {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn();
    resume = vi.fn().mockResolvedValue(undefined);
  }
  return { PgBoss: MockPgBoss };
});

const mockRefreshScores = vi.fn();
const mockRefreshCoverageSummary = vi.fn();
vi.mock('@/db/repositories/scoringRepository', () => ({
  scoringRepository: {
    refreshScores: (...args: unknown[]) => mockRefreshScores(...args),
    refreshCoverageSummary: (...args: unknown[]) => mockRefreshCoverageSummary(...args),
  },
}));

const mockRecomputeAncestors = vi.fn();
vi.mock('@/services/rollupService', () => ({
  rollupService: {
    recomputeAncestors: (...args: unknown[]) => mockRecomputeAncestors(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { handleScoreRecompute } from './scoreRecompute';
import type { ScoreRecomputeJobData } from './scoreRecompute';

function createJob(data: ScoreRecomputeJobData): Job<ScoreRecomputeJobData>[] {
  return [
    {
      id: 'job-1',
      name: 'score-recompute',
      data,
      expireInSeconds: 900,
      heartbeatSeconds: null,
    } as Job<ScoreRecomputeJobData>,
  ];
}

describe('handleScoreRecompute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/test');
    mockRefreshScores.mockResolvedValue(undefined);
    mockRefreshCoverageSummary.mockResolvedValue(undefined);
    mockRecomputeAncestors.mockResolvedValue(undefined);
  });

  it('refreshes materialized view and returns success', async () => {
    const jobs = createJob({
      tenantId: 'tenant-1',
      periodId: 'period-1',
      triggeredBy: 'kpi_value_write',
    });

    const results = await handleScoreRecompute(jobs);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].result?.scoresUpdated).toBe(1);
    expect(results[0].result?.rollupsRecomputed).toBe(0);
    expect(mockRefreshScores).toHaveBeenCalledOnce();
  });

  it('recomputes rollups when nodeId is provided', async () => {
    const jobs = createJob({
      tenantId: 'tenant-1',
      periodId: 'period-1',
      triggeredBy: 'kpi_value_write',
      nodeId: 'node-1',
    });

    const results = await handleScoreRecompute(jobs);

    expect(results[0].success).toBe(true);
    expect(results[0].result?.rollupsRecomputed).toBe(1);
    expect(mockRecomputeAncestors).toHaveBeenCalledWith('tenant-1', 'node-1', 'period-1');
    expect(mockRefreshScores).toHaveBeenCalledOnce();
  });

  it('does not call rollupService when no nodeId provided', async () => {
    const jobs = createJob({
      tenantId: 'tenant-1',
      periodId: 'period-1',
      triggeredBy: 'threshold_change',
    });

    await handleScoreRecompute(jobs);

    expect(mockRecomputeAncestors).not.toHaveBeenCalled();
  });

  it('succeeds with scoresUpdated=0 if MV refresh fails (non-fatal, no nodeId)', async () => {
    mockRefreshScores.mockRejectedValue(new Error('relation "esg_scores" does not exist'));

    const jobs = createJob({
      tenantId: 'tenant-1',
      periodId: 'period-1',
      triggeredBy: 'kpi_value_write',
    });

    const results = await handleScoreRecompute(jobs);

    // Without nodeId, only MV refresh is attempted; if it fails, still success but scoresUpdated=0
    expect(results[0].success).toBe(true);
    expect(results[0].result?.scoresUpdated).toBe(0);
  });

  it('succeeds even if rollup recomputation fails', async () => {
    mockRecomputeAncestors.mockRejectedValue(new Error('rollup failed'));

    const jobs = createJob({
      tenantId: 'tenant-1',
      periodId: 'period-1',
      triggeredBy: 'kpi_value_write',
      nodeId: 'node-1',
    });

    const results = await handleScoreRecompute(jobs);

    expect(results[0].success).toBe(true);
    expect(results[0].result?.rollupsRecomputed).toBe(0);
  });

  it('processes multiple jobs in batch', async () => {
    const jobs: Job<ScoreRecomputeJobData>[] = [
      {
        id: 'job-1',
        name: 'score-recompute',
        data: { tenantId: 't1', periodId: 'p1', triggeredBy: 'user' },
        expireInSeconds: 900,
        heartbeatSeconds: null,
      } as Job<ScoreRecomputeJobData>,
      {
        id: 'job-2',
        name: 'score-recompute',
        data: { tenantId: 't2', periodId: 'p2', triggeredBy: 'user' },
        expireInSeconds: 900,
        heartbeatSeconds: null,
      } as Job<ScoreRecomputeJobData>,
    ];

    const results = await handleScoreRecompute(jobs);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    expect(mockRefreshScores).toHaveBeenCalledTimes(2);
  });

  it('reports failure when both rollup and MV refresh fail', async () => {
    mockRecomputeAncestors.mockRejectedValue(new Error('rollup failed'));
    mockRefreshScores.mockRejectedValue(new Error('MV refresh failed'));

    const jobs = createJob({
      tenantId: 'tenant-1',
      periodId: 'period-1',
      triggeredBy: 'kpi_value_write',
      nodeId: 'node-1',
    });

    const results = await handleScoreRecompute(jobs);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Both rollup recomputation and MV refresh failed');
  });

  it('refreshes coverage_summary materialized view alongside esg_scores', async () => {
    const jobs = createJob({
      tenantId: 'tenant-1',
      periodId: 'period-1',
      triggeredBy: 'kpi_value_write',
    });

    await handleScoreRecompute(jobs);

    expect(mockRefreshCoverageSummary).toHaveBeenCalledOnce();
  });

  it('succeeds even if coverage_summary refresh fails (non-fatal)', async () => {
    mockRefreshCoverageSummary.mockRejectedValue(
      new Error('relation "coverage_summary" does not exist')
    );

    const jobs = createJob({
      tenantId: 'tenant-1',
      periodId: 'period-1',
      triggeredBy: 'kpi_value_write',
    });

    const results = await handleScoreRecompute(jobs);

    expect(results[0].success).toBe(true);
    expect(results[0].result?.scoresUpdated).toBe(1);
  });
});
