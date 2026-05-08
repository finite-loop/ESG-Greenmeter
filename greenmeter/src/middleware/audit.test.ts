import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isWriteOperation, recordAudit, type AuditEntry } from './audit';
import type { AuthenticatedContext } from './types';

const mockLogChange = vi.fn().mockResolvedValue(undefined);

vi.mock('@/services/auditService', () => ({
  auditService: {
    logChange: (...args: unknown[]) => mockLogChange(...args),
  },
}));

function createMockContext(overrides?: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
}): AuthenticatedContext {
  const headers = new Map(Object.entries(overrides?.headers ?? {}));
  return {
    req: {
      method: overrides?.method ?? 'POST',
      url: overrides?.url ?? 'http://localhost/api/kpi-values',
      headers: {
        get: (key: string) => headers.get(key) ?? null,
      },
    } as unknown as AuthenticatedContext['req'],
    session: {
      user: {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: 'admin' as const,
        name: 'Test',
        email: 'test@example.com',
      },
      expires: '2099-01-01',
    },
    tenantId: 'tenant-456',
    userId: 'user-123',
  };
}

describe('isWriteOperation', () => {
  it('returns true for POST', () => {
    expect(isWriteOperation('POST')).toBe(true);
  });

  it('returns true for PUT', () => {
    expect(isWriteOperation('PUT')).toBe(true);
  });

  it('returns true for PATCH', () => {
    expect(isWriteOperation('PATCH')).toBe(true);
  });

  it('returns true for DELETE', () => {
    expect(isWriteOperation('DELETE')).toBe(true);
  });

  it('returns false for GET', () => {
    expect(isWriteOperation('GET')).toBe(false);
  });

  it('returns false for HEAD', () => {
    expect(isWriteOperation('HEAD')).toBe(false);
  });

  it('returns false for OPTIONS', () => {
    expect(isWriteOperation('OPTIONS')).toBe(false);
  });
});

describe('recordAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls auditService.logChange with correct fields', async () => {
    const ctx = createMockContext({
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
    });

    const entry: AuditEntry = {
      entityType: 'kpi_value',
      entityId: 'value-789',
      newValue: { value: 42 },
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledOnce();
    expect(mockLogChange).toHaveBeenCalledWith({
      tenantId: 'tenant-456',
      userId: 'user-123',
      action: 'CREATE',
      entityType: 'kpi_value',
      entityId: 'value-789',
      oldValue: undefined,
      newValue: { value: 42 },
      metadata: {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        path: '/api/kpi-values',
      },
    });
  });

  it('records UPDATE action for PUT method', async () => {
    const ctx = createMockContext({ method: 'PUT' });

    const entry: AuditEntry = {
      entityType: 'user',
      entityId: 'user-999',
      oldValue: { name: 'Old' },
      newValue: { name: 'New' },
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        oldValue: { name: 'Old' },
        newValue: { name: 'New' },
      })
    );
  });

  it('records UPDATE action for PATCH method', async () => {
    const ctx = createMockContext({ method: 'PATCH' });

    const entry: AuditEntry = {
      entityType: 'config',
      entityId: 'config-1',
      oldValue: { val: 1 },
      newValue: { val: 2 },
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE' })
    );
  });

  it('records DELETE action for DELETE method', async () => {
    const ctx = createMockContext({ method: 'DELETE' });

    const entry: AuditEntry = {
      entityType: 'goal',
      entityId: 'goal-111',
      oldValue: { title: 'Old goal' },
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        oldValue: { title: 'Old goal' },
      })
    );
  });

  it('extracts only client IP from x-forwarded-for chain', async () => {
    const ctx = createMockContext({
      headers: {
        'x-forwarded-for': '203.0.113.50, 70.41.3.18, 150.172.238.178',
        'user-agent': 'TestAgent',
      },
    });

    const entry: AuditEntry = {
      entityType: 'config',
      entityId: 'config-1',
      newValue: {},
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          ip: '203.0.113.50',
        }),
      })
    );
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    const ctx = createMockContext({
      headers: {
        'x-real-ip': '10.0.0.5',
        'user-agent': 'TestAgent',
      },
    });

    const entry: AuditEntry = {
      entityType: 'test',
      entityId: 'test-1',
      newValue: {},
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          ip: '10.0.0.5',
        }),
      })
    );
  });

  it('defaults IP to unknown when no IP headers present', async () => {
    const ctx = createMockContext({ headers: {} });

    const entry: AuditEntry = {
      entityType: 'test',
      entityId: 'test-1',
      newValue: {},
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          ip: 'unknown',
        }),
      })
    );
  });

  it('handles lowercase method by uppercasing in action mapping', async () => {
    const ctx = createMockContext({ method: 'post' });

    const entry: AuditEntry = {
      entityType: 'test',
      entityId: 'test-1',
      newValue: {},
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE' })
    );
  });

  it('includes path in metadata', async () => {
    const ctx = createMockContext({
      url: 'http://localhost/api/goals/goal-1',
      headers: {
        'user-agent': 'TestAgent/1.0',
      },
    });

    const entry: AuditEntry = {
      entityType: 'goal',
      entityId: 'goal-1',
      newValue: { key: 'value' },
    };

    await recordAudit(ctx, entry);

    expect(mockLogChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          path: '/api/goals/goal-1',
          userAgent: 'TestAgent/1.0',
        }),
      })
    );
  });
});
