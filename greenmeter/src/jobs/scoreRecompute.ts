import type { Job } from 'pg-boss';
import type { JobResult, JobProgress } from '@/lib/pgBoss';
import { reportProgress } from '@/lib/pgBoss';
import { rollupService } from '@/services/rollupService';
import { scoringRepository } from '@/db/repositories/scoringRepository';
import { logger } from '@/lib/logger';

export interface ScoreRecomputeJobData {
  tenantId: string;
  periodId: string;
  triggeredBy: string;
  /** Optional: node whose ancestors need rollup recomputation. */
  nodeId?: string;
}

export interface ScoreRecomputeJobResult {
  scoresUpdated: number;
  rollupsRecomputed: number;
}

export async function handleScoreRecompute(
  jobs: Job<ScoreRecomputeJobData>[]
): Promise<JobResult<ScoreRecomputeJobResult>[]> {
  const results: JobResult<ScoreRecomputeJobResult>[] = [];

  for (const job of jobs) {
    try {
      const progress: JobProgress = {
        stage: 'initializing',
        progress: 0,
        message: 'Starting score recomputation',
      };
      await reportProgress('score-recompute', job.id, progress);

      let rollupsRecomputed = 0;

      // Step 1: Recompute rollups for ancestor nodes if a nodeId is provided
      if (job.data.nodeId) {
        try {
          await reportProgress('score-recompute', job.id, {
            stage: 'rollups',
            progress: 20,
            message: 'Recomputing rollup aggregations',
          });
          await rollupService.recomputeAncestors(
            job.data.tenantId,
            job.data.nodeId,
            job.data.periodId
          );
          rollupsRecomputed = 1;
        } catch (err: unknown) {
          logger.error('Rollup recomputation failed in score-recompute job', {
            error: err instanceof Error ? err.message : String(err),
            nodeId: job.data.nodeId,
            periodId: job.data.periodId,
          });
        }
      }

      // Step 2: Refresh the esg_scores materialized view
      await reportProgress('score-recompute', job.id, {
        stage: 'refresh-mv',
        progress: 60,
        message: 'Refreshing esg_scores materialized view',
      });

      let mvRefreshed = false;
      try {
        await scoringRepository.refreshScores();
        mvRefreshed = true;

        logger.info('esg_scores materialized view refreshed', {
          tenantId: job.data.tenantId,
          periodId: job.data.periodId,
          triggeredBy: job.data.triggeredBy,
        });
      } catch (err: unknown) {
        // MV refresh failure is non-fatal — scores can still be computed live
        logger.error('esg_scores materialized view refresh failed', {
          error: err instanceof Error ? err.message : String(err),
          tenantId: job.data.tenantId,
          periodId: job.data.periodId,
        });
      }

      // Step 3: Refresh the coverage_summary materialized view
      await reportProgress('score-recompute', job.id, {
        stage: 'refresh-coverage',
        progress: 80,
        message: 'Refreshing coverage_summary materialized view',
      });

      try {
        await scoringRepository.refreshCoverageSummary();
        logger.info('coverage_summary materialized view refreshed', {
          tenantId: job.data.tenantId,
          periodId: job.data.periodId,
        });
      } catch (err: unknown) {
        // Coverage MV refresh failure is non-fatal
        logger.error('coverage_summary materialized view refresh failed', {
          error: err instanceof Error ? err.message : String(err),
          tenantId: job.data.tenantId,
          periodId: job.data.periodId,
        });
      }

      await reportProgress('score-recompute', job.id, {
        stage: 'complete',
        progress: 100,
        message: 'Score recomputation complete',
      });

      // Report failure if both rollup and MV refresh failed
      const rollupFailed = job.data.nodeId && rollupsRecomputed === 0;
      if (rollupFailed && !mvRefreshed) {
        results.push({ success: false, error: 'Both rollup recomputation and MV refresh failed' });
      } else {
        results.push({
          success: true,
          result: { scoresUpdated: mvRefreshed ? 1 : 0, rollupsRecomputed },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({ success: false, error: message });
    }
  }

  return results;
}
