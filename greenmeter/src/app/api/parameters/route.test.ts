import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock tenant context
vi.mock('@/db', () => ({
  db: {},
  setTenantContext: vi.fn().mockResolvedValue(undefined),
}));

// Mock audit middleware
vi.mock('@/middleware/audit', () => ({
  isWriteOperation: (method: string) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock parameter service
const mockList = vi.fn();
vi.mock('@/services/parameterService', () => ({
  parameterService: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

import { GET } from './route';

function createGetRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function createSession(role: 'admin' | 'analyst' | 'department' | 'viewer' = 'admin') {
  return {
    user: {
      userId: 'user-123',
      tenantId: 'tenant-456',
      role,
      name: 'Test Admin',
      email: 'admin@test.com',
    },
    expires: '2099-01-01',
  };
}

describe('GET /api/parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockList.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest('http://localhost/api/parameters');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest('http://localhost/api/parameters');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/parameters');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns paginated parameters for admin', async () => {
    const mockData = [
      {
        paramId: 'param-1',
        tenantId: null,
        standard: 'BRSR',
        code: 'E-P6-01',
        name: 'GHG Emissions (Scope 1)',
        pillar: 'E',
        unit: 'tCO2e',
        category: 'Climate',
        overrideParamId: null,
      },
    ];

    mockList.mockResolvedValue({
      data: mockData,
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const req = createGetRequest('http://localhost/api/parameters');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].code).toBe('E-P6-01');
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest('http://localhost/api/parameters');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('passes filter parameters to service', async () => {
    const req = createGetRequest(
      'http://localhost/api/parameters?standard=BRSR&pillar=E&category=Climate&search=GHG&page=2&pageSize=10'
    );
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        standard: 'BRSR',
        pillar: 'E',
        category: 'Climate',
        search: 'GHG',
        page: 2,
        pageSize: 10,
      })
    );
  });

  it('uses default pagination when not specified', async () => {
    const req = createGetRequest('http://localhost/api/parameters');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      })
    );
  });

  it('returns 400 for invalid standard', async () => {
    const req = createGetRequest('http://localhost/api/parameters?standard=INVALID');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid pillar', async () => {
    const req = createGetRequest('http://localhost/api/parameters?pillar=X');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
