import { AppError, ErrorCode } from '@/lib/errors';
import type { AuthenticatedContext, Permission } from './types';

/**
 * Role guard middleware: checks the user's role against the route's required permissions.
 * Returns 403 FORBIDDEN if the user's role is not in the allowed list.
 *
 * Role hierarchy:
 *   Admin      — full access to all features
 *   Analyst    — read + write (no user management)
 *   Department — own department data only
 *   Viewer     — read-only access
 *
 * If no roles are specified (empty array), all authenticated users are allowed.
 */
export function roleGuardMiddleware(
  ctx: AuthenticatedContext,
  requiredRoles: Permission[]
): void {
  // If no roles are specified, all authenticated users pass
  if (requiredRoles.length === 0) {
    return;
  }

  const userRole = ctx.session.user.role;

  if (!requiredRoles.includes(userRole)) {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}. Your role: ${userRole}.`,
      403
    );
  }
}
