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

// Mock scoring service
const mockGetScores = vi.fn();
vi.mock('@/services/scoringService', () => ({
  scoringService: {
    getScores: (...args: unknown[]) => mockGetScores(...args),
  },
}));

import { GET } from './route';

const NODE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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

const mockBreakdown = {
  overall: 75,
  pillars: [
    {
      pillar: 'E',
      score: 80,
      categoryCount: 2,
      categories: [
        { pillar: 'E', category: 'Climate', score: 85, paramCount: 3 },
        { pillar: 'E', category: 'Waste', score: 75, paramCount: 2 },
      ],
    },
    {
      pillar: 'S',
      score: 70,
      categoryCount: 1,
      categories: [
        { pillar: 'S', category: 'Workforce', score: 70, paramCount: 4 },
      ],
    },
  ],
  nodeId: NODE_ID,
  periodId: PERIOD_ID,
  parameterCount: 9,
};

describe('GET /api/scores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockGetScores.mockResolvedValue(mockBreakdown);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(
      `http://localhost/api/scores?nodeId=${NODE_ID}&periodId=${PERIOD_ID}`
    );
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns score breakdown with valid params', async () => {
    const req = createGetRequest(
      `http://localhost/api/scores?nodeId=${NODE_ID}&periodId=${PERIOD_ID}`
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.overall).toBe(75);
    expect(body.data.pillars).toHaveLength(2);
    expect(body.data.nodeId).toBe(NODE_ID);
    expect(body.data.periodId).toBe(PERIOD_ID);
    expect(mockGetScores).toHaveBeenCalledWith('tenant-456', NODE_ID, PERIOD_ID);
  });

  it('returns pillar and category breakdowns', async () => {
    const req = createGetRequest(
      `http://localhost/api/scores?nodeId=${NODE_ID}&periodId=${PERIOD_ID}`
    );
    const response = await GET(req);
    const body = await response.json();

    const ePillar = body.data.pillars.find((p: { pillar: string }) => p.pillar === 'E');
    expect(ePillar.score).toBe(80);
    expect(ePillar.categories).toHaveLength(2);

    const sPillar = body.data.pillars.find((p: { pillar: string }) => p.pillar === 'S');
    expect(sPillar.score).toBe(70);
  });

  it('returns 400 when nodeId is missing', async () => {
    const req = createGetRequest(
      `http://localhost/api/scores?periodId=${PERIOD_ID}`
    );
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when periodId is missing', async () => {
    const req = createGetRequest(
      `http://localhost/api/scores?nodeId=${NODE_ID}`
    );
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid UUID format', async () => {
    const req = createGetRequest(
      'http://localhost/api/scores?nodeId=not-a-uuid&periodId=also-not-uuid'
    );
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest(
      `http://localhost/api/scores?nodeId=${NODE_ID}&periodId=${PERIOD_ID}`
    );
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('allows department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest(
      `http://localhost/api/scores?nodeId=${NODE_ID}&periodId=${PERIOD_ID}`
    );
    const response = await GET(req);
    expect(response.status).toBe(200);
  });
});
