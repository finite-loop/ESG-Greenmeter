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
const mockGetWeights = vi.fn();
const mockSaveWeights = vi.fn();
vi.mock('@/services/configService', () => ({
  configService: {
    getWeights: (...args: unknown[]) => mockGetWeights(...args),
    saveWeights: (...args: unknown[]) => mockSaveWeights(...args),
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

describe('GET /api/config/weights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns merged weights', async () => {
    const mockData = {
      categories: [{ weightId: 'w1', pillar: 'E', category: 'Climate', weight: '50', source: 'platform' }],
      pillars: [{ weightId: 'w2', pillar: 'E', category: '_overall', weight: '40', source: 'platform' }],
    };
    mockGetWeights.mockResolvedValue(mockData);

    const req = createGetRequest('http://localhost/api/config/weights');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.categories).toHaveLength(1);
    expect(body.data.pillars).toHaveLength(1);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest('http://localhost/api/config/weights');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/config/weights');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    mockGetWeights.mockResolvedValue({ categories: [], pillars: [] });
    const req = createGetRequest('http://localhost/api/config/weights');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/config/weights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession('admin'));
  });

  it('saves valid weights', async () => {
    const savedWeights = [
      { weightId: 'w1', pillar: 'E', category: 'Climate', weight: '50' },
      { weightId: 'w2', pillar: 'E', category: 'Pollution', weight: '50' },
    ];
    mockSaveWeights.mockResolvedValue({ oldValues: [], newValues: savedWeights });

    const req = createPutRequest('http://localhost/api/config/weights', {
      weights: [
        { pillar: 'E', category: 'Climate', weight: '50' },
        { pillar: 'E', category: 'Pollution', weight: '50' },
      ],
    });
    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(savedWeights);
    expect(mockSaveWeights).toHaveBeenCalledWith(
      'tenant-456',
      'user-123',
      expect.arrayContaining([
        expect.objectContaining({ pillar: 'E', category: 'Climate', weight: '50' }),
      ])
    );
  });

  it('returns 400 for empty weights array', async () => {
    const req = createPutRequest('http://localhost/api/config/weights', {
      weights: [],
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing weights field', async () => {
    const req = createPutRequest('http://localhost/api/config/weights', {});
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid weight value', async () => {
    const req = createPutRequest('http://localhost/api/config/weights', {
      weights: [{ pillar: 'E', category: 'Climate', weight: 'abc' }],
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid pillar', async () => {
    const req = createPutRequest('http://localhost/api/config/weights', {
      weights: [{ pillar: 'X', category: 'Climate', weight: '50' }],
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/config/weights', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 for analyst role (write)', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPutRequest('http://localhost/api/config/weights', {
      weights: [{ pillar: 'E', category: 'Climate', weight: '100' }],
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest('http://localhost/api/config/weights', {
      weights: [{ pillar: 'E', category: 'Climate', weight: '100' }],
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createPutRequest('http://localhost/api/config/weights', {
      weights: [{ pillar: 'E', category: 'Climate', weight: '100' }],
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it('propagates service validation errors', async () => {
    mockSaveWeights.mockRejectedValue({
      status: 400,
      toJSON: () => ({
        error: { code: 'VALIDATION_ERROR', message: 'Category weights for pillar "E" sum to 60.00%, must equal 100%' },
      }),
    });

    const req = createPutRequest('http://localhost/api/config/weights', {
      weights: [{ pillar: 'E', category: 'Climate', weight: '60' }],
    });
    const res = await PUT(req);
    expect(res.status).not.toBe(200);
  });
});
