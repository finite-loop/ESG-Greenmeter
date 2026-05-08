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

// Mock org hierarchy service
const mockGetById = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
vi.mock('@/services/orgHierarchyService', () => ({
  orgHierarchyService: {
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
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

const mockNode = {
  nodeId: VALID_UUID,
  tenantId: 'tenant-456',
  parentNodeId: null,
  name: 'Acme Corp',
  nodeType: 'company',
  code: 'ACME',
  currency: 'INR',
  level: 0,
  active: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('GET /api/org-hierarchy/[nodeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns node for admin', async () => {
    mockGetById.mockResolvedValue(mockNode);
    const req = createGetRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Acme Corp');
    expect(body.data.nodeType).toBe('company');
  });

  it('returns node for viewer', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    mockGetById.mockResolvedValue(mockNode);
    const req = createGetRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`);
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createGetRequest('http://localhost/api/org-hierarchy/not-a-uuid');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/org-hierarchy/[nodeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPutRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`, { name: 'Updated' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPutRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`, { name: 'Updated' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`, { name: 'Updated' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('updates node with valid data', async () => {
    const updatedNode = { ...mockNode, name: 'Updated Corp' };
    mockGetById.mockResolvedValue(mockNode);
    mockUpdate.mockResolvedValue(updatedNode);

    const req = createPutRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`, {
      name: 'Updated Corp',
    });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Updated Corp');
    expect(mockUpdate).toHaveBeenCalledWith(VALID_UUID, { name: 'Updated Corp' });
  });

  it('updates nodeType', async () => {
    const updatedNode = { ...mockNode, nodeType: 'division' };
    mockGetById.mockResolvedValue(mockNode);
    mockUpdate.mockResolvedValue(updatedNode);

    const req = createPutRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`, {
      nodeType: 'division',
    });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.nodeType).toBe('division');
  });

  it('returns 400 for invalid nodeType', async () => {
    const req = createPutRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`, {
      nodeType: 'team',
    });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid UUID in path', async () => {
    const req = createPutRequest('http://localhost/api/org-hierarchy/not-a-uuid', { name: 'Test' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/org-hierarchy/[nodeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createDeleteRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`);
    const response = await DELETE(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createDeleteRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`);
    const response = await DELETE(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createDeleteRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`);
    const response = await DELETE(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('deletes node successfully', async () => {
    mockGetById.mockResolvedValue(mockNode);
    mockDelete.mockResolvedValue(undefined);

    const req = createDeleteRequest(`http://localhost/api/org-hierarchy/${VALID_UUID}`);
    const response = await DELETE(req);

    expect(response.status).toBe(204);
    expect(mockDelete).toHaveBeenCalledWith(VALID_UUID);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createDeleteRequest('http://localhost/api/org-hierarchy/not-a-uuid');
    const response = await DELETE(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
