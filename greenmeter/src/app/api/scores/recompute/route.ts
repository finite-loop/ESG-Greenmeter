import { withApiHandler } from '@/middleware';
import { scoreRecomputeRequestSchema } from '@/schemas/scoring';
import { submitJob } from '@/jobs';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * POST /api/scores/recompute — Trigger a score recomputation job.
 * Body: { periodId: UUID }
 */
export const POST = withApiHandler(
  async (req, ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400
      );
    }

    const parsed = scoreRecomputeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'periodId is required (valid UUID)',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const jobId = await submitJob('score-recompute', {
      tenantId: ctx.tenantId,
      periodId: parsed.data.periodId,
      triggeredBy: ctx.userId,
      ...(parsed.data.nodeId && { nodeId: parsed.data.nodeId }),
    }, {
      singletonKey: `score-recompute-${ctx.tenantId}-${parsed.data.periodId}`,
    });

    return {
      data: {
        jobId,
        status: 'queued',
        message: 'Score recomputation job submitted',
      },
      _audit: {
        entityType: 'esg_score',
        entityId: parsed.data.periodId,
        newValue: { jobId, periodId: parsed.data.periodId },
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
