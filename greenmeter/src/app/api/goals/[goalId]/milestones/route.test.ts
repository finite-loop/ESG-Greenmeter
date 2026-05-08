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

const mockGetMilestones = vi.fn();
const mockCreateMilestone = vi.fn();
vi.mock('@/services/goalService', () => ({
  goalService: {
    getMilestones: (...args: unknown[]) => mockGetMilestones(...args),
    createMilestone: (...args: unknown[]) => mockCreateMilestone(...args),
  },
}));

import { GET, POST } from './route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

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

describe('GET /api/goals/[goalId]/milestones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetMilestones.mockResolvedValue([]);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/milestones`);
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('returns milestones for admin', async () => {
    const mockData = [
      {
        milestoneId: 'ms-1',
        goalId: VALID_UUID,
        name: '10% Reduction',
        status: 'pending',
        targetValue: '135',
        targetDate: '2027-06-30',
      },
    ];
    mockGetMilestones.mockResolvedValue(mockData);

    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/milestones`);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('10% Reduction');
  });

  it('returns milestones for viewer role (read-only)', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/milestones`);
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('returns 400 for invalid goal UUID', async () => {
    const req = createGetRequest('http://localhost/api/goals/not-a-uuid/milestones');
    const response = await GET(req);
    expect(response.status).toBe(400);
  });
});

describe('POST /api/goals/[goalId]/milestones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/milestones`,
      { name: 'Test Milestone' }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/milestones`,
      { name: 'Test Milestone' }
    );
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('creates milestone with valid data', async () => {
    const newMilestone = {
      milestoneId: 'ms-new',
      goalId: VALID_UUID,
      tenantId: 'tenant-456',
      name: '10% Reduction by Q2',
      description: null,
      targetValue: '135',
      targetDate: '2027-06-30',
      status: 'pending',
      achievedAt: null,
      sortOrder: 0,
      createdAt: new Date('2026-01-01').toISOString(),
    };
    mockCreateMilestone.mockResolvedValue(newMilestone);

    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/milestones`,
      { name: '10% Reduction by Q2', targetValue: '135', targetDate: '2027-06-30' }
    );
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe('10% Reduction by Q2');
    expect(mockCreateMilestone).toHaveBeenCalledWith(
      VALID_UUID,
      'tenant-456',
      expect.objectContaining({
        name: '10% Reduction by Q2',
        targetValue: '135',
      })
    );
  });

  it('creates milestone with only name', async () => {
    const newMilestone = {
      milestoneId: 'ms-new',
      goalId: VALID_UUID,
      tenantId: 'tenant-456',
      name: 'Basic Milestone',
      status: 'pending',
    };
    mockCreateMilestone.mockResolvedValue(newMilestone);

    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/milestones`,
      { name: 'Basic Milestone' }
    );
    const response = await POST(req);

    expect(response.status).toBe(201);
  });

  it('returns 400 when name is missing', async () => {
    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/milestones`,
      { targetValue: '100' }
    );
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid goal UUID', async () => {
    const req = createPostRequest(
      'http://localhost/api/goals/not-a-uuid/milestones',
      { name: 'Test' }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest(`http://localhost/api/goals/${VALID_UUID}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when targetValue is non-numeric', async () => {
    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/milestones`,
      { name: 'Test', targetValue: 'abc' }
    );
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
