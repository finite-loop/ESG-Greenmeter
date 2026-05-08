import { withApiHandler } from '@/middleware';
import { kpiService } from '@/services/kpiService';
import { kpiBatchVerifySchema, kpiBatchMarkNotApplicableSchema } from '@/schemas/kpi';
import { auditService } from '@/services/auditService';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * POST /api/kpi/verify — Batch verify KPI values.
 *
 * Body: { valueIds: string[] }
 *
 * Sets verified=true, verifiedBy, verifiedAt for each value.
 * Each verification is individually audit-logged (action='VERIFY').
 * Only Admin, Analyst, or Department roles can verify.
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

    const parsed = kpiBatchVerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid verification payload',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { valueIds } = parsed.data;
    const result = await kpiService.verifyValues(ctx.tenantId, ctx.userId, valueIds, ctx.session.user.role);

    // Build lookup for old values by valueId
    const oldValueMap = new Map(result.oldValues.map((v) => [v.valueId, v]));

    // Per-value audit logging (AC #6)
    for (const row of result.updated) {
      try {
        const oldVal = oldValueMap.get(row.valueId);
        await auditService.logChange({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'VERIFY',
          entityType: 'kpi_value',
          entityId: row.valueId,
          oldValue: oldVal ? { verified: oldVal.verified, verifiedBy: oldVal.verifiedBy, verifiedAt: oldVal.verifiedAt } : undefined,
          newValue: {
            verified: true,
            verifiedBy: ctx.userId,
            verifiedAt: row.verifiedAt,
          },
        });
      } catch (auditErr: unknown) {
        logger.error('Per-value verify audit failed', {
          valueId: row.valueId,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        });
      }
    }

    return {
      data: {
        verified: result.updated.length,
        valueIds: result.updated.map((r) => r.valueId),
      },
    };
  },
  { roles: ['admin', 'analyst', 'department'], audit: false }
);

/**
 * PUT /api/kpi/verify — Batch mark KPI values as Not Applicable.
 *
 * Body: { valueIds: string[] }
 *
 * Sets notApplicable=true, excludes from coverage calculations.
 * Each action is individually audit-logged.
 * Only Admin, Analyst, or Department roles can mark N/A.
 */
export const PUT = withApiHandler(
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

    const parsed = kpiBatchMarkNotApplicableSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid payload',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { valueIds } = parsed.data;
    const result = await kpiService.markNotApplicable(ctx.tenantId, ctx.userId, valueIds, ctx.session.user.role);

    // Build lookup for old values by valueId
    const oldValueMap = new Map(result.oldValues.map((v) => [v.valueId, v]));

    // Per-value audit logging with distinct MARK_NA action
    for (const row of result.updated) {
      try {
        const oldVal = oldValueMap.get(row.valueId);
        await auditService.logChange({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'MARK_NA',
          entityType: 'kpi_value',
          entityId: row.valueId,
          oldValue: oldVal ? { notApplicable: oldVal.notApplicable, verified: oldVal.verified } : undefined,
          newValue: { notApplicable: true },
        });
      } catch (auditErr: unknown) {
        logger.error('Per-value not-applicable audit failed', {
          valueId: row.valueId,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        });
      }
    }

    return {
      data: {
        marked: result.updated.length,
        valueIds: result.updated.map((r) => r.valueId),
      },
    };
  },
  { roles: ['admin', 'analyst', 'department'], audit: false }
);
