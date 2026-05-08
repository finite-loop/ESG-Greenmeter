import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger, runWithContext } from '@/lib/logger';
import { generateCorrelationId } from '@/lib/correlationId';
import { tenantMiddleware } from './tenant';
import { roleGuardMiddleware } from './roleGuard';
import { isWriteOperation, recordAudit, type AuditEntry } from './audit';
import type { ApiHandler, ApiHandlerOptions, AuthenticatedContext, UserRole } from './types';

const VALID_ROLES: ReadonlySet<string> = new Set<UserRole>(['admin', 'analyst', 'department', 'viewer']);

/**
 * Composes the middleware chain for API route handlers.
 *
 * Execution order: auth → tenant → role → handler → audit
 *
 * Usage:
 *   export const GET = withApiHandler(async (req, ctx) => {
 *     const data = await myService.list(ctx.tenantId);
 *     return { data };
 *   }, { roles: ['admin', 'analyst'] });
 *
 * For write operations that need audit logging, return an object with `_audit`:
 *   export const POST = withApiHandler(async (req, ctx) => {
 *     const result = await myService.create(ctx.tenantId, body);
 *     return {
 *       data: result,
 *       _audit: { entityType: 'kpi_value', entityId: result.id, newValue: result }
 *     };
 *   }, { roles: ['admin', 'analyst'] });
 */
export function withApiHandler<T = unknown>(
  handler: ApiHandler<T | (T & { _audit?: AuditEntry })>,
  options: ApiHandlerOptions = {}
) {
  const { roles = [], audit: auditEnabled = true } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    const correlationId = generateCorrelationId();

    return runWithContext({ correlationId }, async () => {
      try {
        // Step 1: Auth — verify session exists
        const session = await auth();

        if (!session?.user?.userId || !session?.user?.tenantId) {
          throw new AppError(
            ErrorCode.AUTH_REQUIRED,
            'Authentication required. Please sign in.',
            401
          );
        }

        // Validate role is a known value
        const role = session.user.role;
        if (!role || !VALID_ROLES.has(role)) {
          throw new AppError(
            ErrorCode.AUTH_REQUIRED,
            'Invalid session: user role is missing or unrecognized.',
            401
          );
        }

        // Update log context with tenant and user info
        const logCtx = { correlationId, tenantId: session.user.tenantId, userId: session.user.userId };

        return await runWithContext(logCtx, async () => {
          // Build the context object
          const ctx: AuthenticatedContext = {
            req,
            session: session as AuthenticatedContext['session'],
            tenantId: '',
            userId: session.user.userId,
          };

          // Step 2: Tenant — set RLS context
          await tenantMiddleware(ctx);

          // Step 3: Role guard — check permissions
          roleGuardMiddleware(ctx, roles);

          logger.info('API request', { method: req.method, path: req.nextUrl.pathname });

          // Step 4: Execute handler
          const result = await handler(req, ctx);

          // If handler returned a raw Response (for streaming, etc.), pass through
          if (result instanceof Response) {
            return result as NextResponse;
          }

          // Guard: ensure result is a non-null object for JSON serialization
          const resultObj: Record<string, unknown> =
            result !== null && typeof result === 'object' ? (result as Record<string, unknown>) : { data: result };

          // Step 5: Audit — log write operations (wrapped in try/catch to avoid crashing on audit failure)
          if (auditEnabled && isWriteOperation(req.method) && resultObj._audit) {
            const auditEntry = resultObj._audit as AuditEntry;
            try {
              await recordAudit(ctx, auditEntry);
            } catch (auditError: unknown) {
              logger.error('Audit logging failed', {
                error: auditError instanceof Error ? auditError.message : String(auditError),
                method: req.method,
                path: req.nextUrl.pathname,
              });
            }
          }

          // Always strip _audit from response body regardless of auditEnabled flag
          if ('_audit' in resultObj) {
            delete resultObj._audit;
          }

          // Determine HTTP status based on method
          const status = req.method === 'POST' ? 201 : req.method === 'DELETE' ? 204 : 200;

          if (status === 204) {
            return new NextResponse(null, { status: 204 });
          }

          return NextResponse.json(resultObj, { status });
        });
      } catch (error: unknown) {
        if (error instanceof AppError) {
          return NextResponse.json(error.toJSON(), { status: error.status });
        }

        // Unexpected error — log and return generic error response
        logger.error('Unhandled error in API handler', {
          error: error instanceof Error ? error.message : String(error),
          ...(process.env.NODE_ENV !== 'production' && {
            stack: error instanceof Error ? error.stack : undefined,
          }),
          method: req.method,
          path: req.nextUrl.pathname,
        });

        const message =
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'An unexpected error occurred';

        return NextResponse.json(
          {
            error: {
              code: ErrorCode.PROCESSING_ERROR,
              message,
            },
          },
          { status: 500 }
        );
      }
    });
  };
}
