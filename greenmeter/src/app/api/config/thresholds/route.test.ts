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

// Mock configService
const mockGetThresholds = vi.fn();
const mockUpsertThreshold = vi.fn();
vi.mock('@/services/configService', () => ({
  configService: {
    getThresholds: (...args: unknown[]) => mockGetThresholds(...args),
    upsertThreshold: (...args: unknown[]) => mockUpsertThreshold(...args),
  },
}));

import { GET, PUT } from './route';

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

function createPutRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/config/thresholds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns merged thresholds', async () => {
    const mockData = [
      { thresholdId: 't1', paramId: 'p1', redMax: '30', amberMax: '60', source: 'platform' },
    ];
    mockGetThresholds.mockResolvedValue(mockData);

    const req = createGetRequest('http://localhost/api/config/thresholds');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(mockData);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest('http://localhost/api/config/thresholds');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/config/thresholds');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest('http://localhost/api/config/thresholds');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    mockGetThresholds.mockResolvedValue([]);
    const req = createGetRequest('http://localhost/api/config/thresholds');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/config/thresholds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession('admin'));
  });

  it('saves valid threshold override', async () => {
    const newValue = {
      thresholdId: 't-new',
      tenantId: 'tenant-456',
      paramId: null,
      category: null,
      pillar: 'E',
      redMax: '25',
      amberMax: '55',
      unit: null,
    };
    mockUpsertThreshold.mockResolvedValue({ oldValue: null, newValue });

    const req = createPutRequest('http://localhost/api/config/thresholds', {
      pillar: 'E',
      redMax: '25',
      amberMax: '55',
    });
    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.thresholdId).toBe('t-new');
  });

  it('returns 400 for missing redMax', async () => {
    const req = createPutRequest('http://localhost/api/config/thresholds', {
      amberMax: '60',
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-numeric values', async () => {
    const req = createPutRequest('http://localhost/api/config/thresholds', {
      redMax: 'abc',
      amberMax: '60',
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for redMax > amberMax', async () => {
    const req = createPutRequest('http://localhost/api/config/thresholds', {
      redMax: '80',
      amberMax: '40',
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/config/thresholds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 for analyst role (write)', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPutRequest('http://localhost/api/config/thresholds', {
      redMax: '30',
      amberMax: '60',
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest('http://localhost/api/config/thresholds', {
      redMax: '30',
      amberMax: '60',
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });
});
