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

// Mock benchmark service
const mockGetBenchmark = vi.fn();
const mockListAvailableMetrics = vi.fn();
vi.mock('@/services/benchmarkService', () => ({
  benchmarkService: {
    getBenchmark: (...args: unknown[]) => mockGetBenchmark(...args),
    listAvailableMetrics: (...args: unknown[]) => mockListAvailableMetrics(...args),
  },
}));

import { GET } from './route';

const CANONICAL_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PERIOD_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const FISCAL_YEAR = '2023-24';

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

const mockBenchmarkResult = {
  canonicalId: CANONICAL_ID,
  canonicalName: 'GHG Emissions Scope 1',
  pillar: 'E',
  category: 'Climate',
  sectorMedian: 200,
  q1: 100,
  q2: 200,
  q3: 350,
  q4: 500,
  min: 50,
  max: 500,
  tenantValue: 150,
  percentileRank: 35,
  peerCount: 10,
  insufficientData: false,
};

describe('GET /api/benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetBenchmark.mockResolvedValue(mockBenchmarkResult);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(
      `http://localhost/api/benchmarks?canonicalId=${CANONICAL_ID}&fiscalYear=${FISCAL_YEAR}`
    );
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns benchmark data with valid params', async () => {
    const req = createGetRequest(
      `http://localhost/api/benchmarks?canonicalId=${CANONICAL_ID}&fiscalYear=${FISCAL_YEAR}`
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.canonicalId).toBe(CANONICAL_ID);
    expect(body.data.sectorMedian).toBe(200);
    expect(body.data.q1).toBe(100);
    expect(body.data.q3).toBe(350);
    expect(body.data.peerCount).toBe(10);
    expect(body.data.insufficientData).toBe(false);
  });

  it('passes sector filter to service', async () => {
    const req = createGetRequest(
      `http://localhost/api/benchmarks?canonicalId=${CANONICAL_ID}&fiscalYear=${FISCAL_YEAR}&sector=Energy`
    );
    await GET(req);

    expect(mockGetBenchmark).toHaveBeenCalledWith(
      'tenant-456',
      CANONICAL_ID,
      FISCAL_YEAR,
      undefined,
      'Energy',
      undefined
    );
  });

  it('passes periodId to service for tenant rank', async () => {
    const req = createGetRequest(
      `http://localhost/api/benchmarks?canonicalId=${CANONICAL_ID}&fiscalYear=${FISCAL_YEAR}&periodId=${PERIOD_ID}`
    );
    await GET(req);

    expect(mockGetBenchmark).toHaveBeenCalledWith(
      'tenant-456',
      CANONICAL_ID,
      FISCAL_YEAR,
      PERIOD_ID,
      undefined,
      undefined
    );
  });

  it('returns 404 when no benchmark data exists', async () => {
    mockGetBenchmark.mockResolvedValue(null);
    const req = createGetRequest(
      `http://localhost/api/benchmarks?canonicalId=${CANONICAL_ID}&fiscalYear=${FISCAL_YEAR}`
    );
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 when fiscalYear is missing', async () => {
    const req = createGetRequest(
      `http://localhost/api/benchmarks?canonicalId=${CANONICAL_ID}`
    );
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid canonicalId UUID format', async () => {
    const req = createGetRequest(
      'http://localhost/api/benchmarks?canonicalId=not-a-uuid&fiscalYear=2023-24'
    );
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest(
      `http://localhost/api/benchmarks?canonicalId=${CANONICAL_ID}&fiscalYear=${FISCAL_YEAR}`
    );
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('allows department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest(
      `http://localhost/api/benchmarks?canonicalId=${CANONICAL_ID}&fiscalYear=${FISCAL_YEAR}`
    );
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  describe('list mode (no canonicalId)', () => {
    beforeEach(() => {
      mockListAvailableMetrics.mockResolvedValue([
        {
          canonicalId: 'c-001',
          canonicalName: 'GHG Scope 1',
          pillar: 'E',
          category: 'Climate',
          peerCount: 10,
          insufficientData: false,
        },
        {
          canonicalId: 'c-002',
          canonicalName: 'Employee Turnover',
          pillar: 'S',
          category: 'Workforce',
          peerCount: 2,
          insufficientData: true,
        },
      ]);
    });

    it('returns list of available metrics when canonicalId is omitted', async () => {
      const req = createGetRequest(
        `http://localhost/api/benchmarks?fiscalYear=${FISCAL_YEAR}`
      );
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].canonicalName).toBe('GHG Scope 1');
      expect(body.data[1].insufficientData).toBe(true);
    });

    it('passes sector filter to list endpoint', async () => {
      const req = createGetRequest(
        `http://localhost/api/benchmarks?fiscalYear=${FISCAL_YEAR}&sector=Energy`
      );
      await GET(req);

      expect(mockListAvailableMetrics).toHaveBeenCalledWith(
        'tenant-456',
        FISCAL_YEAR,
        'Energy',
        undefined
      );
    });

    it('returns 400 when fiscalYear is missing in list mode', async () => {
      const req = createGetRequest(
        'http://localhost/api/benchmarks'
      );
      const response = await GET(req);
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
