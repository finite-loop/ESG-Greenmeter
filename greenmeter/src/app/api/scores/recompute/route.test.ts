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

// Mock job submission
const mockSubmitJob = vi.fn();
vi.mock('@/jobs', () => ({
  submitJob: (...args: unknown[]) => mockSubmitJob(...args),
}));

import { POST } from './route';

const PERIOD_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

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

describe('POST /api/scores/recompute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockSubmitJob.mockResolvedValue('job-id-123');
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/scores/recompute', {
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('submits recompute job with valid data', async () => {
    const req = createPostRequest('http://localhost/api/scores/recompute', {
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.jobId).toBe('job-id-123');
    expect(body.data.status).toBe('queued');
    expect(mockSubmitJob).toHaveBeenCalledWith('score-recompute', {
      tenantId: 'tenant-456',
      periodId: PERIOD_ID,
      triggeredBy: 'user-123',
    }, {
      singletonKey: `score-recompute-tenant-456-${PERIOD_ID}`,
    });
  });

  it('returns 400 when periodId is missing', async () => {
    const req = createPostRequest('http://localhost/api/scores/recompute', {});
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid UUID format', async () => {
    const req = createPostRequest('http://localhost/api/scores/recompute', {
      periodId: 'not-a-uuid',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/scores/recompute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/scores/recompute', {
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createPostRequest('http://localhost/api/scores/recompute', {
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPostRequest('http://localhost/api/scores/recompute', {
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });
});
