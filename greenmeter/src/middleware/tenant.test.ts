import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantMiddleware } from './tenant';
import { AppError, ErrorCode } from '@/lib/errors';
import type { AuthenticatedContext } from './types';

vi.mock('@/db', () => ({
  setTenantContext: vi.fn().mockResolvedValue(undefined),
}));

function createMockContext(overrides: Partial<{
  tenantId: string;
  userId: string;
  role: string;
}>): AuthenticatedContext {
  return {
    req: {} as AuthenticatedContext['req'],
    session: {
      user: {
        userId: overrides.userId ?? 'user-123',
        tenantId: overrides.tenantId ?? 'tenant-456',
        role: (overrides.role ?? 'admin') as AuthenticatedContext['session']['user']['role'],
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: '2099-01-01',
    },
    tenantId: '',
    userId: overrides.userId ?? 'user-123',
  };
}

describe('tenantMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets tenantId on context from session', async () => {
    const ctx = createMockContext({ tenantId: 'tenant-abc' });

    await tenantMiddleware(ctx);

    expect(ctx.tenantId).toBe('tenant-abc');
  });

  it('calls setTenantContext with the tenant ID', async () => {
    const { setTenantContext } = await import('@/db');
    const ctx = createMockContext({ tenantId: 'tenant-xyz' });

    await tenantMiddleware(ctx);

    expect(setTenantContext).toHaveBeenCalledWith('tenant-xyz');
  });

  it('throws AUTH_REQUIRED when tenantId is empty', async () => {
    const ctx = createMockContext({ tenantId: '' });

    await expect(tenantMiddleware(ctx)).rejects.toThrow(AppError);
    await expect(tenantMiddleware(ctx)).rejects.toMatchObject({
      code: ErrorCode.AUTH_REQUIRED,
      status: 401,
    });
  });

  it('throws AUTH_REQUIRED when tenantId is undefined', async () => {
    const ctx = createMockContext({});
    // Force undefined tenantId
    (ctx.session.user as unknown as Record<string, unknown>).tenantId = undefined;

    await expect(tenantMiddleware(ctx)).rejects.toThrow(AppError);
  });
});
