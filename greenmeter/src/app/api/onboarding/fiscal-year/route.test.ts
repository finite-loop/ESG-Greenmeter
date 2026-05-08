import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock db
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
const mockInsertReturning = vi.fn().mockResolvedValue([{ periodId: 'period-1' }]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock('@/db/schema', () => ({
  tenants: { tenantId: 'tenant_id' },
  reportingPeriods: { tenantId: 'tenant_id', periodId: 'period_id' },
}));

vi.mock('@/middleware', () => ({
  withApiHandler: (handler: Function, _opts: unknown) => {
    return async (req: NextRequest) => {
      const ctx = {
        req,
        session: { user: { userId: 'user-1', tenantId: 'tenant-1', role: 'admin' } },
        tenantId: 'tenant-1',
        userId: 'user-1',
      };
      const result = await handler(req, ctx);
      return Response.json(result);
    };
  },
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/onboarding/fiscal-year', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/onboarding/fiscal-year', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves fiscal year start month and creates a reporting period', async () => {
    const res = await POST(createRequest({ startMonth: 4 }));
    const result = await res.json();

    expect(result.data.fiscalYearStart).toBe(4);
    expect(result.data.period).toBeDefined();
    expect(result.data.period.periodId).toBe('period-1');
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });

  it('generates correct period label for April start', async () => {
    const res = await POST(createRequest({ startMonth: 4 }));
    const result = await res.json();

    // April start: "FY 2025-26" or "FY 2026-27" depending on current month
    expect(result.data.period.name).toMatch(/^FY \d{4}-\d{2}$/);
  });

  it('generates correct period label for January start', async () => {
    const res = await POST(createRequest({ startMonth: 1 }));
    const result = await res.json();

    // January start: "FY 2025" or "FY 2026"
    expect(result.data.period.name).toMatch(/^FY \d{4}$/);
  });

  it('rejects invalid start month', async () => {
    await expect(POST(createRequest({ startMonth: 13 }))).rejects.toThrow();
  });

  it('rejects start month of 0', async () => {
    await expect(POST(createRequest({ startMonth: 0 }))).rejects.toThrow();
  });
});
