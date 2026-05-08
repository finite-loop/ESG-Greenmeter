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

// Mock excelImportService
const mockPreview = vi.fn();
vi.mock('@/services/excelImportService', () => ({
  excelImportService: {
    preview: (...args: unknown[]) => mockPreview(...args),
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

function createImportFormData(
  fileContent = 'fake-xlsx-content',
  nodeId = '550e8400-e29b-41d4-a716-446655440000',
  periodId = '660e8400-e29b-41d4-a716-446655440001'
): FormData {
  const formData = new FormData();
  const file = new File([fileContent], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  formData.append('file', file);
  formData.append('nodeId', nodeId);
  formData.append('periodId', periodId);
  return formData;
}

describe('POST /api/kpi/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockPreview.mockResolvedValue({
      rows: [],
      summary: { totalRows: 0, matchedRows: 0, unmatchedRows: 0, duplicateRows: 0 },
      filename: 'test.xlsx',
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const formData = createImportFormData();
    const req = new NextRequest('http://localhost/api/kpi/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 for unauthorized roles', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const formData = createImportFormData();
    const req = new NextRequest('http://localhost/api/kpi/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('allows admin role', async () => {
    mockAuth.mockResolvedValue(createSession('admin'));
    const formData = createImportFormData();
    const req = new NextRequest('http://localhost/api/kpi/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const formData = createImportFormData();
    const req = new NextRequest('http://localhost/api/kpi/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('returns 400 when no file provided', async () => {
    const formData = new FormData();
    formData.append('nodeId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('periodId', '660e8400-e29b-41d4-a716-446655440001');
    const req = new NextRequest('http://localhost/api/kpi/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain('No Excel file');
  });

  it('returns 400 when metadata is invalid', async () => {
    const formData = new FormData();
    const file = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    formData.append('file', file);
    formData.append('nodeId', 'not-a-uuid');
    formData.append('periodId', 'also-not-uuid');
    const req = new NextRequest('http://localhost/api/kpi/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('calls excelImportService.preview with correct params', async () => {
    const formData = createImportFormData();
    const req = new NextRequest('http://localhost/api/kpi/import', {
      method: 'POST',
      body: formData,
    });
    await POST(req);

    expect(mockPreview).toHaveBeenCalledWith(
      'tenant-456',
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440001',
      expect.objectContaining({
        name: 'test.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    );
  });

  it('returns preview data on success', async () => {
    mockPreview.mockResolvedValue({
      rows: [
        { rowIndex: 2, paramCode: 'BRSR_E_001', status: 'matched', paramId: 'p1' },
      ],
      summary: { totalRows: 1, matchedRows: 1, unmatchedRows: 0, duplicateRows: 0 },
      filename: 'test.xlsx',
    });

    const formData = createImportFormData();
    const req = new NextRequest('http://localhost/api/kpi/import', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.summary.matchedRows).toBe(1);
    expect(body.data.rows).toHaveLength(1);
  });
});
