import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock db
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('@/db/schema', () => ({
  tenants: { tenantId: 'tenant_id' },
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

import { PATCH } from './route';

function createRequest(): NextRequest {
  return new Request('http://localhost/api/onboarding/complete', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as NextRequest;
}

describe('PATCH /api/onboarding/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks tenant as onboarding complete', async () => {
    const res = await PATCH(createRequest());
    const result = await res.json();

    expect(result.data.onboardingComplete).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
