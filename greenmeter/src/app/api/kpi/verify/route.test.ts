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

// Mock audit service
const mockLogChange = vi.fn();
vi.mock('@/services/auditService', () => ({
  auditService: {
    logChange: (...args: unknown[]) => mockLogChange(...args),
  },
}));

// Mock kpi service
const mockVerifyValues = vi.fn();
const mockMarkNotApplicable = vi.fn();
vi.mock('@/services/kpiService', () => ({
  kpiService: {
    verifyValues: (...args: unknown[]) => mockVerifyValues(...args),
    markNotApplicable: (...args: unknown[]) => mockMarkNotApplicable(...args),
  },
}));

import { POST, PUT } from './route';

const UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID_2 = '550e8400-e29b-41d4-a716-446655440002';

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createPutRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
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
      name: 'Test User',
      email: 'test@test.com',
    },
    expires: '2099-01-01',
  };
}

describe('POST /api/kpi/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockLogChange.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 when valueIds is empty', async () => {
    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [] });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when valueIds contains invalid UUIDs', async () => {
    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: ['not-a-uuid'] });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when body is not JSON', async () => {
    const req = new NextRequest('http://localhost/api/kpi/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('verifies values successfully and returns count', async () => {
    const now = new Date();
    mockVerifyValues.mockResolvedValue({
      oldValues: [
        { valueId: UUID_1, verified: false, verifiedBy: null, verifiedAt: null },
        { valueId: UUID_2, verified: false, verifiedBy: null, verifiedAt: null },
      ],
      updated: [
        { valueId: UUID_1, verified: true, verifiedBy: 'user-123', verifiedAt: now },
        { valueId: UUID_2, verified: true, verifiedBy: 'user-123', verifiedAt: now },
      ],
    });

    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1, UUID_2] });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.verified).toBe(2);
    expect(body.data.valueIds).toEqual([UUID_1, UUID_2]);
    expect(mockVerifyValues).toHaveBeenCalledWith('tenant-456', 'user-123', [UUID_1, UUID_2], 'admin');
  });

  it('audit logs each verified value individually', async () => {
    const now = new Date();
    mockVerifyValues.mockResolvedValue({
      oldValues: [
        { valueId: UUID_1, verified: false, verifiedBy: null, verifiedAt: null },
        { valueId: UUID_2, verified: false, verifiedBy: null, verifiedAt: null },
      ],
      updated: [
        { valueId: UUID_1, verified: true, verifiedBy: 'user-123', verifiedAt: now },
        { valueId: UUID_2, verified: true, verifiedBy: 'user-123', verifiedAt: now },
      ],
    });

    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1, UUID_2] });
    await POST(req);

    expect(mockLogChange).toHaveBeenCalledTimes(2);
    expect(mockLogChange).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-456',
      userId: 'user-123',
      action: 'VERIFY',
      entityType: 'kpi_value',
      entityId: UUID_1,
    }));
    expect(mockLogChange).toHaveBeenCalledWith(expect.objectContaining({
      entityId: UUID_2,
      action: 'VERIFY',
    }));
  });

  it('allows admin role to verify', async () => {
    mockAuth.mockResolvedValue(createSession('admin'));
    mockVerifyValues.mockResolvedValue({ oldValues: [{ valueId: UUID_1 }], updated: [{ valueId: UUID_1 }] });

    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('allows analyst role to verify', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    mockVerifyValues.mockResolvedValue({ oldValues: [{ valueId: UUID_1 }], updated: [{ valueId: UUID_1 }] });

    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('allows department role to verify', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    mockVerifyValues.mockResolvedValue({ oldValues: [{ valueId: UUID_1 }], updated: [{ valueId: UUID_1 }] });

    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('continues even if audit logging fails', async () => {
    mockVerifyValues.mockResolvedValue({
      oldValues: [{ valueId: UUID_1, verified: false }],
      updated: [{ valueId: UUID_1, verified: true, verifiedBy: 'user-123', verifiedAt: new Date() }],
    });
    mockLogChange.mockRejectedValue(new Error('Audit DB error'));

    const req = createPostRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await POST(req);

    expect(response.status).toBe(201);
  });
});

describe('PUT /api/kpi/verify (mark not applicable)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockLogChange.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPutRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 when valueIds is empty', async () => {
    const req = createPutRequest('http://localhost/api/kpi/verify', { valueIds: [] });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('marks values as not applicable and returns count', async () => {
    mockMarkNotApplicable.mockResolvedValue({
      oldValues: [{ valueId: UUID_1, notApplicable: false, verified: false }],
      updated: [{ valueId: UUID_1, notApplicable: true }],
    });

    const req = createPutRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1] });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.marked).toBe(1);
    expect(body.data.valueIds).toEqual([UUID_1]);
    expect(mockMarkNotApplicable).toHaveBeenCalledWith('tenant-456', 'user-123', [UUID_1], 'admin');
  });

  it('audit logs each not-applicable value with MARK_NA action', async () => {
    mockMarkNotApplicable.mockResolvedValue({
      oldValues: [
        { valueId: UUID_1, notApplicable: false, verified: false },
        { valueId: UUID_2, notApplicable: false, verified: true },
      ],
      updated: [
        { valueId: UUID_1, notApplicable: true },
        { valueId: UUID_2, notApplicable: true },
      ],
    });

    const req = createPutRequest('http://localhost/api/kpi/verify', { valueIds: [UUID_1, UUID_2] });
    await PUT(req);

    expect(mockLogChange).toHaveBeenCalledTimes(2);
    expect(mockLogChange).toHaveBeenCalledWith(expect.objectContaining({
      action: 'MARK_NA',
      entityType: 'kpi_value',
      entityId: UUID_1,
      newValue: { notApplicable: true },
    }));
  });
});
