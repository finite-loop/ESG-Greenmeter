import { kpiRepository } from '@/db/repositories/kpiRepository';
import type { KpiValueRow, KpiValueWithParam } from '@/db/repositories/kpiRepository';
import { userRepository } from '@/db/repositories/userRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { submitJob } from '@/jobs';
import type { ScoreRecomputeJobData } from '@/jobs/scoreRecompute';
import { goalService } from '@/services/goalService';
import type { KpiValueCreate, KpiValueUpdate, KpiValueListFilter } from '@/schemas/kpi';
import type { UserRole } from '@/middleware/types';

/**
 * Enqueue a score-recompute job when a KPI value changes.
 * Runs asynchronously — does not block the write operation.
 */
async function enqueueScoreRecompute(
  tenantId: string,
  periodId: string,
  triggeredBy: string,
  nodeId?: string
): Promise<void> {
  try {
    await submitJob<ScoreRecomputeJobData>('score-recompute', {
      tenantId,
      periodId,
      triggeredBy,
      nodeId,
    }, {
      singletonKey: `score-recompute-${tenantId}-${periodId}`,
    });
  } catch (err: unknown) {
    // Log but do not fail the write operation
    logger.error('Failed to enqueue score-recompute job', {
      error: err instanceof Error ? err.message : String(err),
      tenantId,
      periodId,
    });
  }
}

/** RAG status for a KPI value row */
export type RagStatus = 'green' | 'amber' | 'red' | 'grey';

export interface KpiValueWithRag extends KpiValueWithParam {
  ragStatus: RagStatus;
}

/**
 * Compute RAG status for a KPI value.
 *   green  = value exists and verified
 *   amber  = value exists but not verified
 *   red    = no value (valueId is null from LEFT JOIN)
 */
function computeRagStatus(row: KpiValueWithParam): RagStatus {
  if (row.valueId === null) return 'red';
  if (row.notApplicable) return 'grey';
  if (row.verified) return 'green';
  return 'amber';
}

export const kpiService = {
  /**
   * Lists KPI values with their parameter metadata and RAG status.
   * RAG: green=verified, amber=entered/unverified, red=missing (no row).
   */
  async listValues(
    tenantId: string,
    filters: KpiValueListFilter
  ): Promise<{
    data: KpiValueWithRag[];
    meta: { page: number; pageSize: number; total: number };
  }> {
    const result = await kpiRepository.findByFilters(tenantId, {
      periodId: filters.periodId,
      standard: filters.standard,
      pillar: filters.pillar,
      category: filters.category,
      department: filters.department,
      nodeId: filters.nodeId,
      page: filters.page,
      pageSize: filters.pageSize,
    });

    const dataWithRag: KpiValueWithRag[] = result.data.map((row) => ({
      ...row,
      ragStatus: computeRagStatus(row),
    }));

    return {
      data: dataWithRag,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },

  /**
   * Gets a single KPI value by ID.
   */
  async getById(
    valueId: string,
    tenantId: string
  ): Promise<KpiValueRow> {
    const row = await kpiRepository.findById(valueId, tenantId);
    if (!row) {
      throw new AppError(ErrorCode.NOT_FOUND, 'KPI value not found', 404);
    }
    return row;
  },

  /**
   * Creates a new KPI value with source_type='manual' (when from UI).
   * Checks for duplicates via the unique constraint on (tenantId, paramId, nodeId, periodId).
   */
  async createValue(
    tenantId: string,
    input: KpiValueCreate
  ): Promise<KpiValueRow> {
    // Check for existing value to give a meaningful error
    const existing = await kpiRepository.findByParamNodePeriod(
      tenantId,
      input.paramId,
      input.nodeId,
      input.periodId
    );

    if (existing) {
      throw new AppError(
        ErrorCode.DUPLICATE_ENTRY,
        'A KPI value already exists for this parameter, node, and period combination',
        409
      );
    }

    try {
      const created = await kpiRepository.insert(tenantId, input);

      // Trigger rollup recomputation for ancestor nodes
      await enqueueScoreRecompute(tenantId, input.periodId, 'kpi-value-create', input.nodeId);

      // Check milestones for auto-achievement (fire-and-forget)
      if (input.value) {
        const numericValue = Number(input.value);
        if (!isNaN(numericValue)) {
          goalService.checkMilestonesForParam(tenantId, input.paramId, numericValue).catch((err) => {
            logger.error('Failed to check milestones after KPI value create', {
              error: err instanceof Error ? err.message : String(err),
              tenantId,
              paramId: input.paramId,
            });
          });
        }
      }

      return created;
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
        throw new AppError(
          ErrorCode.DUPLICATE_ENTRY,
          'A KPI value already exists for this parameter, node, and period combination',
          409
        );
      }
      throw err;
    }
  },

  /**
   * Updates an existing KPI value. Returns both old and new values for audit.
   */
  async updateValue(
    valueId: string,
    tenantId: string,
    input: KpiValueUpdate
  ): Promise<{ oldValue: KpiValueRow; newValue: KpiValueRow }> {
    // Verify value exists and belongs to tenant
    const existing = await kpiRepository.findById(valueId, tenantId);
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'KPI value not found', 404);
    }

    const result = await kpiRepository.update(valueId, tenantId, input);

    // Trigger rollup recomputation for ancestor nodes
    await enqueueScoreRecompute(tenantId, existing.periodId, 'kpi-value-update', existing.nodeId);

    // Check milestones for auto-achievement after value update (fire-and-forget)
    const newValue = input.value ?? existing.value;
    if (newValue) {
      const numericValue = Number(newValue);
      if (!isNaN(numericValue)) {
        goalService.checkMilestonesForParam(tenantId, existing.paramId, numericValue).catch((err) => {
          logger.error('Failed to check milestones after KPI value update', {
            error: err instanceof Error ? err.message : String(err),
            tenantId,
            paramId: existing.paramId,
          });
        });
      }
    }

    return result;
  },

  /**
   * Batch verify KPI values. Sets verified=true, verifiedBy, verifiedAt.
   * Validates all valueIds belong to the current tenant.
   * Department-role users can only verify values whose param.depts includes their department.
   * Returns old and new values for per-value audit logging.
   */
  async verifyValues(
    tenantId: string,
    userId: string,
    valueIds: string[],
    role?: UserRole
  ): Promise<{ oldValues: KpiValueRow[]; updated: KpiValueRow[] }> {
    const uniqueIds = [...new Set(valueIds)];

    // Department scope check: department-role users can only verify params assigned to their dept
    if (role === 'department') {
      const user = await userRepository.findById(userId);
      if (!user?.departmentId) {
        throw new AppError(ErrorCode.FORBIDDEN, 'Department user has no assigned department', 403);
      }
      const inScope = await kpiRepository.checkDepartmentScope(uniqueIds, tenantId, user.departmentId);
      if (!inScope) {
        throw new AppError(ErrorCode.FORBIDDEN, 'Some values belong to parameters outside your department scope', 403);
      }
    }

    // Repository validates all IDs exist (throws COUNT_MISMATCH inside transaction).
    // newValues may be fewer than uniqueIds when some are already verified (WHERE verified=false guard).
    const { oldValues, newValues } = await kpiRepository.batchVerify(uniqueIds, tenantId, userId);

    return { oldValues, updated: newValues };
  },

  /**
   * Batch mark KPI values as not applicable.
   * Sets notApplicable=true (excludes from coverage calculations).
   * Validates all valueIds belong to the current tenant.
   * Department-role users can only mark values whose param.depts includes their department.
   * Returns old and new values for per-value audit logging.
   */
  async markNotApplicable(
    tenantId: string,
    userId: string,
    valueIds: string[],
    role?: UserRole
  ): Promise<{ oldValues: KpiValueRow[]; updated: KpiValueRow[] }> {
    const uniqueIds = [...new Set(valueIds)];

    // Department scope check
    if (role === 'department') {
      const user = await userRepository.findById(userId);
      if (!user?.departmentId) {
        throw new AppError(ErrorCode.FORBIDDEN, 'Department user has no assigned department', 403);
      }
      const inScope = await kpiRepository.checkDepartmentScope(uniqueIds, tenantId, user.departmentId);
      if (!inScope) {
        throw new AppError(ErrorCode.FORBIDDEN, 'Some values belong to parameters outside your department scope', 403);
      }
    }

    const { oldValues, newValues } = await kpiRepository.batchMarkNotApplicable(uniqueIds, tenantId);

    // Verify all requested IDs were found in the tenant
    if (newValues.length !== uniqueIds.length) {
      const foundIds = new Set(newValues.map((v) => v.valueId));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `KPI values not found: ${missing.join(', ')}`,
        404
      );
    }

    return { oldValues, updated: newValues };
  },

  /**
   * Deletes a KPI value. Returns the deleted value for audit.
   * Only admin and analyst roles should be allowed (enforced at route level).
   */
  async deleteValue(
    valueId: string,
    tenantId: string
  ): Promise<KpiValueRow> {
    const deleted = await kpiRepository.delete(valueId, tenantId);
    if (!deleted) {
      throw new AppError(ErrorCode.NOT_FOUND, 'KPI value not found', 404);
    }

    // Trigger rollup recomputation for ancestor nodes
    await enqueueScoreRecompute(tenantId, deleted.periodId, 'kpi-value-delete', deleted.nodeId);

    return deleted;
  },
};
