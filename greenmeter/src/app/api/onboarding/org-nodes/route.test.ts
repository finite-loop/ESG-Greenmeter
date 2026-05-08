import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock db
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockInsertReturning = vi.fn().mockResolvedValue([{ nodeId: 'node-1' }]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('@/db/schema', () => ({
  orgNodes: { tenantId: 'tenant_id', nodeId: 'node_id' },
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
  return new Request('http://localhost/api/onboarding/org-nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/onboarding/org-nodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertReturning.mockResolvedValue([{ nodeId: 'node-1' }]);
  });

  it('creates org nodes from valid batch', async () => {
    const body = {
      nodes: [
        { tempId: 't1', parentTempId: null, name: 'Acme Corp', nodeType: 'company' },
        { tempId: 't2', parentTempId: 't1', name: 'Division A', nodeType: 'subsidiary' },
      ],
    };

    const res = await POST(createRequest(body));
    const result = await res.json();

    expect(result.data.count).toBe(2);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('rejects batch without a company node', async () => {
    const body = {
      nodes: [
        { tempId: 't1', parentTempId: null, name: 'Dept A', nodeType: 'department' },
      ],
    };

    await expect(POST(createRequest(body))).rejects.toThrow();
  });

  it('rejects batch with invalid parent reference', async () => {
    const body = {
      nodes: [
        { tempId: 't1', parentTempId: null, name: 'Acme Corp', nodeType: 'company' },
        { tempId: 't2', parentTempId: 'nonexistent', name: 'Division A', nodeType: 'subsidiary' },
      ],
    };

    await expect(POST(createRequest(body))).rejects.toThrow('Invalid parent reference');
  });

  it('rejects empty nodes array', async () => {
    const body = { nodes: [] };

    await expect(POST(createRequest(body))).rejects.toThrow();
  });
});
