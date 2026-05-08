import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/db', () => ({
  db: {},
  setTenantContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/middleware/audit', () => ({
  isWriteOperation: (method: string) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

const mockList = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/services/goalService', () => ({
  goalService: {
    list: (...args: unknown[]) => mockList(...args),
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

describe('GET /api/goals', () => {
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
    const req = createGetRequest('http://localhost/api/goals');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest('http://localhost/api/goals');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns goals for admin', async () => {
    const mockData = [
      {
        goalId: 'goal-1',
        tenantId: 'tenant-456',
        name: 'Reduce Emissions',
        targetValue: '100',
        targetYear: '2030',
        status: 'active',
        progress: 45,
        componentCount: 2,
      },
    ];
    mockList.mockResolvedValue({
      data: mockData,
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const req = createGetRequest('http://localhost/api/goals');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Reduce Emissions');
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('returns goals for viewer role (read-only)', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/goals');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('passes status filter', async () => {
    const req = createGetRequest('http://localhost/api/goals?status=active&page=2&pageSize=10');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        status: 'active',
        page: 2,
        pageSize: 10,
      })
    );
  });

  it('uses default pagination', async () => {
    const req = createGetRequest('http://localhost/api/goals');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      })
    );
  });
});

describe('POST /api/goals', () => {
  const validGoal = {
    paramId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Reduce Scope 1 Emissions',
    targetValue: '100',
    targetYear: '2030',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/goals', validGoal);
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/goals', validGoal);
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('creates goal with valid data', async () => {
    const newGoal = {
      goalId: 'goal-new',
      tenantId: 'tenant-456',
      name: 'Reduce Scope 1 Emissions',
      targetValue: '100',
      targetYear: '2030',
      status: 'active',
    };
    mockCreate.mockResolvedValue(newGoal);

    const req = createPostRequest('http://localhost/api/goals', validGoal);
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe('Reduce Scope 1 Emissions');
    expect(mockCreate).toHaveBeenCalledWith(
      'tenant-456',
      'user-123',
      expect.objectContaining({
        name: 'Reduce Scope 1 Emissions',
        targetValue: '100',
        targetYear: '2030',
      })
    );
  });

  it('returns 400 when name is missing', async () => {
    const req = createPostRequest('http://localhost/api/goals', {
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      targetValue: '100',
      targetYear: '2030',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when targetValue is non-numeric', async () => {
    const req = createPostRequest('http://localhost/api/goals', {
      ...validGoal,
      targetValue: 'abc',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
