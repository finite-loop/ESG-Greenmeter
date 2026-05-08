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

// Mock the mapping review service
const mockFindExtractionByDocId = vi.fn();
vi.mock('@/services/mappingReviewService', () => ({
  mappingReviewService: {
    findExtractionByDocId: (...args: unknown[]) => mockFindExtractionByDocId(...args),
  },
}));

import { GET } from './route';

const DOC_ID = '550e8400-e29b-41d4-a716-446655440000';
const EXTRACTION_ID = '660e8400-e29b-41d4-a716-446655440001';

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

describe('GET /api/extraction/by-doc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns extraction summary for valid docId', async () => {
    const summary = {
      extractionId: EXTRACTION_ID,
      standard: 'BRSR',
      companyName: 'Test Corp',
      metricCount: 10,
      mappedCount: 5,
      status: 'completed',
      extractedAt: '2024-01-01T00:00:00.000Z',
    };
    mockFindExtractionByDocId.mockResolvedValue(summary);

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/by-doc?docId=${DOC_ID}`,
      { method: 'GET' }
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(summary);
    expect(mockFindExtractionByDocId).toHaveBeenCalledWith(DOC_ID);
  });

  it('returns 400 for missing docId', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/extraction/by-doc',
      { method: 'GET' }
    );

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid docId format', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/extraction/by-doc?docId=not-a-uuid',
      { method: 'GET' }
    );

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/by-doc?docId=${DOC_ID}`,
      { method: 'GET' }
    );

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized roles', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/by-doc?docId=${DOC_ID}`,
      { method: 'GET' }
    );

    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 404 when no extraction found for document', async () => {
    const { AppError } = await import('@/lib/errors');
    mockFindExtractionByDocId.mockRejectedValue(
      new AppError('NOT_FOUND', 'No extraction found for this document', 404)
    );

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/by-doc?docId=${DOC_ID}`,
      { method: 'GET' }
    );

    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
