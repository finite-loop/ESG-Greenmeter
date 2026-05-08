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

// Mock document service
const mockTriggerExtraction = vi.fn();
vi.mock('@/services/documentService', () => ({
  documentService: {
    triggerExtraction: (...args: unknown[]) => mockTriggerExtraction(...args),
  },
}));

import { POST } from './route';

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

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/extraction/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/extraction/trigger', {
      docId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/extraction/trigger', {
      docId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('triggers extraction for valid docId', async () => {
    mockTriggerExtraction.mockResolvedValue({
      jobId: 'job-abc-123',
    });

    const req = createPostRequest('http://localhost/api/extraction/trigger', {
      docId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.jobId).toBe('job-abc-123');
    expect(mockTriggerExtraction).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('returns 400 for invalid docId', async () => {
    const req = createPostRequest('http://localhost/api/extraction/trigger', {
      docId: 'not-a-uuid',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing docId', async () => {
    const req = createPostRequest('http://localhost/api/extraction/trigger', {});
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    mockTriggerExtraction.mockResolvedValue({ jobId: 'job-123' });

    const req = createPostRequest('http://localhost/api/extraction/trigger', {
      docId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/extraction/trigger', {
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
