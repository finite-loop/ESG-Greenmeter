import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError, ErrorCode } from '@/lib/errors';

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
const mockGetById = vi.fn();
const mockUpdate = vi.fn();
vi.mock('@/services/userService', () => ({
  userService: {
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { GET, PUT } from './route';

const validUserId = '550e8400-e29b-41d4-a716-446655440000';
const currentUserId = 'a0000000-0000-4000-a000-000000000001';

function createGetRequest(userId: string): NextRequest {
  return new NextRequest(`http://localhost/api/users/${userId}`, { method: 'GET' });
}

function createPutRequest(userId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createSession(role: 'admin' | 'analyst' | 'department' | 'viewer' = 'admin') {
  return {
    user: {
      userId: currentUserId,
      tenantId: 'tenant-456',
      role,
      name: 'Test Admin',
      email: 'admin@test.com',
    },
    expires: '2099-01-01',
  };
}

const mockUser = {
  userId: validUserId,
  tenantId: 'tenant-456',
  name: 'Jane Doe',
  email: 'jane@test.com',
  role: 'analyst',
  departmentId: null,
  status: 'active',
  lastLogin: new Date('2026-05-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('GET /api/users/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetById.mockResolvedValue(mockUser);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(validUserId);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for non-admin roles', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest(validUserId);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns user by ID for admin', async () => {
    const req = createGetRequest(validUserId);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Jane Doe');
    expect(body.data.email).toBe('jane@test.com');
    expect(mockGetById).toHaveBeenCalledWith(validUserId);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createGetRequest('not-a-uuid');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/users/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetById.mockResolvedValue(mockUser);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPutRequest(validUserId, { role: 'admin' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for non-admin roles', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest(validUserId, { role: 'admin' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('updates user role', async () => {
    const updatedUser = { ...mockUser, role: 'admin' };
    mockUpdate.mockResolvedValue(updatedUser);

    const req = createPutRequest(validUserId, { role: 'admin' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.role).toBe('admin');
    expect(mockUpdate).toHaveBeenCalledWith(
      validUserId,
      expect.objectContaining({ role: 'admin' }),
      currentUserId
    );
  });

  it('deactivates user', async () => {
    const deactivatedUser = { ...mockUser, status: 'deactivated' };
    mockUpdate.mockResolvedValue(deactivatedUser);

    const req = createPutRequest(validUserId, { active: false });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      validUserId,
      expect.objectContaining({ active: false }),
      currentUserId
    );
  });

  it('returns 403 when admin tries to modify themselves', async () => {
    mockUpdate.mockRejectedValue(
      new AppError(ErrorCode.FORBIDDEN, 'You cannot modify your own account', 403)
    );

    const req = createPutRequest(currentUserId, { role: 'viewer' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 when deactivating last admin', async () => {
    mockUpdate.mockRejectedValue(
      new AppError(ErrorCode.FORBIDDEN, 'Cannot remove the last active administrator. At least one admin must remain.', 403)
    );

    const req = createPutRequest(validUserId, { active: false });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for invalid role', async () => {
    const req = createPutRequest(validUserId, { role: 'superadmin' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts empty update', async () => {
    mockUpdate.mockResolvedValue(mockUser);

    const req = createPutRequest(validUserId, {});
    const response = await PUT(req);

    expect(response.status).toBe(200);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createPutRequest('not-a-uuid', { role: 'admin' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
