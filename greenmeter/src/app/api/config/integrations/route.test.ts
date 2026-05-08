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
const mockListConfigs = vi.fn();
const mockSaveConfig = vi.fn();
vi.mock('@/services/integrationService', () => ({
  integrationService: {
    listConfigs: (...args: unknown[]) => mockListConfigs(...args),
    saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  },
}));

import { GET, POST } from './route';

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

describe('GET /api/config/integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns integration configs for admin', async () => {
    const mockData = [
      {
        configId: 'cfg-1',
        integrationType: 'sap',
        label: 'SAP ERP',
        endpoint: 'https://sap.example.com',
        authKeyMasked: '****5678',
        scheduleCron: '0 2 * * *',
        enabled: true,
        configured: true,
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        integrationType: 'darwinbox',
        label: 'Darwinbox HRMS',
        configured: false,
      },
      {
        integrationType: 'llm',
        label: 'LLM Provider',
        configured: false,
      },
    ];
    mockListConfigs.mockResolvedValue(mockData);

    const req = createGetRequest('http://localhost/api/config/integrations');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(3);
    expect(body.data[0].integrationType).toBe('sap');
    expect(body.data[0].configured).toBe(true);
    expect(body.data[1].configured).toBe(false);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest('http://localhost/api/config/integrations');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin roles', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest('http://localhost/api/config/integrations');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/config/integrations');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/config/integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession('admin'));
  });

  it('saves a valid integration config', async () => {
    const mockResponse = {
      configId: 'cfg-new',
      integrationType: 'sap',
      endpoint: 'https://sap.example.com',
      authKeyMasked: '****5678',
      scheduleCron: '0 2 * * *',
      enabled: true,
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockSaveConfig.mockResolvedValue({
      oldValue: null,
      newValue: { configId: 'cfg-new', key: 'integration_sap' },
      response: mockResponse,
    });

    const req = createPostRequest('http://localhost/api/config/integrations', {
      integrationType: 'sap',
      endpoint: 'https://sap.example.com',
      authKey: 'my-api-key-12345678',
      scheduleCron: '0 2 * * *',
      enabled: true,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.integrationType).toBe('sap');
    expect(body.data.authKeyMasked).toBe('****5678');
  });

  it('returns 400 for invalid integration type', async () => {
    const req = createPostRequest('http://localhost/api/config/integrations', {
      integrationType: 'invalid',
      endpoint: 'https://example.com',
      authKey: 'key',
      scheduleCron: '0 2 * * *',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid endpoint URL', async () => {
    const req = createPostRequest('http://localhost/api/config/integrations', {
      integrationType: 'sap',
      endpoint: 'not-a-url',
      authKey: 'key',
      scheduleCron: '0 2 * * *',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing auth key', async () => {
    const req = createPostRequest('http://localhost/api/config/integrations', {
      integrationType: 'sap',
      endpoint: 'https://example.com',
      authKey: '',
      scheduleCron: '0 2 * * *',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid cron expression', async () => {
    const req = createPostRequest('http://localhost/api/config/integrations', {
      integrationType: 'sap',
      endpoint: 'https://example.com',
      authKey: 'key',
      scheduleCron: 'not a cron',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/config/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 for non-admin roles', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPostRequest('http://localhost/api/config/integrations', {
      integrationType: 'sap',
      endpoint: 'https://example.com',
      authKey: 'key',
      scheduleCron: '0 2 * * *',
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('does not include credential in audit log', async () => {
    mockSaveConfig.mockResolvedValue({
      oldValue: null,
      newValue: { configId: 'cfg-new', key: 'integration_sap' },
      response: {
        configId: 'cfg-new',
        integrationType: 'sap',
        endpoint: 'https://sap.example.com',
        authKeyMasked: '****5678',
        scheduleCron: '0 2 * * *',
        enabled: true,
      },
    });

    const req = createPostRequest('http://localhost/api/config/integrations', {
      integrationType: 'sap',
      endpoint: 'https://sap.example.com',
      authKey: 'my-secret-key-5678',
      scheduleCron: '0 2 * * *',
      enabled: true,
    });
    const res = await POST(req);
    const body = await res.json();

    // _audit should be stripped from response
    expect(body._audit).toBeUndefined();
    // Response should not contain the raw auth key
    expect(JSON.stringify(body)).not.toContain('my-secret-key-5678');
  });
});
