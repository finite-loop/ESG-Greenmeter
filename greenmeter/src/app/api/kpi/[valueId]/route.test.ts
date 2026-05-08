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
const mockGetById = vi.fn();
const mockUpdateValue = vi.fn();
const mockDeleteValue = vi.fn();
vi.mock('@/services/kpiService', () => ({
  kpiService: {
    getById: (...args: unknown[]) => mockGetById(...args),
    updateValue: (...args: unknown[]) => mockUpdateValue(...args),
    deleteValue: (...args: unknown[]) => mockDeleteValue(...args),
  },
}));

import { GET, PUT, DELETE } from './route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function createGetRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function createPutRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'DELETE' });
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

const mockValue = {
  valueId: VALID_UUID,
  tenantId: 'tenant-456',
  paramId: '550e8400-e29b-41d4-a716-446655440001',
  nodeId: '550e8400-e29b-41d4-a716-446655440002',
  periodId: '550e8400-e29b-41d4-a716-446655440003',
  value: '500',
  valueText: null,
  unit: 'tCO2e',
  sourceType: 'manual',
  sourceRef: null,
  verified: false,
  notApplicable: false,
  verifiedBy: null,
  verifiedAt: null,
  createdAt: new Date('2026-05-06'),
  updatedAt: new Date('2026-05-06'),
};

describe('GET /api/kpi/[valueId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetById.mockResolvedValue(mockValue);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(`http://localhost/api/kpi/${VALID_UUID}`);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns KPI value for admin', async () => {
    const req = createGetRequest(`http://localhost/api/kpi/${VALID_UUID}`);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.valueId).toBe(VALID_UUID);
    expect(body.data.value).toBe('500');
    expect(mockGetById).toHaveBeenCalledWith(VALID_UUID, 'tenant-456');
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createGetRequest('http://localhost/api/kpi/not-a-uuid');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest(`http://localhost/api/kpi/${VALID_UUID}`);
    const response = await GET(req);
    expect(response.status).toBe(200);
  });
});

describe('PUT /api/kpi/[valueId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPutRequest(`http://localhost/api/kpi/${VALID_UUID}`, {
      value: '600',
    });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest(`http://localhost/api/kpi/${VALID_UUID}`, {
      value: '600',
    });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('updates value with valid data', async () => {
    const updated = { ...mockValue, value: '600', updatedAt: new Date() };
    mockUpdateValue.mockResolvedValue({ oldValue: mockValue, newValue: updated });

    const req = createPutRequest(`http://localhost/api/kpi/${VALID_UUID}`, {
      value: '600',
    });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.value).toBe('600');
    expect(mockUpdateValue).toHaveBeenCalledWith(
      VALID_UUID,
      'tenant-456',
      expect.objectContaining({ value: '600' })
    );
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createPutRequest('http://localhost/api/kpi/not-a-uuid', {
      value: '600',
    });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows department role to update', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const updated = { ...mockValue, value: '700' };
    mockUpdateValue.mockResolvedValue({ oldValue: mockValue, newValue: updated });

    const req = createPutRequest(`http://localhost/api/kpi/${VALID_UUID}`, {
      value: '700',
    });
    const response = await PUT(req);
    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/kpi/[valueId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockDeleteValue.mockResolvedValue(mockValue);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createDeleteRequest(`http://localhost/api/kpi/${VALID_UUID}`);
    const response = await DELETE(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createDeleteRequest(`http://localhost/api/kpi/${VALID_UUID}`);
    const response = await DELETE(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createDeleteRequest(`http://localhost/api/kpi/${VALID_UUID}`);
    const response = await DELETE(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('deletes value for admin', async () => {
    const req = createDeleteRequest(`http://localhost/api/kpi/${VALID_UUID}`);
    const response = await DELETE(req);

    expect(response.status).toBe(204);
    expect(mockDeleteValue).toHaveBeenCalledWith(VALID_UUID, 'tenant-456');
  });

  it('deletes value for analyst', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createDeleteRequest(`http://localhost/api/kpi/${VALID_UUID}`);
    const response = await DELETE(req);
    expect(response.status).toBe(204);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createDeleteRequest('http://localhost/api/kpi/not-a-uuid');
    const response = await DELETE(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
