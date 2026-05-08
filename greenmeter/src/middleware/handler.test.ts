import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { withApiHandler } from './handler';
import { ErrorCode } from '@/lib/errors';
import type { AuthenticatedContext } from './types';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock tenant context
vi.mock('@/db', () => ({
  setTenantContext: vi.fn().mockResolvedValue(undefined),
}));

// Mock audit
vi.mock('./audit', () => ({
  isWriteOperation: (method: string) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

function createRequest(method: string, url = 'http://localhost/api/test'): NextRequest {
  return new NextRequest(url, { method });
}

function createSession(overrides?: {
  userId?: string;
  tenantId?: string;
  role?: string;
}) {
  return {
    user: {
      userId: overrides?.userId ?? 'user-123',
      tenantId: overrides?.tenantId ?? 'tenant-456',
      role: overrides?.role ?? 'admin',
      name: 'Test User',
      email: 'test@example.com',
    },
    expires: '2099-01-01',
  };
}

describe('withApiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  describe('Auth middleware step', () => {
    it('returns 401 when session is null', async () => {
      mockAuth.mockResolvedValue(null);
      const handler = withApiHandler(async () => ({ data: 'ok' }));
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCode.AUTH_REQUIRED);
    });

    it('returns 401 when userId is missing', async () => {
      mockAuth.mockResolvedValue(createSession({ userId: '' }));
      const handler = withApiHandler(async () => ({ data: 'ok' }));
      const req = createRequest('GET');

      const response = await handler(req);

      expect(response.status).toBe(401);
    });

    it('returns 401 when tenantId is missing from session', async () => {
      mockAuth.mockResolvedValue(createSession({ tenantId: '' }));
      const handler = withApiHandler(async () => ({ data: 'ok' }));
      const req = createRequest('GET');

      const response = await handler(req);

      expect(response.status).toBe(401);
    });
  });

  describe('Tenant middleware step', () => {
    it('sets tenantId on context for the handler', async () => {
      let capturedCtx: AuthenticatedContext | null = null;
      const handler = withApiHandler(async (_req, ctx) => {
        capturedCtx = ctx;
        return { data: 'ok' };
      });
      const req = createRequest('GET');

      await handler(req);

      expect(capturedCtx).not.toBeNull();
      expect(capturedCtx!.tenantId).toBe('tenant-456');
    });

    it('calls setTenantContext with session tenantId', async () => {
      const { setTenantContext } = await import('@/db');
      const handler = withApiHandler(async () => ({ data: 'ok' }));
      const req = createRequest('GET');

      await handler(req);

      expect(setTenantContext).toHaveBeenCalledWith('tenant-456');
    });
  });

  describe('Role guard step', () => {
    it('returns 403 when user role is not in allowed list', async () => {
      mockAuth.mockResolvedValue(createSession({ role: 'viewer' }));
      const handler = withApiHandler(async () => ({ data: 'ok' }), {
        roles: ['admin', 'analyst'],
      });
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('allows access when user role is in allowed list', async () => {
      mockAuth.mockResolvedValue(createSession({ role: 'analyst' }));
      const handler = withApiHandler(async () => ({ data: 'ok' }), {
        roles: ['admin', 'analyst'],
      });
      const req = createRequest('GET');

      const response = await handler(req);

      expect(response.status).toBe(200);
    });

    it('allows access when no roles are specified', async () => {
      mockAuth.mockResolvedValue(createSession({ role: 'viewer' }));
      const handler = withApiHandler(async () => ({ data: 'ok' }));
      const req = createRequest('GET');

      const response = await handler(req);

      expect(response.status).toBe(200);
    });
  });

  describe('Handler execution', () => {
    it('returns 200 with data for GET requests', async () => {
      const handler = withApiHandler(async () => ({
        data: { id: 1, name: 'Test' },
      }));
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual({ id: 1, name: 'Test' });
    });

    it('returns 201 for POST requests', async () => {
      const handler = withApiHandler(async () => ({
        data: { id: 'new-123' },
      }));
      const req = createRequest('POST');

      const response = await handler(req);

      expect(response.status).toBe(201);
    });

    it('returns 204 for DELETE requests', async () => {
      const handler = withApiHandler(async () => ({}));
      const req = createRequest('DELETE');

      const response = await handler(req);

      expect(response.status).toBe(204);
    });

    it('passes through raw Response from handler', async () => {
      const rawResponse = new Response('custom', { status: 202 });
      const handler = withApiHandler(async () => rawResponse);
      const req = createRequest('GET');

      const response = await handler(req);

      expect(response.status).toBe(202);
    });

    it('provides userId in context', async () => {
      let capturedUserId = '';
      const handler = withApiHandler(async (_req, ctx) => {
        capturedUserId = ctx.userId;
        return { data: 'ok' };
      });
      const req = createRequest('GET');

      await handler(req);

      expect(capturedUserId).toBe('user-123');
    });
  });

  describe('Audit step', () => {
    it('records audit for write operations with _audit field', async () => {
      const { recordAudit } = await import('./audit');
      const handler = withApiHandler(async () => ({
        data: { id: 'new-1' },
        _audit: {
          entityType: 'kpi_value',
          entityId: 'new-1',
          newValue: { value: 42 },
        },
      }));
      const req = createRequest('POST');

      await handler(req);

      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-456' }),
        expect.objectContaining({
          entityType: 'kpi_value',
          entityId: 'new-1',
          newValue: { value: 42 },
        })
      );
    });

    it('does not record audit for GET requests', async () => {
      const { recordAudit } = await import('./audit');
      const handler = withApiHandler(async () => ({
        data: 'ok',
        _audit: { entityType: 'test', entityId: '1' },
      }));
      const req = createRequest('GET');

      await handler(req);

      expect(recordAudit).not.toHaveBeenCalled();
    });

    it('strips _audit from response body', async () => {
      const handler = withApiHandler(async () => ({
        data: { id: 'new-1' },
        _audit: { entityType: 'test', entityId: '1', newValue: {} },
      }));
      const req = createRequest('POST');

      const response = await handler(req);
      const body = await response.json();

      expect(body).not.toHaveProperty('_audit');
      expect(body.data).toEqual({ id: 'new-1' });
    });

    it('skips audit when audit option is disabled', async () => {
      const { recordAudit } = await import('./audit');
      const handler = withApiHandler(
        async () => ({
          data: { id: 'new-1' },
          _audit: { entityType: 'test', entityId: '1', newValue: {} },
        }),
        { audit: false }
      );
      const req = createRequest('POST');

      await handler(req);

      expect(recordAudit).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('returns formatted error for AppError', async () => {
      const { AppError } = await import('@/lib/errors');
      const handler = withApiHandler(async () => {
        throw new AppError(ErrorCode.NOT_FOUND, 'Item not found', 404);
      });
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Item not found');
    });

    it('returns 500 for unexpected errors', async () => {
      const handler = withApiHandler(async () => {
        throw new Error('Something broke');
      });
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe('PROCESSING_ERROR');
    });

    it('hides error details in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const handler = withApiHandler(async () => {
        throw new Error('Sensitive database error');
      });
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(body.error.message).toBe('An unexpected error occurred');
      expect(body.error.message).not.toContain('Sensitive');

      vi.unstubAllEnvs();
    });
  });

  describe('Review findings - edge cases', () => {
    it('does not crash when audit recording fails', async () => {
      const { recordAudit } = await import('./audit');
      (recordAudit as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB connection lost')
      );

      const handler = withApiHandler(async () => ({
        data: { id: 'new-1' },
        _audit: { entityType: 'test', entityId: '1', newValue: {} },
      }));
      const req = createRequest('POST');

      const response = await handler(req);

      // Should still return success since business logic succeeded
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data).toEqual({ id: 'new-1' });
    });

    it('strips _audit from response even when auditEnabled=false', async () => {
      const handler = withApiHandler(
        async () => ({
          data: { id: 'new-1' },
          _audit: { entityType: 'test', entityId: '1', newValue: {} },
        }),
        { audit: false }
      );
      const req = createRequest('POST');

      const response = await handler(req);
      const body = await response.json();

      expect(body).not.toHaveProperty('_audit');
      expect(body.data).toEqual({ id: 'new-1' });
    });

    it('wraps null result in data property', async () => {
      const handler = withApiHandler(async () => null as unknown);
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ data: null });
    });

    it('wraps primitive result in data property', async () => {
      const handler = withApiHandler(async () => 'hello' as unknown);
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ data: 'hello' });
    });

    it('returns 401 when session role is invalid', async () => {
      mockAuth.mockResolvedValue(createSession({ role: 'superuser' }));
      const handler = withApiHandler(async () => ({ data: 'ok' }));
      const req = createRequest('GET');

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCode.AUTH_REQUIRED);
      expect(body.error.message).toContain('role');
    });

    it('returns 401 when session role is empty string', async () => {
      mockAuth.mockResolvedValue(createSession({ role: '' }));
      const handler = withApiHandler(async () => ({ data: 'ok' }));
      const req = createRequest('GET');

      const response = await handler(req);

      expect(response.status).toBe(401);
    });
  });

  describe('Full middleware chain order', () => {
    it('executes in order: auth → tenant → role → handler → audit', async () => {
      const executionOrder: string[] = [];

      // Track setTenantContext call
      const { setTenantContext } = await import('@/db');
      (setTenantContext as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        executionOrder.push('tenant');
      });

      // Track audit call
      const { recordAudit } = await import('./audit');
      (recordAudit as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        executionOrder.push('audit');
      });

      const handler = withApiHandler(
        async () => {
          executionOrder.push('handler');
          return {
            data: 'result',
            _audit: { entityType: 'test', entityId: '1', newValue: {} },
          };
        },
        { roles: ['admin'] }
      );

      const req = createRequest('POST');
      await handler(req);

      // Auth happens implicitly (session check before tenant)
      expect(executionOrder).toEqual(['tenant', 'handler', 'audit']);
    });
  });
});
