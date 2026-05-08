import { auditRepository } from '@/db/repositories/auditRepository';
import type { AuditFilter } from '@/schemas/audit';
import type { AuditLogRow } from '@/db/repositories/auditRepository';

export interface LogChangeParams {
  userId: string;
  tenantId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY' | 'IMPORT' | 'MARK_NA';
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Audit service — append-only audit trail.
 *
 * Only exposes logChange (insert) and query operations.
 * No update or delete methods are provided to preserve immutability.
 */
export const auditService = {
  /**
   * Record a change in the audit log.
   * Called by the audit middleware after successful writes,
   * or directly by service layer for complex operations.
   */
  async logChange(params: LogChangeParams): Promise<void> {
    await auditRepository.insert({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata,
    });
  },

  /**
   * Query audit logs with filters and pagination.
   * Returns paginated results scoped to the current tenant (via RLS).
   */
  async getFiltered(
    filters: AuditFilter
  ): Promise<{ data: AuditLogRow[]; meta: { page: number; pageSize: number; total: number } }> {
    const result = await auditRepository.findFiltered(filters);

    return {
      data: result.data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },
};
