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
const mockGetById = vi.fn();
const mockUpdate = vi.fn();
vi.mock('@/services/peerService', () => ({
  peerService: {
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { GET, PUT } from './route';

const VALID_PEER_ID = '550e8400-e29b-41d4-a716-446655440000';

function createGetRequest(peerId: string): NextRequest {
  return new NextRequest(`http://localhost/api/peers/${peerId}`, { method: 'GET' });
}

function createPutRequest(peerId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/peers/${peerId}`, {
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

const mockPeer = {
  peerId: VALID_PEER_ID,
  tenantId: 'tenant-456',
  name: 'Tata Steel',
  sector: 'Materials',
  country: 'India',
  marketCap: 'large_cap',
  exchange: 'BSE',
  active: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('GET /api/peers/[peerId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetById.mockResolvedValue(mockPeer);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(VALID_PEER_ID);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest(VALID_PEER_ID);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns peer for admin', async () => {
    const req = createGetRequest(VALID_PEER_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Tata Steel');
    expect(mockGetById).toHaveBeenCalledWith(VALID_PEER_ID);
  });

  it('returns 400 for invalid peer ID format', async () => {
    const req = createGetRequest('not-a-uuid');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/peers/[peerId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetById.mockResolvedValue(mockPeer);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPutRequest(VALID_PEER_ID, { name: 'Updated' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPutRequest(VALID_PEER_ID, { name: 'Updated' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('updates peer with valid data', async () => {
    const updatedPeer = { ...mockPeer, name: 'Tata Steel Ltd' };
    mockUpdate.mockResolvedValue(updatedPeer);

    const req = createPutRequest(VALID_PEER_ID, { name: 'Tata Steel Ltd' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Tata Steel Ltd');
    expect(mockUpdate).toHaveBeenCalledWith(
      VALID_PEER_ID,
      expect.objectContaining({ name: 'Tata Steel Ltd' })
    );
  });

  it('allows partial updates', async () => {
    const updatedPeer = { ...mockPeer, sector: 'Industrials' };
    mockUpdate.mockResolvedValue(updatedPeer);

    const req = createPutRequest(VALID_PEER_ID, { sector: 'Industrials' });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sector).toBe('Industrials');
  });

  it('allows setting active to false', async () => {
    const updatedPeer = { ...mockPeer, active: false };
    mockUpdate.mockResolvedValue(updatedPeer);

    const req = createPutRequest(VALID_PEER_ID, { active: false });
    const response = await PUT(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.active).toBe(false);
  });

  it('returns 400 for invalid peer ID', async () => {
    const req = createPutRequest('not-a-uuid', { name: 'Updated' });
    const response = await PUT(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows setting fields to null', async () => {
    const updatedPeer = { ...mockPeer, sector: null };
    mockUpdate.mockResolvedValue(updatedPeer);

    const req = createPutRequest(VALID_PEER_ID, { sector: null });
    const response = await PUT(req);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      VALID_PEER_ID,
      expect.objectContaining({ sector: null })
    );
  });
});
