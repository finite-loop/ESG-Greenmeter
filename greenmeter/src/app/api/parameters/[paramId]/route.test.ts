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
const mockGetById = vi.fn();
const mockOverrideParameter = vi.fn();
vi.mock('@/services/parameterService', () => ({
  parameterService: {
    getById: (...args: unknown[]) => mockGetById(...args),
    overrideParameter: (...args: unknown[]) => mockOverrideParameter(...args),
  },
}));

import { GET, PUT } from './route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function createGetRequest(paramId: string): NextRequest {
  return new NextRequest(`http://localhost/api/parameters/${paramId}`, { method: 'GET' });
}

function createPutRequest(paramId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/parameters/${paramId}`, {
    method: 'PUT',
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
      name: 'Test Admin',
      email: 'admin@test.com',
    },
    expires: '2099-01-01',
  };
}

const mockParam = {
  paramId: VALID_UUID,
  tenantId: null,
  standard: 'BRSR',
  code: 'E-P6-01',
  name: 'GHG Emissions (Scope 1)',
  pillar: 'E',
  unit: 'tCO2e',
  category: 'Climate',
  overrideParamId: null,
};

describe('GET /api/parameters/[paramId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetById.mockResolvedValue(mockParam);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(VALID_UUID);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest(VALID_UUID);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns parameter detail for admin', async () => {
    const req = createGetRequest(VALID_UUID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.code).toBe('E-P6-01');
    expect(body.data.name).toBe('GHG Emissions (Scope 1)');
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest(VALID_UUID);
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createGetRequest('not-a-uuid');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/parameters/[paramId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockOverrideParameter.mockResolvedValue({
      data: { ...mockParam, name: 'Custom Name', overrideParamId: 'override-1' },
      isNew: true,
      oldValue: mockParam,
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPutRequest(VALID_UUID, { name: 'Custom' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPutRequest(VALID_UUID, { name: 'Custom' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest(VALID_UUID, { name: 'Custom' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('creates override with valid data', async () => {
    const { recordAudit } = await import('@/middleware/audit');
    const req = createPutRequest(VALID_UUID, {
      name: 'Custom Name',
      unit: 'kgCO2e',
      depts: ['Operations'],
    });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Custom Name');
    expect(mockOverrideParameter).toHaveBeenCalledWith(
      'tenant-456',
      VALID_UUID,
      expect.objectContaining({
        name: 'Custom Name',
        unit: 'kgCO2e',
        depts: ['Operations'],
      })
    );
    expect(recordAudit).toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest(`http://localhost/api/parameters/${VALID_UUID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid override data', async () => {
    const req = createPutRequest(VALID_UUID, { direction: 'neutral' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createPutRequest('not-a-uuid', { name: 'Custom' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
