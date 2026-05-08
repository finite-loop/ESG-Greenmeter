import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Tests that go through real middleware (GET, auth checks) ----

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

// Mock document service
const mockUpload = vi.fn();
const mockList = vi.fn();
vi.mock('@/services/documentService', () => ({
  documentService: {
    upload: (...args: unknown[]) => mockUpload(...args),
    list: (...args: unknown[]) => mockList(...args),
  },
}));

import { GET, POST } from './route';

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

function createGetRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockList.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createGetRequest('http://localhost/api/extraction');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createGetRequest('http://localhost/api/extraction');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createGetRequest('http://localhost/api/extraction');
    const response = await GET(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns paginated document list for admin', async () => {
    const mockData = [
      {
        docId: 'doc-1',
        tenantId: 'tenant-456',
        peerId: 'peer-1',
        standard: 'BRSR',
        fiscalYear: '2024-25',
        filename: 'report.pdf',
        contentType: 'application/pdf',
        fileSize: 5000000,
        status: 'pending',
        peerName: 'Tata Steel',
        uploadedAt: '2026-01-15T10:00:00Z',
      },
    ];

    mockList.mockResolvedValue({
      data: mockData,
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const req = createGetRequest('http://localhost/api/extraction');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].filename).toBe('report.pdf');
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('passes status filter to service', async () => {
    const req = createGetRequest('http://localhost/api/extraction?status=pending');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    );
  });

  it('passes standard filter to service', async () => {
    const req = createGetRequest('http://localhost/api/extraction?standard=BRSR');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ standard: 'BRSR' })
    );
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createGetRequest('http://localhost/api/extraction');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('uses default pagination', async () => {
    const req = createGetRequest('http://localhost/api/extraction');
    await GET(req);

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 })
    );
  });
});

describe('POST /api/extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const formData = new FormData();
    formData.append('file', new File([new Uint8Array(100)], 'report.pdf', { type: 'application/pdf' }));
    formData.append('peerId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('standard', 'BRSR');
    formData.append('fiscalYear', '2024-25');

    const req = new NextRequest('http://localhost/api/extraction', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const formData = new FormData();
    formData.append('file', new File([new Uint8Array(100)], 'report.pdf', { type: 'application/pdf' }));
    formData.append('peerId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('standard', 'BRSR');
    formData.append('fiscalYear', '2024-25');

    const req = new NextRequest('http://localhost/api/extraction', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('uploads a valid PDF document', async () => {
    const mockDoc = {
      docId: 'doc-new',
      tenantId: 'tenant-456',
      peerId: '550e8400-e29b-41d4-a716-446655440000',
      standard: 'BRSR',
      fiscalYear: '2024-25',
      filename: 'report.pdf',
      contentType: 'application/pdf',
      fileSize: 1024,
      status: 'pending',
    };
    mockUpload.mockResolvedValue(mockDoc);

    const formData = new FormData();
    formData.append('file', new File([new Uint8Array(1024)], 'report.pdf', { type: 'application/pdf' }));
    formData.append('peerId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('standard', 'BRSR');
    formData.append('fiscalYear', '2024-25');

    const req = new NextRequest('http://localhost/api/extraction', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.filename).toBe('report.pdf');
    expect(mockUpload).toHaveBeenCalledWith(
      'tenant-456',
      'user-123',
      expect.objectContaining({
        peerId: '550e8400-e29b-41d4-a716-446655440000',
        standard: 'BRSR',
        fiscalYear: '2024-25',
      }),
      expect.objectContaining({
        name: 'report.pdf',
        type: 'application/pdf',
      })
    );
  });

  it('returns 400 when no file is provided', async () => {
    const formData = new FormData();
    formData.append('peerId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('standard', 'BRSR');
    formData.append('fiscalYear', '2024-25');

    const req = new NextRequest('http://localhost/api/extraction', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for file exceeding 50 MB', async () => {
    const bigBuffer = new Uint8Array(51 * 1024 * 1024);
    const formData = new FormData();
    formData.append('file', new File([bigBuffer], 'huge.pdf', { type: 'application/pdf' }));
    formData.append('peerId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('standard', 'BRSR');
    formData.append('fiscalYear', '2024-25');

    const req = new NextRequest('http://localhost/api/extraction', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid standard', async () => {
    const formData = new FormData();
    formData.append('file', new File([new Uint8Array(100)], 'report.pdf', { type: 'application/pdf' }));
    formData.append('peerId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('standard', 'INVALID');
    formData.append('fiscalYear', '2024-25');

    const req = new NextRequest('http://localhost/api/extraction', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when metadata fields are missing', async () => {
    const formData = new FormData();
    formData.append('file', new File([new Uint8Array(100)], 'report.pdf', { type: 'application/pdf' }));

    const req = new NextRequest('http://localhost/api/extraction', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
