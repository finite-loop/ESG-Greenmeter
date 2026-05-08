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

// Mock integrationService
const mockTestConnection = vi.fn();
vi.mock('@/services/integrationService', () => ({
  integrationService: {
    testConnection: (...args: unknown[]) => mockTestConnection(...args),
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

describe('POST /api/config/integrations/test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession('admin'));
  });

  it('returns success for reachable endpoint', async () => {
    mockTestConnection.mockResolvedValue({
      success: true,
      message: 'Connection successful (HTTP 200)',
      latencyMs: 150,
    });

    const req = createPostRequest('http://localhost/api/config/integrations/test', {
      integrationType: 'sap',
      endpoint: 'https://sap.example.com',
      authKey: 'my-key',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201); // POST returns 201
    expect(body.data.success).toBe(true);
    expect(body.data.latencyMs).toBe(150);
  });

  it('returns failure for unreachable endpoint', async () => {
    mockTestConnection.mockResolvedValue({
      success: false,
      message: 'Connection failed: ECONNREFUSED',
      latencyMs: 50,
    });

    const req = createPostRequest('http://localhost/api/config/integrations/test', {
      integrationType: 'sap',
      endpoint: 'https://unreachable.example.com',
      authKey: 'my-key',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.success).toBe(false);
    expect(body.data.message).toContain('ECONNREFUSED');
  });

  it('returns 400 for invalid integration type', async () => {
    const req = createPostRequest('http://localhost/api/config/integrations/test', {
      integrationType: 'invalid',
      endpoint: 'https://example.com',
      authKey: 'key',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid endpoint URL', async () => {
    const req = createPostRequest('http://localhost/api/config/integrations/test', {
      integrationType: 'sap',
      endpoint: 'not-a-url',
      authKey: 'key',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing auth key', async () => {
    const req = createPostRequest('http://localhost/api/config/integrations/test', {
      integrationType: 'sap',
      endpoint: 'https://example.com',
      authKey: '',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 for non-admin roles', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPostRequest('http://localhost/api/config/integrations/test', {
      integrationType: 'sap',
      endpoint: 'https://example.com',
      authKey: 'key',
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/config/integrations/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
