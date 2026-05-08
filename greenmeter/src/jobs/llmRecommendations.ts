import type { Job } from 'pg-boss';
import type { JobResult, JobProgress } from '@/lib/pgBoss';
import { reportProgress } from '@/lib/pgBoss';
import { db, setTenantContext } from '@/db';
import { tenants } from '@/db/schema/tenants';
import { eq } from 'drizzle-orm';
import { recommendationService } from '@/services/recommendationService';
import { logger } from '@/lib/logger';

export interface LlmRecommendationsJobData {
  tenantId?: string;
  scope: 'full' | 'incremental';
}

export interface LlmRecommendationsJobResult {
  recommendationsGenerated: number;
  tenantsProcessed: number;
}

/**
 * Nightly job handler: generates AI recommendations for tenant KPI data.
 *
 * If tenantId is provided, processes only that tenant.
 * The job generates both rule-based alerts and LLM-powered recommendations,
 * with graceful degradation if the LLM is unavailable.
 */
export async function handleLlmRecommendations(
  jobs: Job<LlmRecommendationsJobData>[]
): Promise<JobResult<LlmRecommendationsJobResult>[]> {
  const results: JobResult<LlmRecommendationsJobResult>[] = [];

  for (const job of jobs) {
    try {
      const progress: JobProgress = {
        stage: 'initializing',
        progress: 0,
        message: 'Starting LLM recommendations generation',
      };
      await reportProgress('llm-recommendations', job.id, progress);

      let tenantIds: string[];

      if (job.data.tenantId) {
        // Process specific tenant
        tenantIds = [job.data.tenantId];
      } else {
        // Process all active tenants
        const activeTenants = await db
          .select({ tenantId: tenants.tenantId })
          .from(tenants)
          .where(eq(tenants.active, true));
        tenantIds = activeTenants.map((t) => t.tenantId);
      }

      if (tenantIds.length === 0) {
        logger.info('No active tenants found for recommendation generation');
        results.push({ success: true, result: { recommendationsGenerated: 0, tenantsProcessed: 0 } });
        continue;
      }

      let totalGenerated = 0;
      let tenantsProcessed = 0;

      for (let i = 0; i < tenantIds.length; i++) {
        const tid = tenantIds[i];
        const progressPct = Math.round(((i + 1) / tenantIds.length) * 90) + 5;

        await reportProgress('llm-recommendations', job.id, {
          stage: 'processing',
          progress: progressPct,
          message: `Processing tenant ${i + 1} of ${tenantIds.length}`,
        });

        try {
          await setTenantContext(tid);
          const count = await recommendationService.generateForTenant(tid);
          totalGenerated += count;
          tenantsProcessed++;

          logger.info('Recommendations generated for tenant', {
            tenantId: tid,
            count,
          });
        } catch (tenantError) {
          // Non-fatal: log and continue to next tenant
          logger.error('Failed to generate recommendations for tenant', {
            tenantId: tid,
            error: tenantError instanceof Error ? tenantError.message : String(tenantError),
          });
        }
      }

      await reportProgress('llm-recommendations', job.id, {
        stage: 'complete',
        progress: 100,
        message: `Generated ${totalGenerated} recommendations for ${tenantsProcessed} tenants`,
      });

      results.push({
        success: true,
        result: {
          recommendationsGenerated: totalGenerated,
          tenantsProcessed,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('LLM recommendations job failed', { error: message, jobId: job.id });
      results.push({ success: false, error: message });
    }
  }

  return results;
}
