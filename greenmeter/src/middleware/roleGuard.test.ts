import { describe, it, expect } from 'vitest';
import { roleGuardMiddleware } from './roleGuard';
import { AppError, ErrorCode } from '@/lib/errors';
import type { AuthenticatedContext } from './types';

function createMockContext(role: AuthenticatedContext['session']['user']['role']): AuthenticatedContext {
  return {
    req: {} as AuthenticatedContext['req'],
    session: {
      user: {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role,
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: '2099-01-01',
    },
    tenantId: 'tenant-456',
    userId: 'user-123',
  };
}

describe('roleGuardMiddleware', () => {
  it('allows access when no roles are required (empty array)', () => {
    const ctx = createMockContext('viewer');

    expect(() => roleGuardMiddleware(ctx, [])).not.toThrow();
  });

  it('allows access when user role is in the required list', () => {
    const ctx = createMockContext('admin');

    expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst'])).not.toThrow();
  });

  it('allows access for analyst role', () => {
    const ctx = createMockContext('analyst');

    expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst'])).not.toThrow();
  });

  it('throws FORBIDDEN when user role is not in required list', () => {
    const ctx = createMockContext('viewer');

    expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst'])).toThrow(AppError);

    try {
      roleGuardMiddleware(ctx, ['admin', 'analyst']);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.code).toBe(ErrorCode.FORBIDDEN);
      expect(appError.status).toBe(403);
      expect(appError.message).toContain('viewer');
    }
  });

  it('throws FORBIDDEN for department user accessing admin-only routes', () => {
    const ctx = createMockContext('department');

    expect(() => roleGuardMiddleware(ctx, ['admin'])).toThrow(AppError);
  });

  it('allows department user on routes that include department', () => {
    const ctx = createMockContext('department');

    expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst', 'department'])).not.toThrow();
  });

  describe('Role Permissions Matrix', () => {
    it('admin has access to all route categories', () => {
      const ctx = createMockContext('admin');

      // User management - admin only
      expect(() => roleGuardMiddleware(ctx, ['admin'])).not.toThrow();
      // KPI write
      expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst', 'department'])).not.toThrow();
      // Report generation
      expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst'])).not.toThrow();
    });

    it('analyst cannot access user management', () => {
      const ctx = createMockContext('analyst');

      expect(() => roleGuardMiddleware(ctx, ['admin'])).toThrow(AppError);
    });

    it('viewer cannot access write operations', () => {
      const ctx = createMockContext('viewer');

      expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst', 'department'])).toThrow(AppError);
    });

    it('viewer can access read-only routes', () => {
      const ctx = createMockContext('viewer');

      expect(() => roleGuardMiddleware(ctx, ['admin', 'analyst', 'department', 'viewer'])).not.toThrow();
    });
  });
});
