import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError, ErrorCode } from '@/lib/errors';
import { tenantMiddleware } from './tenant';
import { roleGuardMiddleware } from './roleGuard';
import { isWriteOperation, recordAudit, type AuditEntry } from './audit';
import type { AuthenticatedContext, UserRole } from './types';

// Mock dependencies
vi.mock('@/db', () => ({
  setTenantContext: vi.fn().mockResolvedValue(undefined),
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('@/db/schema', () => ({
  auditLogs: {},
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

function createMockContext(overrides: Partial<{
  tenantId: string;
  userId: string;
  role: UserRole;
  method: string;
  url: string;
}> = {}): AuthenticatedContext {
  const {
    tenantId = 'tenant-123',
    userId = 'user-456',
    role = 'admin',
    method = 'GET',
    url = 'http://localhost:3000/api/kpi',
  } = overrides;

  const req = new NextRequest(new URL(url), { method });

  return {
    req,
    session: {
      user: {
        userId,
        tenantId,
        role,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    tenantId: '',
    userId,
  };
}

// ─────────────────────────────────────────────────────────────────
// AppError
// ──────────────────���────────────────���─────────────────────────────
describe('AppError', () => {
  it('creates an error with code, message, status, and details', () => {
    const error = new AppError(ErrorCode.FORBIDDEN, 'Not allowed', 403, { field: ['error'] });
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Not allowed');
    expect(error.status).toBe(403);
    expect(error.details).toEqual({ field: ['error'] });
  });

  it('serializes to the standard error format via toJSON', () => {
    const error = new AppError(ErrorCode.NOT_FOUND, 'Resource not found', 404);
    expect(error.toJSON()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  it('includes details in JSON when present', () => {
    const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid', 400, { email: ['Required'] });
    expect(error.toJSON()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: { email: ['Required'] },
      },
    });
  });

  it('is an instance of Error', () => {
    const error = new AppError(ErrorCode.AUTH_REQUIRED, 'Auth', 401);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
  });
});

// ────────────────────────────────────────────────────────────────��
// Tenant Middleware
// ─────────��────────────────────────���────────────────────────────��─
describe('tenantMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets tenantId on context from session JWT', async () => {
    const ctx = createMockContext({ tenantId: 'tenant-abc' });
    await tenantMiddleware(ctx);
    expect(ctx.tenantId).toBe('tenant-abc');
  });

  it('calls setTenantContext with the tenant ID for RLS', async () => {
    const { setTenantContext } = await import('@/db');
    const ctx = createMockContext({ tenantId: 'tenant-xyz' });
    await tenantMiddleware(ctx);
    expect(setTenantContext).toHaveBeenCalledWith('tenant-xyz');
  });

  it('throws AUTH_REQUIRED (401) if no tenantId in session', async () => {
    const ctx = createMockContext({ tenantId: '' });
    await expect(tenantMiddleware(ctx)).rejects.toThrow(AppError);
    try {
      await tenantMiddleware(ctx);
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe(ErrorCode.AUTH_REQUIRED);
      expect(err.status).toBe(401);
    }
  });
});

// ─────────────────────────────���─────────────────────────��─────────
// Role Guard Middleware
// ───────────────────────��─────────────────────────────────���───────
describe('roleGuardMiddleware', () => {
  it('allows access when user role is in the required roles', () => {
    const ctx = createMockContext({ role: 'admin' });
    expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst'])).not.toThrow();
  });

  it('allows all authenticated users when roles array is empty', () => {
    const ctx = createMockContext({ role: 'viewer' });
    expect(() => roleGuardMiddleware(ctx, [])).not.toThrow();
  });

  it('throws FORBIDDEN (403) when user role is not in required roles', () => {
    const ctx = createMockContext({ role: 'viewer' });
    expect(() => roleGuardMiddleware(ctx, ['admin'])).toThrow(AppError);
    try {
      roleGuardMiddleware(ctx, ['admin']);
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe(ErrorCode.FORBIDDEN);
      expect(err.status).toBe(403);
    }
  });

  it('admin has access to admin-only routes', () => {
    const ctx = createMockContext({ role: 'admin' });
    expect(() => roleGuardMiddleware(ctx, ['admin'])).not.toThrow();
  });

  it('analyst cannot access admin-only routes', () => {
    const ctx = createMockContext({ role: 'analyst' });
    expect(() => roleGuardMiddleware(ctx, ['admin'])).toThrow(AppError);
  });

  it('department role cannot access analyst routes', () => {
    const ctx = createMockContext({ role: 'department' });
    expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst'])).toThrow(AppError);
  });

  it('viewer is read-only — cannot access write routes', () => {
    const ctx = createMockContext({ role: 'viewer' });
    expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst', 'department'])).toThrow(AppError);
  });

  it('includes user role in error message', () => {
    const ctx = createMockContext({ role: 'viewer' });
    try {
      roleGuardMiddleware(ctx, ['admin']);
    } catch (e) {
      const err = e as AppError;
      expect(err.message).toContain('viewer');
      expect(err.message).toContain('admin');
    }
  });
});

// ─────────────────────────────────────────────────��───────────────
// Audit Middleware
// ───────────────────────��───────────────��─────────────────────────
describe('audit middleware', () => {
  describe('isWriteOperation', () => {
    it('identifies POST as a write operation', () => {
      expect(isWriteOperation('POST')).toBe(true);
    });

    it('identifies PUT as a write operation', () => {
      expect(isWriteOperation('PUT')).toBe(true);
    });

    it('identifies PATCH as a write operation', () => {
      expect(isWriteOperation('PATCH')).toBe(true);
    });

    it('identifies DELETE as a write operation', () => {
      expect(isWriteOperation('DELETE')).toBe(true);
    });

    it('does not identify GET as a write operation', () => {
      expect(isWriteOperation('GET')).toBe(false);
    });

    it('handles case-insensitive input (uppercased internally)', () => {
      expect(isWriteOperation('post')).toBe(true);
      expect(isWriteOperation('get')).toBe(false);
    });
  });

  describe('recordAudit', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('inserts audit record with correct fields', async () => {
      const { db } = await import('@/db');
      const mockValues = vi.fn().mockResolvedValue(undefined);
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

      const ctx = createMockContext({ method: 'POST' });
      ctx.tenantId = 'tenant-123';

      const entry: AuditEntry = {
        entityType: 'kpi_value',
        entityId: 'entity-789',
        oldValue: null,
        newValue: { score: 42 },
      };

      await recordAudit(ctx, entry);

      expect(db.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'tenant-123',
        userId: 'user-456',
        action: 'CREATE',
        entityType: 'kpi_value',
        entityId: 'entity-789',
        oldValue: null,
        newValue: { score: 42 },
      }));
    });

    it('maps PUT method to UPDATE action', async () => {
      const { db } = await import('@/db');
      const mockValues = vi.fn().mockResolvedValue(undefined);
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

      const ctx = createMockContext({ method: 'PUT' });
      ctx.tenantId = 'tenant-123';

      const entry: AuditEntry = {
        entityType: 'user',
        entityId: 'user-1',
      };

      await recordAudit(ctx, entry);

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
      }));
    });

    it('maps DELETE method to DELETE action', async () => {
      const { db } = await import('@/db');
      const mockValues = vi.fn().mockResolvedValue(undefined);
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

      const ctx = createMockContext({ method: 'DELETE' });
      ctx.tenantId = 'tenant-123';

      const entry: AuditEntry = {
        entityType: 'goal',
        entityId: 'goal-1',
      };

      await recordAudit(ctx, entry);

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        action: 'DELETE',
      }));
    });

    it('includes metadata with IP, user-agent, and path', async () => {
      const { db } = await import('@/db');
      const mockValues = vi.fn().mockResolvedValue(undefined);
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

      const ctx = createMockContext({ method: 'POST', url: 'http://localhost:3000/api/kpi' });
      ctx.tenantId = 'tenant-123';

      const entry: AuditEntry = {
        entityType: 'kpi_value',
        entityId: 'kpi-1',
      };

      await recordAudit(ctx, entry);

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({
          path: '/api/kpi',
        }),
      }));
    });
  });
});

// ───────────��──────────────────────────────────────��──────────────
// withApiHandler composition
// ────────────────��────────────────────────────────────────────────
describe('withApiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when session is not authenticated', async () => {
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(async () => ({ data: 'test' }));
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'));
    const res = await handler(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 when user role is not allowed', async () => {
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'viewer' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => ({ data: 'test' }),
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/users'));
    const res = await handler(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('executes handler and returns 200 for GET requests', async () => {
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => ({ data: [{ id: 1 }] }),
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'));
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([{ id: 1 }]);
  });

  it('returns 201 for POST requests', async () => {
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => ({ data: { id: 'new-1' } }),
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'), {
      method: 'POST',
    });
    const res = await handler(req);

    expect(res.status).toBe(201);
  });

  it('returns 204 for DELETE requests', async () => {
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => ({ data: null }),
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi/123'), {
      method: 'DELETE',
    });
    const res = await handler(req);

    expect(res.status).toBe(204);
  });

  it('executes middleware chain in correct order: auth → tenant → role → handler → audit', async () => {
    const { auth } = await import('@/lib/auth');
    const { setTenantContext } = await import('@/db');
    const { db } = await import('@/db');
    const mockValues = vi.fn().mockResolvedValue(undefined);
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

    const callOrder: string[] = [];

    (auth as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push('auth');
      return {
        user: { userId: 'u1', tenantId: 't1', role: 'admin' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };
    });

    (setTenantContext as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push('tenant');
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => {
        callOrder.push('handler');
        return {
          data: { id: '1' },
          _audit: { entityType: 'kpi_value', entityId: '1', newValue: { id: '1' } },
        };
      },
      { roles: ['admin'] }
    );

    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'), {
      method: 'POST',
    });
    await handler(req);

    // Auth is first, tenant sets RLS, then handler executes
    expect(callOrder).toEqual(['auth', 'tenant', 'handler']);
    // Audit happens after handler (via db.insert)
    expect(db.insert).toHaveBeenCalled();
  });

  it('handles unexpected errors with 500 and generic message in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => { throw new Error('database connection failed'); },
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'));
    const res = await handler(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('PROCESSING_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');

    vi.unstubAllEnvs();
  });

  it('shows error details in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => { throw new Error('specific db error'); },
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'));
    const res = await handler(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toBe('specific db error');

    vi.unstubAllEnvs();
  });

  it('strips _audit from the response body', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');
    const mockValues = vi.fn().mockResolvedValue(undefined);
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => ({
        data: { id: '1', name: 'Test' },
        _audit: { entityType: 'kpi_value', entityId: '1', newValue: { id: '1' } },
      }),
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'), {
      method: 'POST',
    });
    const res = await handler(req);
    const body = await res.json();

    expect(body._audit).toBeUndefined();
    expect(body.data).toEqual({ id: '1', name: 'Test' });
  });

  it('does not trigger audit for GET requests', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => ({
        data: [{ id: '1' }],
        _audit: { entityType: 'kpi_value', entityId: '1' },
      }),
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'));
    const res = await handler(req);

    expect(res.status).toBe(200);
    // Audit should not be called for GET
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('passes raw Response through without wrapping', async () => {
    const { auth } = await import('@/lib/auth');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');
    const { NextResponse } = await import('next/server');

    const customResponse = NextResponse.json({ custom: true }, { status: 202 });
    const handler = withApiHandler(
      async () => customResponse as unknown as Record<string, unknown>,
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/stream'));
    const res = await handler(req);

    expect(res.status).toBe(202);
  });

  it('does not crash when audit recording fails (audit failure resilience)', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');
    const mockValues = vi.fn().mockRejectedValue(new Error('DB connection lost'));
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => ({
        data: { id: 'created-1' },
        _audit: { entityType: 'kpi_value', entityId: 'created-1', newValue: { id: 'created-1' } },
      }),
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'), {
      method: 'POST',
    });
    const res = await handler(req);

    // Should succeed with 201 despite audit failure
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toEqual({ id: 'created-1' });
  });

  it('strips _audit from response even when audit is disabled', async () => {
    const { auth } = await import('@/lib/auth');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => ({
        data: { id: '1' },
        _audit: { entityType: 'kpi_value', entityId: '1' },
      }),
      { roles: ['admin'], audit: false }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'), {
      method: 'POST',
    });
    const res = await handler(req);
    const body = await res.json();

    expect(body._audit).toBeUndefined();
    expect(body.data).toEqual({ id: '1' });
  });

  it('returns 401 when session role is missing or invalid', async () => {
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: '' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(async () => ({ data: 'test' }));
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'));
    const res = await handler(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_REQUIRED');
    expect(body.error.message).toContain('role');
  });

  it('wraps primitive handler results in a data object', async () => {
    const { auth } = await import('@/lib/auth');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { userId: 'u1', tenantId: 't1', role: 'admin' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const { withApiHandler } = await import('./handler');

    const handler = withApiHandler(
      async () => null as unknown as Record<string, unknown>,
      { roles: ['admin'] }
    );
    const req = new NextRequest(new URL('http://localhost:3000/api/kpi'));
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: null });
  });
});
