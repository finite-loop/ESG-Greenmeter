import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth — must use factory function pattern like handler.test.ts
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock tenant context (setTenantContext is imported by tenant middleware)
vi.mock('@/db', () => ({
  db: {},
  setTenantContext: vi.fn().mockResolvedValue(undefined),
}));

// Mock audit middleware internals (used by withApiHandler)
vi.mock('@/middleware/audit', () => ({
  isWriteOperation: (method: string) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock the audit service
const mockGetFiltered = vi.fn();
vi.mock('@/services/auditService', () => ({
  auditService: {
    getFiltered: (...args: unknown[]) => mockGetFiltered(...args),
  },
}));

import { GET } from './route';

function createRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function createSession(role: 'admin' | 'analyst' | 'department' | 'viewer' = 'admin') {
  return {
    user: {
      userId: 'user-123',
      tenantId: 'tenant-456',
      role,
      name: 'Test User',
      email: 'test@test.com',
    },
    expires: '2099-01-01',
  };
}

describe('GET /api/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetFiltered.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('http://localhost/api/audit');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));

    const req = createRequest('http://localhost/api/audit');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));

    const req = createRequest('http://localhost/api/audit');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns paginated audit entries for admin', async () => {
    const mockData = [
      {
        logId: 'log-1',
        tenantId: 'tenant-456',
        userId: 'user-123',
        action: 'CREATE',
        entityType: 'kpi_value',
        entityId: 'entity-1',
        oldValue: null,
        newValue: { value: 42 },
        metadata: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ];

    mockGetFiltered.mockResolvedValue({
      data: mockData,
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const req = createRequest('http://localhost/api/audit');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('returns paginated audit entries for analyst', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));

    const req = createRequest('http://localhost/api/audit');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('passes filter params to service', async () => {
    const req = createRequest(
      'http://localhost/api/audit?entityType=goal&action=UPDATE&page=2&pageSize=10'
    );
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockGetFiltered).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'goal',
        action: 'UPDATE',
        page: 2,
        pageSize: 10,
      })
    );
  });

  it('passes date filters correctly', async () => {
    const req = createRequest(
      'http://localhost/api/audit?dateFrom=2026-01-01&dateTo=2026-06-30'
    );
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockGetFiltered).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
      })
    );
  });

  it('returns 400 for invalid action value', async () => {
    const req = createRequest(
      'http://localhost/api/audit?action=INVALID_ACTION'
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid userId format', async () => {
    const req = createRequest(
      'http://localhost/api/audit?userId=not-a-uuid'
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('uses default pagination when not specified', async () => {
    const req = createRequest('http://localhost/api/audit');
    await GET(req);

    expect(mockGetFiltered).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      })
    );
  });

  it('passes userId filter when valid UUID provided', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const req = createRequest(
      `http://localhost/api/audit?userId=${validUuid}`
    );
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockGetFiltered).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: validUuid,
      })
    );
  });
});
