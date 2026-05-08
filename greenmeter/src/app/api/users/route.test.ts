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

// Mock user service
const mockList = vi.fn();
const mockInvite = vi.fn();
vi.mock('@/services/userService', () => ({
  userService: {
    list: (...args: unknown[]) => mockList(...args),
    invite: (...args: unknown[]) => mockInvite(...args),
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
      name: 'Test Admin',
      email: 'admin@test.com',
    },
    expires: '2099-01-01',
  };
}

describe('GET /api/users', () => {
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
    const req = createGetRequest('http://localhost/api/users');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest('http://localhost/api/users');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest('http://localhost/api/users');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/users');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns paginated users for admin', async () => {
    const mockData = [
      {
        userId: 'user-1',
        tenantId: 'tenant-456',
        name: 'Jane Doe',
        email: 'jane@test.com',
        role: 'analyst',
        departmentId: null,
        status: 'active',
        lastLogin: new Date('2026-05-01'),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ];

    mockList.mockResolvedValue({
      data: mockData,
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const req = createGetRequest('http://localhost/api/users');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Jane Doe');
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('passes filter parameters to service', async () => {
    const req = createGetRequest('http://localhost/api/users?search=Jane&role=analyst&page=2&pageSize=10');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Jane',
        role: 'analyst',
        page: 2,
        pageSize: 10,
      })
    );
  });

  it('uses default pagination when not specified', async () => {
    const req = createGetRequest('http://localhost/api/users');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      })
    );
  });
});

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/users', { email: 'test@test.com', name: 'Test' });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for non-admin roles', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPostRequest('http://localhost/api/users', { email: 'test@test.com', name: 'Test' });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('creates user with valid data', async () => {
    const newUser = {
      userId: 'user-new',
      tenantId: 'tenant-456',
      name: 'New User',
      email: 'new@test.com',
      role: 'analyst',
      departmentId: null,
      status: 'invited',
      lastLogin: null,
      createdAt: new Date('2026-05-06'),
      updatedAt: new Date('2026-05-06'),
    };
    mockInvite.mockResolvedValue(newUser);

    const req = createPostRequest('http://localhost/api/users', {
      email: 'new@test.com',
      name: 'New User',
      role: 'analyst',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe('New User');
    expect(body.data.status).toBe('invited');
    expect(mockInvite).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        email: 'new@test.com',
        name: 'New User',
        role: 'analyst',
      })
    );
  });

  it('returns 400 when email is missing', async () => {
    const req = createPostRequest('http://localhost/api/users', { name: 'Test' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when email is invalid', async () => {
    const req = createPostRequest('http://localhost/api/users', { email: 'not-valid', name: 'Test' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when name is empty', async () => {
    const req = createPostRequest('http://localhost/api/users', { email: 'test@test.com', name: '' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('defaults role to viewer', async () => {
    const newUser = {
      userId: 'user-new',
      tenantId: 'tenant-456',
      name: 'Default Role User',
      email: 'default@test.com',
      role: 'viewer',
      departmentId: null,
      status: 'invited',
      lastLogin: null,
      createdAt: new Date('2026-05-06'),
      updatedAt: new Date('2026-05-06'),
    };
    mockInvite.mockResolvedValue(newUser);

    const req = createPostRequest('http://localhost/api/users', {
      email: 'default@test.com',
      name: 'Default Role User',
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(mockInvite).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({ role: 'viewer' })
    );
  });

  it('rejects invalid role', async () => {
    const req = createPostRequest('http://localhost/api/users', {
      email: 'test@test.com',
      name: 'Test',
      role: 'superadmin',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for department role without departmentId', async () => {
    const req = createPostRequest('http://localhost/api/users', {
      email: 'dept@test.com',
      name: 'Dept User',
      role: 'department',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts departmentId for department role', async () => {
    const newUser = {
      userId: 'user-new',
      tenantId: 'tenant-456',
      name: 'Dept User',
      email: 'dept@test.com',
      role: 'department',
      departmentId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'invited',
      lastLogin: null,
      createdAt: new Date('2026-05-06'),
      updatedAt: new Date('2026-05-06'),
    };
    mockInvite.mockResolvedValue(newUser);

    const req = createPostRequest('http://localhost/api/users', {
      email: 'dept@test.com',
      name: 'Dept User',
      role: 'department',
      departmentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(mockInvite).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        departmentId: '550e8400-e29b-41d4-a716-446655440000',
      })
    );
  });
});
