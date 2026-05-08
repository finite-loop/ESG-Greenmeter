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

// Mock report repository
vi.mock('@/db/repositories/reportRepository', () => ({
  reportRepository: {
    findGeneratedReport: vi.fn(),
  },
}));

// Mock blob storage
vi.mock('@/lib/blobStorage', () => ({
  getSignedUrl: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  runWithContext: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
}));

import { GET } from './route';
import { reportRepository } from '@/db/repositories/reportRepository';
import * as blobStorage from '@/lib/blobStorage';

const mockReportRepository = vi.mocked(reportRepository);
const mockGetSignedUrl = vi.mocked(blobStorage.getSignedUrl);

const REPORT_ID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const TENANT_ID = 'tenant-456';

function createGetRequest(reportId: string): NextRequest {
  return new NextRequest(`http://localhost/api/reports/${reportId}/download`, {
    method: 'GET',
  });
}

function createSession(role: 'admin' | 'analyst' | 'department' | 'viewer' = 'admin') {
  return {
    user: {
      userId: 'user-123',
      tenantId: TENANT_ID,
      role,
      name: 'Test User',
      email: 'test@test.com',
    },
    expires: '2099-01-01',
  };
}

describe('GET /api/reports/[reportId]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
  });

  it('returns a signed download URL for a completed report', async () => {
    mockReportRepository.findGeneratedReport.mockResolvedValue({
      reportId: REPORT_ID,
      tenantId: TENANT_ID,
      templateId: 'template-1',
      periodId: 'period-1',
      name: 'BRSR Core Report — FY2024',
      status: 'complete',
      format: 'pdf',
      blobUrl: 'https://blob.storage/url',
      metadata: { blobPath: 'reports/report-1.pdf', fileSize: 12345 },
      generatedBy: 'user-123',
      generatedAt: new Date(),
      createdAt: new Date(),
    });
    mockGetSignedUrl.mockResolvedValue('https://blob.storage/signed-url?sig=abc');

    const req = createGetRequest(REPORT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.downloadUrl).toBe('https://blob.storage/signed-url?sig=abc');
    expect(body.data.reportId).toBe(REPORT_ID);
    expect(body.data.fileName).toBe('BRSR Core Report — FY2024.pdf');
    expect(body.data.expiresInSeconds).toBe(3600);

    // Verify getSignedUrl was called with the correct blob path
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      TENANT_ID,
      'reports/report-1.pdf',
      3600
    );
  });

  it('falls back to convention-based blob path when metadata.blobPath is missing', async () => {
    mockReportRepository.findGeneratedReport.mockResolvedValue({
      reportId: REPORT_ID,
      tenantId: TENANT_ID,
      templateId: 'template-1',
      periodId: 'period-1',
      name: 'Test Report',
      status: 'complete',
      format: 'pdf',
      blobUrl: 'https://blob.storage/url',
      metadata: null,
      generatedBy: 'user-123',
      generatedAt: new Date(),
      createdAt: new Date(),
    });
    mockGetSignedUrl.mockResolvedValue('https://blob.storage/signed-url');

    const req = createGetRequest(REPORT_ID);
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      TENANT_ID,
      `reports/${REPORT_ID}.pdf`,
      3600
    );
  });

  it('returns 404 when report does not exist', async () => {
    mockReportRepository.findGeneratedReport.mockResolvedValue(null);

    const req = createGetRequest(REPORT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 when report is not complete', async () => {
    mockReportRepository.findGeneratedReport.mockResolvedValue({
      reportId: REPORT_ID,
      tenantId: TENANT_ID,
      templateId: 'template-1',
      periodId: 'period-1',
      name: 'Test Report',
      status: 'generating',
      format: 'pdf',
      blobUrl: null,
      metadata: null,
      generatedBy: 'user-123',
      generatedAt: null,
      createdAt: new Date(),
    });

    const req = createGetRequest(REPORT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('not ready for download');
  });

  it('returns 400 for invalid report ID format', async () => {
    const req = createGetRequest('not-a-uuid');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGetRequest(REPORT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for unauthorized roles', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));

    const req = createGetRequest(REPORT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 500 when signed URL generation fails', async () => {
    mockReportRepository.findGeneratedReport.mockResolvedValue({
      reportId: REPORT_ID,
      tenantId: TENANT_ID,
      templateId: 'template-1',
      periodId: 'period-1',
      name: 'Test Report',
      status: 'complete',
      format: 'pdf',
      blobUrl: 'https://blob.storage/url',
      metadata: { blobPath: 'reports/report-1.pdf' },
      generatedBy: 'user-123',
      generatedAt: new Date(),
      createdAt: new Date(),
    });
    mockGetSignedUrl.mockRejectedValue(new Error('Azure connection failed'));

    const req = createGetRequest(REPORT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });

  it('sanitizes special characters in fileName', async () => {
    mockReportRepository.findGeneratedReport.mockResolvedValue({
      reportId: REPORT_ID,
      tenantId: TENANT_ID,
      templateId: 'template-1',
      periodId: 'period-1',
      name: 'Report: Test <2024> "final"',
      status: 'complete',
      format: 'pdf',
      blobUrl: 'https://blob.storage/url',
      metadata: { blobPath: 'reports/report-1.pdf' },
      generatedBy: 'user-123',
      generatedAt: new Date(),
      createdAt: new Date(),
    });
    mockGetSignedUrl.mockResolvedValue('https://blob.storage/signed-url');

    const req = createGetRequest(REPORT_ID);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.fileName).toBe('Report_ Test _2024_ _final_.pdf');
    expect(body.data.fileName).not.toMatch(/[<>:"/\\|?*]/);
  });
});
