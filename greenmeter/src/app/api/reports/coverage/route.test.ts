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

// Mock report service
const mockGetCoverage = vi.fn();
vi.mock('@/services/reportService', () => ({
  reportService: {
    getCoverage: (...args: unknown[]) => mockGetCoverage(...args),
  },
}));

// Mock logger — must include runWithContext since handler.ts uses it
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  runWithContext: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
}));

import { GET } from './route';

const PERIOD_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function createGetRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
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

const mockCoverageResponse = {
  framework: 'BRSR',
  periodId: PERIOD_ID,
  totalParams: 100,
  hasValue: 60,
  verified: 40,
  notApplicable: 10,
  percentComplete: 70,
  warningThreshold: 80,
  belowThreshold: true,
  sections: [
    { standardSection: 'P1 – Ethics', totalParams: 20, hasValue: 15, verified: 10, notApplicable: 2, percentComplete: 85 },
    { standardSection: 'P6 – Environment', totalParams: 80, hasValue: 45, verified: 30, notApplicable: 8, percentComplete: 66 },
  ],
};

describe('GET /api/reports/coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetCoverage.mockResolvedValue(mockCoverageResponse);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(`http://localhost/api/reports/coverage?framework=BRSR&periodId=${PERIOD_ID}`);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest(`http://localhost/api/reports/coverage?framework=BRSR&periodId=${PERIOD_ID}`);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest(`http://localhost/api/reports/coverage?framework=BRSR&periodId=${PERIOD_ID}`);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns coverage data for admin', async () => {
    const req = createGetRequest(`http://localhost/api/reports/coverage?framework=BRSR&periodId=${PERIOD_ID}`);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.framework).toBe('BRSR');
    expect(body.data.totalParams).toBe(100);
    expect(body.data.hasValue).toBe(60);
    expect(body.data.verified).toBe(40);
    expect(body.data.notApplicable).toBe(10);
    expect(body.data.percentComplete).toBe(70);
    expect(body.data.warningThreshold).toBe(80);
    expect(body.data.belowThreshold).toBe(true);
    expect(body.data.sections).toHaveLength(2);
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest(`http://localhost/api/reports/coverage?framework=BRSR&periodId=${PERIOD_ID}`);
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('returns 400 for missing framework', async () => {
    const req = createGetRequest(`http://localhost/api/reports/coverage?periodId=${PERIOD_ID}`);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing periodId', async () => {
    const req = createGetRequest('http://localhost/api/reports/coverage?framework=BRSR');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid framework', async () => {
    const req = createGetRequest(`http://localhost/api/reports/coverage?framework=INVALID&periodId=${PERIOD_ID}`);
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid periodId (not UUID)', async () => {
    const req = createGetRequest('http://localhost/api/reports/coverage?framework=BRSR&periodId=not-a-uuid');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('passes correct arguments to service', async () => {
    const req = createGetRequest(`http://localhost/api/reports/coverage?framework=ESRS&periodId=${PERIOD_ID}`);
    await GET(req);

    expect(mockGetCoverage).toHaveBeenCalledWith(
      'ESRS',
      'tenant-456',
      PERIOD_ID
    );
  });

  it('works with all four frameworks', async () => {
    for (const framework of ['BRSR', 'ESRS', 'GRI', 'IFRS_S2']) {
      vi.clearAllMocks();
      mockAuth.mockResolvedValue(createSession());
      mockGetCoverage.mockResolvedValue({ ...mockCoverageResponse, framework });

      const req = createGetRequest(`http://localhost/api/reports/coverage?framework=${framework}&periodId=${PERIOD_ID}`);
      const response = await GET(req);
      expect(response.status).toBe(200);
    }
  });
});
