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

const mockUpdateMilestone = vi.fn();
const mockDeleteMilestone = vi.fn();
vi.mock('@/services/goalService', () => ({
  goalService: {
    updateMilestone: (...args: unknown[]) => mockUpdateMilestone(...args),
    deleteMilestone: (...args: unknown[]) => mockDeleteMilestone(...args),
  },
}));

import { PUT, DELETE } from './route';

const VALID_GOAL_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_MS_UUID = '660e8400-e29b-41d4-a716-446655440001';

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

describe('PUT /api/goals/[goalId]/milestones/[milestoneId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPutRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`,
      { name: 'Updated' }
    );
    const response = await PUT(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`,
      { name: 'Updated' }
    );
    const response = await PUT(req);
    expect(response.status).toBe(403);
  });

  it('updates milestone with valid data', async () => {
    const oldMs = {
      milestoneId: VALID_MS_UUID,
      goalId: VALID_GOAL_UUID,
      name: 'Original',
      status: 'pending',
    };
    const newMs = { ...oldMs, name: 'Updated' };
    mockUpdateMilestone.mockResolvedValue({ oldValue: oldMs, newValue: newMs });

    const req = createPutRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`,
      { name: 'Updated' }
    );
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Updated');
  });

  it('updates milestone status to achieved', async () => {
    const oldMs = { milestoneId: VALID_MS_UUID, status: 'pending' };
    const newMs = { ...oldMs, status: 'achieved', achievedAt: new Date().toISOString() };
    mockUpdateMilestone.mockResolvedValue({ oldValue: oldMs, newValue: newMs });

    const req = createPutRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`,
      { status: 'achieved' }
    );
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('achieved');
  });

  it('returns 400 for invalid goal UUID', async () => {
    const req = createPutRequest(
      `http://localhost/api/goals/not-a-uuid/milestones/${VALID_MS_UUID}`,
      { name: 'Test' }
    );
    const response = await PUT(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid milestone UUID', async () => {
    const req = createPutRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/not-a-uuid`,
      { name: 'Test' }
    );
    const response = await PUT(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid status value', async () => {
    const req = createPutRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`,
      { status: 'invalid_status' }
    );
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }
    );
    const response = await PUT(req);
    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/goals/[goalId]/milestones/[milestoneId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createDeleteRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`
    );
    const response = await DELETE(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createDeleteRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`
    );
    const response = await DELETE(req);
    expect(response.status).toBe(403);
  });

  it('deletes milestone successfully', async () => {
    const deleted = { milestoneId: VALID_MS_UUID, name: 'Deleted MS' };
    mockDeleteMilestone.mockResolvedValue(deleted);

    const req = createDeleteRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`
    );
    const response = await DELETE(req);

    expect(response.status).toBe(204);
    expect(mockDeleteMilestone).toHaveBeenCalledWith(VALID_MS_UUID, 'tenant-456', VALID_GOAL_UUID);
  });

  it('returns 400 for invalid milestone UUID', async () => {
    const req = createDeleteRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/not-a-uuid`
    );
    const response = await DELETE(req);
    expect(response.status).toBe(400);
  });

  it('allows analyst role to delete', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const deleted = { milestoneId: VALID_MS_UUID };
    mockDeleteMilestone.mockResolvedValue(deleted);

    const req = createDeleteRequest(
      `http://localhost/api/goals/${VALID_GOAL_UUID}/milestones/${VALID_MS_UUID}`
    );
    const response = await DELETE(req);
    expect(response.status).toBe(204);
  });
});
