import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      userId: 'user-1',
      tenantId: 'tenant-123',
      role: 'admin',
    },
  }),
}));

// Mock tenant middleware
vi.mock('@/middleware/tenant', () => ({
  tenantMiddleware: vi.fn().mockImplementation(async (ctx) => {
    ctx.tenantId = ctx.session.user.tenantId;
  }),
}));

// Mock role guard
vi.mock('@/middleware/roleGuard', () => ({
  roleGuardMiddleware: vi.fn(),
}));

// Mock audit
vi.mock('@/middleware/audit', () => ({
  isWriteOperation: vi.fn().mockReturnValue(false),
  recordAudit: vi.fn(),
}));

// Mock correlation ID
vi.mock('@/lib/correlationId', () => ({
  generateCorrelationId: vi.fn().mockReturnValue('corr-123'),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  runWithContext: vi.fn().mockImplementation((_ctx, fn) => fn()),
}));

// Mock rollupService
const mockGetRollupSummary = vi.fn();
vi.mock('@/services/rollupService', () => ({
  rollupService: {
    getRollupSummary: (...args: unknown[]) => mockGetRollupSummary(...args),
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

function createRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/rollup');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/rollup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rollup summary for valid nodeId and periodId', async () => {
    const summary = {
      nodeId: 'node-1',
      nodeName: 'HQ',
      nodeCurrency: 'INR',
      periodId: 'period-1',
      parameters: [
        {
          paramId: 'param-1',
          paramName: 'Emissions',
          unit: 'tCO2e',
          method: 'SUM',
          aggregatedValue: 300,
          childContributions: [
            { nodeId: 'child-1', nodeName: 'Div A', originalValue: 100, convertedValue: 100, currency: 'INR', currencyConverted: false, conversionRate: null },
            { nodeId: 'child-2', nodeName: 'Div B', originalValue: 200, convertedValue: 200, currency: 'INR', currencyConverted: false, conversionRate: null },
          ],
        },
      ],
    };

    mockGetRollupSummary.mockResolvedValue(summary);

    const req = createRequest({
      nodeId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      periodId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.nodeId).toBe('node-1');
    expect(body.data.parameters).toHaveLength(1);
    expect(body.data.parameters[0].aggregatedValue).toBe(300);
  });

  it('returns 400 for missing nodeId', async () => {
    const req = createRequest({ periodId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' });
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing periodId', async () => {
    const req = createRequest({ nodeId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid UUID format', async () => {
    const req = createRequest({ nodeId: 'not-a-uuid', periodId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' });
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});
