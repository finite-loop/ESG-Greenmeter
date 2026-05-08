import { auditService } from '@/services/auditService';
import type { LogChangeParams } from '@/services/auditService';
import type { AuthenticatedContext } from './types';

/** HTTP methods that represent write operations and trigger audit logging. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Maps HTTP methods to audit action types. Uppercases input for consistency. */
function methodToAction(method: string): LogChangeParams['action'] {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'CREATE';
  }
}

/**
 * Extracts the client IP from x-forwarded-for header.
 * x-forwarded-for may contain a chain: "client, proxy1, proxy2"
 * We extract only the first (client) IP.
 */
function extractClientIp(forwardedFor: string | null, realIp: string | null): string {
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  if (realIp) return realIp;
  return 'unknown';
}

export interface AuditEntry {
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Determines whether the request method is a write operation.
 */
export function isWriteOperation(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

/**
 * Audit middleware: records write operations via the audit service.
 * Called after the handler has successfully executed for write operations.
 *
 * The handler must return an AuditEntry (or the composition utility will
 * extract it from the response context) to populate audit details.
 *
 * Audit failures are caught and suppressed — they must not crash the
 * request when the business logic has already succeeded.
 */
export async function recordAudit(
  ctx: AuthenticatedContext,
  entry: AuditEntry
): Promise<void> {
  await auditService.logChange({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: methodToAction(ctx.req.method),
    entityType: entry.entityType,
    entityId: entry.entityId,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    metadata: {
      ip: extractClientIp(
        ctx.req.headers.get('x-forwarded-for'),
        ctx.req.headers.get('x-real-ip')
      ),
      userAgent: ctx.req.headers.get('user-agent') ?? 'unknown',
      path: new URL(ctx.req.url).pathname,
    },
  });
}
