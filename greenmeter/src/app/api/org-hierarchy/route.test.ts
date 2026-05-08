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
const mockGetTree = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/services/orgHierarchyService', () => ({
  orgHierarchyService: {
    getTree: (...args: unknown[]) => mockGetTree(...args),
    create: (...args: unknown[]) => mockCreate(...args),
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

describe('GET /api/org-hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetTree.mockResolvedValue([]);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest('http://localhost/api/org-hierarchy');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns tree for admin', async () => {
    const mockTree = [
      {
        nodeId: 'node-1',
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
        children: [],
      },
    ];
    mockGetTree.mockResolvedValue(mockTree);

    const req = createGetRequest('http://localhost/api/org-hierarchy');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Acme Corp');
    expect(body.data[0].children).toEqual([]);
  });

  it('returns tree for analyst', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest('http://localhost/api/org-hierarchy');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('returns tree for department user', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest('http://localhost/api/org-hierarchy');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('returns tree for viewer', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/org-hierarchy');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });
});

describe('POST /api/org-hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test',
      nodeType: 'department',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test',
      nodeType: 'department',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test',
      nodeType: 'department',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('creates node with valid data', async () => {
    const newNode = {
      nodeId: 'node-new',
      tenantId: 'tenant-456',
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Engineering',
      nodeType: 'department',
      code: 'ENG',
      currency: null,
      level: 1,
      active: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    mockCreate.mockResolvedValue(newNode);

    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Engineering',
      nodeType: 'department',
      code: 'ENG',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe('Engineering');
    expect(body.data.nodeType).toBe('department');
    expect(mockCreate).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Engineering',
        nodeType: 'department',
        code: 'ENG',
      })
    );
  });

  it('returns 400 when name is missing', async () => {
    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      nodeType: 'department',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when parentNodeId is missing', async () => {
    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      name: 'Test',
      nodeType: 'department',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid nodeType', async () => {
    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test',
      nodeType: 'team',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid parentNodeId format', async () => {
    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      parentNodeId: 'not-a-uuid',
      name: 'Test',
      nodeType: 'department',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates node with only required fields', async () => {
    const newNode = {
      nodeId: 'node-new',
      tenantId: 'tenant-456',
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Simple Dept',
      nodeType: 'department',
      code: null,
      currency: null,
      level: 1,
      active: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    mockCreate.mockResolvedValue(newNode);

    const req = createPostRequest('http://localhost/api/org-hierarchy', {
      parentNodeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Simple Dept',
      nodeType: 'department',
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({ name: 'Simple Dept' })
    );
  });
});
