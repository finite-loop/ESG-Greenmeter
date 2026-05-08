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

const mockAddComponent = vi.fn();
vi.mock('@/services/goalService', () => ({
  goalService: {
    addComponent: (...args: unknown[]) => mockAddComponent(...args),
  },
}));

import { POST } from './route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

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

describe('POST /api/goals/[goalId]/components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/components`,
      { name: 'Test', weight: '0.5' }
    );
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/components`,
      { name: 'Test', weight: '0.5' }
    );
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('creates component with valid data', async () => {
    const newComponent = {
      componentId: 'comp-new',
      goalId: VALID_UUID,
      tenantId: 'tenant-456',
      name: 'Fleet Electrification',
      targetValue: '50',
      weight: '0.5',
      paramId: null,
      sortOrder: 0,
      createdAt: new Date('2026-01-01'),
    };
    mockAddComponent.mockResolvedValue(newComponent);

    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/components`,
      { name: 'Fleet Electrification', weight: '0.5', targetValue: '50' }
    );
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe('Fleet Electrification');
    expect(mockAddComponent).toHaveBeenCalledWith(
      VALID_UUID,
      'tenant-456',
      expect.objectContaining({
        name: 'Fleet Electrification',
        weight: '0.5',
      })
    );
  });

  it('returns 400 for invalid goal UUID', async () => {
    const req = createPostRequest(
      'http://localhost/api/goals/not-a-uuid/components',
      { name: 'Test', weight: '0.5' }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when weight is missing', async () => {
    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/components`,
      { name: 'Test' }
    );
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when weight exceeds 1', async () => {
    const req = createPostRequest(
      `http://localhost/api/goals/${VALID_UUID}/components`,
      { name: 'Test', weight: '1.5' }
    );
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
