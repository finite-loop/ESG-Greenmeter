import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/db', () => ({
  db: {},
  setTenantContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/middleware/audit', () => ({
  isWriteOperation: (method: string) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

const mockGetForecast = vi.fn();
vi.mock('@/services/forecastService', () => ({
  forecastService: {
    getForecast: (...args: unknown[]) => mockGetForecast(...args),
  },
}));

import { GET } from './route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

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

const baseForecast = {
  goalId: VALID_UUID,
  goalName: 'Reduce Emissions',
  targetValue: 50,
  targetYear: '2030',
  direction: 'lower_is_better',
  unit: 'tCO2e',
  historicalData: [
    { periodId: 'p1', periodName: 'FY 2022', endDate: new Date('2022-03-31'), value: 100 },
    { periodId: 'p2', periodName: 'FY 2023', endDate: new Date('2023-03-31'), value: 90 },
    { periodId: 'p3', periodName: 'FY 2024', endDate: new Date('2024-03-31'), value: 80 },
  ],
  scenarios: [
    { name: 'BAU', slope: -10, intercept: 100, projectedValues: [{ date: '2025-03-31', value: 70 }], probability: 0.8 },
    { name: 'Moderate', slope: -15, intercept: 100, projectedValues: [{ date: '2025-03-31', value: 55 }], probability: 0.9 },
    { name: 'Aggressive', slope: -20, intercept: 100, projectedValues: [{ date: '2025-03-31', value: 40 }], probability: 0.95 },
  ],
  insufficientData: false,
};

const insufficientForecast = {
  ...baseForecast,
  historicalData: [
    { periodId: 'p1', periodName: 'FY 2023', endDate: new Date('2023-03-31'), value: 100 },
  ],
  scenarios: [],
  insufficientData: true,
};

describe('GET /api/goals/[goalId]/forecast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/forecast`);
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('returns forecast scenarios for authenticated user', async () => {
    mockGetForecast.mockResolvedValue(baseForecast);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/forecast`);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.scenarios).toHaveLength(3);
    expect(body.data.scenarios[0].name).toBe('BAU');
    expect(body.data.scenarios[1].name).toBe('Moderate');
    expect(body.data.scenarios[2].name).toBe('Aggressive');
    expect(body.data.insufficientData).toBe(false);
  });

  it('returns insufficient data response when < 3 data points', async () => {
    mockGetForecast.mockResolvedValue(insufficientForecast);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/forecast`);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.insufficientData).toBe(true);
    expect(body.data.scenarios).toHaveLength(0);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createGetRequest('http://localhost/api/goals/not-a-uuid/forecast');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows viewer role access', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    mockGetForecast.mockResolvedValue(baseForecast);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/forecast`);
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('allows analyst role access', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    mockGetForecast.mockResolvedValue(baseForecast);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/forecast`);
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/forecast`);
    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it('passes goalId and tenantId to forecastService', async () => {
    mockGetForecast.mockResolvedValue(baseForecast);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/forecast`);
    await GET(req);

    expect(mockGetForecast).toHaveBeenCalledWith(VALID_UUID, 'tenant-456');
  });

  it('returns forecast metadata fields', async () => {
    mockGetForecast.mockResolvedValue(baseForecast);
    const req = createGetRequest(`http://localhost/api/goals/${VALID_UUID}/forecast`);
    const response = await GET(req);
    const body = await response.json();

    expect(body.data.goalName).toBe('Reduce Emissions');
    expect(body.data.targetValue).toBe(50);
    expect(body.data.targetYear).toBe('2030');
    expect(body.data.direction).toBe('lower_is_better');
    expect(body.data.unit).toBe('tCO2e');
  });
});
