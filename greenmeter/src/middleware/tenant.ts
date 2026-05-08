import { setTenantContext } from '@/db';
import { AppError, ErrorCode } from '@/lib/errors';
import type { AuthenticatedContext } from './types';

/**
 * Tenant middleware: extracts tenantId from the authenticated session JWT
 * and sets the PostgreSQL session variable for RLS enforcement.
 *
 * MUST be called after auth middleware has populated ctx.session.
 * Rejects with 401 if no tenantId is present in session.
 */
export async function tenantMiddleware(ctx: AuthenticatedContext): Promise<void> {
  const tenantId = ctx.session.user.tenantId;

  if (!tenantId) {
    throw new AppError(
      ErrorCode.AUTH_REQUIRED,
      'No tenant context available. User is not associated with a tenant.',
      401
    );
  }

  await setTenantContext(tenantId);
  ctx.tenantId = tenantId;
}
