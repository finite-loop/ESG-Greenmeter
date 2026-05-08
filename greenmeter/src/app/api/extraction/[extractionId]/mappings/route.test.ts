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
const mockListFlaggedMetrics = vi.fn();
const mockProcessDecision = vi.fn();
vi.mock('@/services/mappingReviewService', () => ({
  mappingReviewService: {
    listFlaggedMetrics: (...args: unknown[]) => mockListFlaggedMetrics(...args),
    processDecision: (...args: unknown[]) => mockProcessDecision(...args),
  },
}));

import { GET, PUT } from './route';

const EXTRACTION_ID = '550e8400-e29b-41d4-a716-446655440000';
const METRIC_ID = '660e8400-e29b-41d4-a716-446655440001';
const PARAM_ID = '770e8400-e29b-41d4-a716-446655440002';

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

describe('GET /api/extraction/[extractionId]/mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns flagged metrics for valid extraction ID', async () => {
    const flaggedMetrics = [
      {
        metricId: METRIC_ID,
        metricName: 'GHG Emissions',
        mappingConfidence: '72',
        mappingStatus: 'auto_mapped',
      },
    ];
    mockListFlaggedMetrics.mockResolvedValue(flaggedMetrics);

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/${EXTRACTION_ID}/mappings`,
      { method: 'GET' }
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(flaggedMetrics);
    expect(mockListFlaggedMetrics).toHaveBeenCalledWith(EXTRACTION_ID);
  });

  it('returns 400 for invalid extraction ID', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/extraction/not-a-uuid/mappings',
      { method: 'GET' }
    );

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/${EXTRACTION_ID}/mappings`,
      { method: 'GET' }
    );

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized roles', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/${EXTRACTION_ID}/mappings`,
      { method: 'GET' }
    );

    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/extraction/[extractionId]/mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('processes a confirm decision', async () => {
    mockProcessDecision.mockResolvedValue({
      metricId: METRIC_ID,
      action: 'confirm',
      mappingStatus: 'manual_mapped',
      paramId: PARAM_ID,
      aliasCreated: true,
    });

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/${EXTRACTION_ID}/mappings`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricId: METRIC_ID,
          action: 'confirm',
        }),
      }
    );

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.action).toBe('confirm');
    expect(body.data.mappingStatus).toBe('manual_mapped');
    expect(body.data.aliasCreated).toBe(true);
    expect(mockProcessDecision).toHaveBeenCalledWith(
      'user-123',
      EXTRACTION_ID,
      expect.objectContaining({ metricId: METRIC_ID, action: 'confirm' })
    );
  });

  it('processes a reassign decision', async () => {
    mockProcessDecision.mockResolvedValue({
      metricId: METRIC_ID,
      action: 'reassign',
      mappingStatus: 'manual_mapped',
      paramId: PARAM_ID,
      aliasCreated: true,
    });

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/${EXTRACTION_ID}/mappings`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricId: METRIC_ID,
          action: 'reassign',
          paramId: PARAM_ID,
        }),
      }
    );

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.action).toBe('reassign');
  });

  it('processes a reject decision', async () => {
    mockProcessDecision.mockResolvedValue({
      metricId: METRIC_ID,
      action: 'reject',
      mappingStatus: 'rejected',
      paramId: null,
      aliasCreated: false,
    });

    const req = new NextRequest(
      `http://localhost:3000/api/extraction/${EXTRACTION_ID}/mappings`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricId: METRIC_ID,
          action: 'reject',
        }),
      }
    );

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.action).toBe('reject');
    expect(body.data.aliasCreated).toBe(false);
  });

  it('returns 400 for invalid request body', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/extraction/${EXTRACTION_ID}/mappings`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metricId: 'invalid', action: 'unknown' }),
      }
    );

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for reassign without paramId', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/extraction/${EXTRACTION_ID}/mappings`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricId: METRIC_ID,
          action: 'reassign',
          // paramId intentionally omitted
        }),
      }
    );

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});
