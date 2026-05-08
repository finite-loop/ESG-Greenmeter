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
const mockGetValues = vi.fn();
vi.mock('@/services/peerService', () => ({
  peerService: {
    getValues: (...args: unknown[]) => mockGetValues(...args),
  },
}));

import { GET } from './route';

const VALID_PEER_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_PARAM_ID = '660e8400-e29b-41d4-a716-446655440000';

function createRequest(peerId: string, queryString = ''): NextRequest {
  const qs = queryString ? `?${queryString}` : '';
  return new NextRequest(`http://localhost/api/peers/${peerId}/values${qs}`, {
    method: 'GET',
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

describe('GET /api/peers/[peerId]/values', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetValues.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest(VALID_PEER_ID);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createRequest(VALID_PEER_ID);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns paginated peer KPI values for admin', async () => {
    const mockData = [
      {
        peerValueId: 'pv-1',
        tenantId: 'tenant-456',
        peerId: VALID_PEER_ID,
        paramId: VALID_PARAM_ID,
        canonicalId: null,
        periodId: null,
        fiscalYear: 'FY2024',
        value: '42.5',
        unit: 'tCO2e',
        sourceExtractionId: null,
        sourceMetricId: null,
        confidence: '0.85',
        verified: false,
        createdAt: new Date('2026-01-01'),
      },
    ];

    mockGetValues.mockResolvedValue({
      data: mockData,
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const req = createRequest(VALID_PEER_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].value).toBe('42.5');
    expect(body.meta.total).toBe(1);
  });

  it('passes fiscal year filter', async () => {
    const req = createRequest(VALID_PEER_ID, 'fiscalYear=FY2024');
    await GET(req);

    expect(mockGetValues).toHaveBeenCalledWith(
      VALID_PEER_ID,
      expect.objectContaining({ fiscalYear: 'FY2024' })
    );
  });

  it('passes param ID filter', async () => {
    const req = createRequest(VALID_PEER_ID, `paramId=${VALID_PARAM_ID}`);
    await GET(req);

    expect(mockGetValues).toHaveBeenCalledWith(
      VALID_PEER_ID,
      expect.objectContaining({ paramId: VALID_PARAM_ID })
    );
  });

  it('returns 400 for invalid peer ID format', async () => {
    const req = createRequest('not-a-uuid');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid paramId format', async () => {
    const req = createRequest(VALID_PEER_ID, 'paramId=not-a-uuid');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('uses default pagination', async () => {
    const req = createRequest(VALID_PEER_ID);
    await GET(req);

    expect(mockGetValues).toHaveBeenCalledWith(
      VALID_PEER_ID,
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      })
    );
  });
});
