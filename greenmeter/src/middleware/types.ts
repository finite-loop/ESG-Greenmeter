import type { Session } from 'next-auth';
import type { NextRequest } from 'next/server';

/** Role types matching the auth schema */
export type UserRole = 'admin' | 'analyst' | 'department' | 'viewer';

/**
 * Permission levels for route access control.
 * Routes specify which roles are allowed access.
 */
export type Permission = UserRole;

/**
 * Context populated by the auth middleware with session data.
 */
export interface AuthenticatedContext {
  req: NextRequest;
  session: Session & {
    user: {
      userId: string;
      tenantId: string;
      role: UserRole;
    };
  };
  tenantId: string;
  userId: string;
}

/**
 * Options for the withApiHandler composition utility.
 */
export interface ApiHandlerOptions {
  /** Roles that are allowed to access this route. Empty = all authenticated users. */
  roles?: Permission[];
  /** Whether this route performs a write operation (triggers audit logging). */
  audit?: boolean;
  /** Entity type for audit logging (e.g., 'kpi_value', 'user'). */
  auditEntityType?: string;
}

/**
 * The shape of a successful API response.
 */
export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * The shape of an error API response.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Handler function signature for API route handlers wrapped by withApiHandler.
 */
export type ApiHandler<T = unknown> = (
  req: NextRequest,
  ctx: AuthenticatedContext
) => Promise<T | Response>;
