import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import type { AuditFilter } from '@/schemas/audit';

export interface AuditLogInsert {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}

export interface AuditLogRow {
  logId: string;
  tenantId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  metadata: unknown;
  createdAt: Date;
}

/**
 * Audit repository — append-only.
 * Only insert and read operations. No update or delete methods.
 */
export const auditRepository = {
  /**
   * Insert a single audit log entry. This is the only write operation
   * allowed on audit_logs at the application level.
   */
  async insert(entry: AuditLogInsert): Promise<void> {
    await db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      metadata: entry.metadata ?? null,
    });
  },

  /**
   * Query audit logs with filters and pagination.
   * Results are RLS-scoped — only current tenant's logs are visible
   * because the tenant context is set at the DB connection level.
   */
  async findFiltered(
    filters: AuditFilter
  ): Promise<{ data: AuditLogRow[]; total: number }> {
    const conditions = [];

    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.dateFrom) {
      conditions.push(gte(auditLogs.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(auditLogs.createdAt, filters.dateTo));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (filters.page - 1) * filters.pageSize;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ]);

    return {
      data: data as AuditLogRow[],
      total: countResult[0]?.count ?? 0,
    };
  },
};
