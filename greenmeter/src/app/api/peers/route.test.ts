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

// Mock peer service
const mockList = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/services/peerService', () => ({
  peerService: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

import { GET, POST } from './route';

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

describe('GET /api/peers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockList.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest('http://localhost/api/peers');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/peers');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest('http://localhost/api/peers');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns paginated peers for admin', async () => {
    const mockData = [
      {
        peerId: 'peer-1',
        tenantId: 'tenant-456',
        name: 'Tata Steel',
        sector: 'Materials',
        country: 'India',
        marketCap: 'large_cap',
        exchange: 'BSE',
        active: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ];

    mockList.mockResolvedValue({
      data: mockData,
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const req = createGetRequest('http://localhost/api/peers');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Tata Steel');
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('returns peers for analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest('http://localhost/api/peers');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('passes search filter to service', async () => {
    const req = createGetRequest('http://localhost/api/peers?search=Tata&page=2&pageSize=10');
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Tata',
        page: 2,
        pageSize: 10,
      })
    );
  });

  it('uses default pagination when not specified', async () => {
    const req = createGetRequest('http://localhost/api/peers');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      })
    );
  });
});

describe('POST /api/peers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/peers', { name: 'Test' });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/peers', { name: 'Test' });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('creates peer with valid data', async () => {
    const newPeer = {
      peerId: 'peer-new',
      tenantId: 'tenant-456',
      name: 'Infosys',
      sector: 'Technology',
      country: 'India',
      marketCap: null,
      exchange: null,
      active: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    mockCreate.mockResolvedValue(newPeer);

    const req = createPostRequest('http://localhost/api/peers', {
      name: 'Infosys',
      sector: 'Technology',
      country: 'India',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe('Infosys');
    expect(body.data.sector).toBe('Technology');
    expect(mockCreate).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({
        name: 'Infosys',
        sector: 'Technology',
        country: 'India',
      })
    );
  });

  it('returns 400 when name is missing', async () => {
    const req = createPostRequest('http://localhost/api/peers', {
      sector: 'Technology',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when name is empty', async () => {
    const req = createPostRequest('http://localhost/api/peers', {
      name: '',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates peer with only required fields', async () => {
    const newPeer = {
      peerId: 'peer-new',
      tenantId: 'tenant-456',
      name: 'Simple Corp',
      sector: null,
      country: null,
      marketCap: null,
      exchange: null,
      active: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    mockCreate.mockResolvedValue(newPeer);

    const req = createPostRequest('http://localhost/api/peers', {
      name: 'Simple Corp',
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      'tenant-456',
      expect.objectContaining({ name: 'Simple Corp' })
    );
  });

  it('accepts valid marketCap values', async () => {
    const newPeer = {
      peerId: 'peer-new',
      tenantId: 'tenant-456',
      name: 'Large Corp',
      sector: null,
      country: null,
      marketCap: 'large_cap',
      exchange: null,
      active: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    mockCreate.mockResolvedValue(newPeer);

    const req = createPostRequest('http://localhost/api/peers', {
      name: 'Large Corp',
      marketCap: 'large_cap',
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
  });

  it('rejects invalid marketCap values', async () => {
    const req = createPostRequest('http://localhost/api/peers', {
      name: 'Test Corp',
      marketCap: 'mega_cap',
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
