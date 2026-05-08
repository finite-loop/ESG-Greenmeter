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

const mockGetById = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteGoal = vi.fn();
vi.mock('@/services/goalService', () => ({
  goalService: {
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    deleteGoal: (...args: unknown[]) => mockDeleteGoal(...args),
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

const baseGoal = {
  goalId: VALID_UUID,
  tenantId: 'tenant-456',
  name: 'Reduce Emissions',
  targetValue: '100',
  targetYear: '2030',
  status: 'active',
  components: [],
  progress: 0,
};

describe('GET /api/goals/[goalId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}`);
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('returns goal detail with components', async () => {
    mockGetById.mockResolvedValue(baseGoal);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}`);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Reduce Emissions');
    expect(body.data.components).toEqual([]);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createGetRequest('http://localhost/api/goals/not-a-uuid');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    mockGetById.mockResolvedValue(baseGoal);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}`);
    const response = await GET(req);
    expect(response.status).toBe(200);
  });
});

describe('PUT /api/goals/[goalId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPutRequest(`http://localhost/api/goals/${VALID_UUID}`, { name: 'Updated' });
    const response = await PUT(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest(`http://localhost/api/goals/${VALID_UUID}`, { name: 'Updated' });
    const response = await PUT(req);
    expect(response.status).toBe(403);
  });

  it('updates goal with valid data', async () => {
    const updatedGoal = { ...baseGoal, name: 'Updated Goal' };
    mockUpdate.mockResolvedValue({ oldValue: baseGoal, newValue: updatedGoal });

    const req = createPutRequest(`http://localhost/api/goals/${VALID_UUID}`, { name: 'Updated Goal' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Updated Goal');
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createPutRequest('http://localhost/api/goals/not-a-uuid', { name: 'X' });
    const response = await PUT(req);
    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/goals/[goalId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createDeleteRequest(`http://localhost/api/goals/${VALID_UUID}`);
    const response = await DELETE(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createDeleteRequest(`http://localhost/api/goals/${VALID_UUID}`);
    const response = await DELETE(req);
    expect(response.status).toBe(403);
  });

  it('deletes goal and returns 204', async () => {
    mockDeleteGoal.mockResolvedValue(baseGoal);

    const req = createDeleteRequest(`http://localhost/api/goals/${VALID_UUID}`);
    const response = await DELETE(req);

    expect(response.status).toBe(204);
    expect(mockDeleteGoal).toHaveBeenCalledWith(VALID_UUID, 'tenant-456');
  });
});
