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

// Mock kpi service
const mockListValues = vi.fn();
const mockCreateValue = vi.fn();
vi.mock('@/services/kpiService', () => ({
  kpiService: {
    listValues: (...args: unknown[]) => mockListValues(...args),
    createValue: (...args: unknown[]) => mockCreateValue(...args),
  },
}));

import { GET, POST } from './route';

function createGetRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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

describe('GET /api/kpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockListValues.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest('http://localhost/api/kpi');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns empty list with default filters', async () => {
    const req = createGetRequest('http://localhost/api/kpi');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 0 });
    expect(mockListValues).toHaveBeenCalledWith('tenant-456', expect.objectContaining({
      page: 1,
      pageSize: 20,
    }));
  });

  it('passes filter params to service', async () => {
    const req = createGetRequest(
      'http://localhost/api/kpi?standard=BRSR&pillar=E&page=2&pageSize=10'
    );
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockListValues).toHaveBeenCalledWith('tenant-456', expect.objectContaining({
      standard: 'BRSR',
      pillar: 'E',
      page: 2,
      pageSize: 10,
    }));
  });

  it('returns KPI values with RAG status', async () => {
    const mockData = [
      {
        valueId: 'val-1',
        paramId: 'param-1',
        paramCode: 'ENV-001',
        paramName: 'GHG Emissions',
        pillar: 'E',
        category: 'Climate',
        standard: 'BRSR',
        paramUnit: 'tCO2e',
        value: '1200',
        valueText: null,
        verified: true,
        ragStatus: 'green',
      },
    ];
    mockListValues.mockResolvedValue({
      data: mockData,
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const req = createGetRequest('http://localhost/api/kpi?standard=BRSR');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].ragStatus).toBe('green');
    expect(body.data[0].paramName).toBe('GHG Emissions');
  });

  it('allows viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/kpi');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('allows department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest('http://localhost/api/kpi');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('returns 400 for invalid standard filter', async () => {
    const req = createGetRequest('http://localhost/api/kpi?standard=INVALID');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/kpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/kpi', {
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      sourceType: 'manual',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/kpi', {
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      sourceType: 'manual',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('creates KPI value with valid data', async () => {
    const created = {
      valueId: 'val-new',
      tenantId: 'tenant-456',
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      value: '500',
      valueText: null,
      unit: 'tCO2e',
      sourceType: 'manual',
      sourceRef: null,
      verified: false,
      notApplicable: false,
      createdAt: new Date('2026-05-06'),
      updatedAt: new Date('2026-05-06'),
    };
    mockCreateValue.mockResolvedValue(created);

    const req = createPostRequest('http://localhost/api/kpi', {
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      value: '500',
      unit: 'tCO2e',
      sourceType: 'manual',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.valueId).toBe('val-new');
    expect(body.data.value).toBe('500');
    expect(mockCreateValue).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        paramId: '550e8400-e29b-41d4-a716-446655440000',
        nodeId: '550e8400-e29b-41d4-a716-446655440001',
        periodId: '550e8400-e29b-41d4-a716-446655440002',
        sourceType: 'manual',
      })
    );
  });

  it('returns 400 when paramId is missing', async () => {
    const req = createPostRequest('http://localhost/api/kpi', {
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      sourceType: 'manual',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid sourceType', async () => {
    const req = createPostRequest('http://localhost/api/kpi', {
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      sourceType: 'invalid',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid UUID format', async () => {
    const req = createPostRequest('http://localhost/api/kpi', {
      paramId: 'not-a-uuid',
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      sourceType: 'manual',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows department role to create', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const created = {
      valueId: 'val-new',
      tenantId: 'tenant-456',
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      value: '100',
      sourceType: 'manual',
      verified: false,
      notApplicable: false,
      createdAt: new Date('2026-05-06'),
      updatedAt: new Date('2026-05-06'),
    };
    mockCreateValue.mockResolvedValue(created);

    const req = createPostRequest('http://localhost/api/kpi', {
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      nodeId: '550e8400-e29b-41d4-a716-446655440001',
      periodId: '550e8400-e29b-41d4-a716-446655440002',
      value: '100',
      sourceType: 'manual',
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });
});
