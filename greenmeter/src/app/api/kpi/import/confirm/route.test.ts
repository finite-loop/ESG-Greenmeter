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
const mockRecordAudit = vi.fn().mockResolvedValue(undefined);
vi.mock('@/middleware/audit', () => ({
  isWriteOperation: (method: string) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
  recordAudit: (...args: unknown[]) => mockRecordAudit(...args),
}));

// Mock logger (runWithContext is used by the middleware handler)
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  runWithContext: (_ctx: unknown, fn: () => unknown) => fn(),
}));

// Mock excelImportService
const mockConfirm = vi.fn();
vi.mock('@/services/excelImportService', () => ({
  excelImportService: {
    confirm: (...args: unknown[]) => mockConfirm(...args),
  },
}));

import { POST } from './route';

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

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  nodeId: '550e8400-e29b-41d4-a716-446655440000',
  periodId: '660e8400-e29b-41d4-a716-446655440001',
  filename: 'test.xlsx',
  rows: [
    {
      rowIndex: 2,
      paramId: '770e8400-e29b-41d4-a716-446655440002',
      value: '1250.5',
      unit: 'MWh',
    },
  ],
};

describe('POST /api/kpi/import/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockConfirm.mockResolvedValue({
      imported: 1,
      failed: 0,
      results: [{ rowIndex: 2, status: 'success', valueId: 'new-v1' }],
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/kpi/import/confirm', validPayload);
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/kpi/import/confirm', validPayload);
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createPostRequest('http://localhost/api/kpi/import/confirm', validPayload);
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/kpi/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when rows array is empty', async () => {
    const req = createPostRequest('http://localhost/api/kpi/import/confirm', {
      ...validPayload,
      rows: [],
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = createPostRequest('http://localhost/api/kpi/import/confirm', {
      rows: validPayload.rows,
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('calls excelImportService.confirm with correct params', async () => {
    const req = createPostRequest('http://localhost/api/kpi/import/confirm', validPayload);
    await POST(req);

    expect(mockConfirm).toHaveBeenCalledWith(
      'tenant-456',
      'user-123',
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
      'test.xlsx',
      validPayload.rows
    );
  });

  it('returns import results on success', async () => {
    const req = createPostRequest('http://localhost/api/kpi/import/confirm', validPayload);
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.imported).toBe(1);
    expect(body.data.failed).toBe(0);
    expect(body.data.results).toHaveLength(1);
    expect(body.data.results[0].status).toBe('success');
  });

  it('includes audit metadata in response processing', async () => {
    mockConfirm.mockResolvedValue({
      imported: 2,
      failed: 0,
      results: [
        { rowIndex: 2, status: 'success', valueId: 'v1' },
        { rowIndex: 3, status: 'success', valueId: 'v2' },
      ],
    });

    const req = createPostRequest('http://localhost/api/kpi/import/confirm', {
      ...validPayload,
      rows: [
        ...validPayload.rows,
        {
          rowIndex: 3,
          paramId: '880e8400-e29b-41d4-a716-446655440003',
          value: '89.3',
        },
      ],
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('calls per-value audit for each successfully imported value', async () => {
    mockConfirm.mockResolvedValue({
      imported: 2,
      failed: 0,
      results: [
        { rowIndex: 2, status: 'success', valueId: 'v1' },
        { rowIndex: 3, status: 'success', valueId: 'v2' },
      ],
    });

    const rows = [
      {
        rowIndex: 2,
        paramId: '770e8400-e29b-41d4-a716-446655440002',
        value: '1250.5',
        unit: 'MWh',
      },
      {
        rowIndex: 3,
        paramId: '880e8400-e29b-41d4-a716-446655440003',
        value: '89.3',
      },
    ];

    const req = createPostRequest('http://localhost/api/kpi/import/confirm', {
      ...validPayload,
      rows,
    });
    await POST(req);

    // Per-value audit (2) + batch-level audit from middleware (1) = 3 calls
    expect(mockRecordAudit).toHaveBeenCalledTimes(3);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entityType: 'kpi_value',
        entityId: 'v1',
      })
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entityType: 'kpi_value',
        entityId: 'v2',
      })
    );
  });
});
