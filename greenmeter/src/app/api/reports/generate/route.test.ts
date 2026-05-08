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

// Mock job submission
const mockSubmitJob = vi.fn();
vi.mock('@/jobs', () => ({
  submitJob: (...args: unknown[]) => mockSubmitJob(...args),
}));

// Mock report repository
vi.mock('@/db/repositories/reportRepository', () => ({
  reportRepository: {
    findPeriodById: vi.fn(),
    findRootNode: vi.fn(),
    findNodeById: vi.fn(),
    findTemplateByStandard: vi.fn(),
    createReportTemplate: vi.fn(),
    createGeneratedReport: vi.fn(),
  },
}));

// Mock logger — must include runWithContext since handler.ts uses it
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  runWithContext: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
}));

import { POST } from './route';
import { reportRepository } from '@/db/repositories/reportRepository';

const mockReportRepository = vi.mocked(reportRepository);

const PERIOD_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const NODE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const TEMPLATE_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const REPORT_ID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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

describe('POST /api/reports/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createSession());
    mockSubmitJob.mockResolvedValue('job-id-123');

    mockReportRepository.findPeriodById.mockResolvedValue({
      periodId: PERIOD_ID,
      fiscalYear: 'FY2024',
      startDate: new Date('2023-04-01'),
      endDate: new Date('2024-03-31'),
      status: 'open',
    });

    mockReportRepository.findRootNode.mockResolvedValue({
      nodeId: NODE_ID,
      name: 'Acme Corp',
    });

    mockReportRepository.findTemplateByStandard.mockResolvedValue({
      templateId: TEMPLATE_ID,
      name: 'BRSR Core Report',
      standard: 'BRSR',
      version: '1.0',
      structure: null,
    });

    mockReportRepository.createGeneratedReport.mockResolvedValue({
      reportId: REPORT_ID,
      tenantId: 'tenant-456',
      templateId: TEMPLATE_ID,
      periodId: PERIOD_ID,
      name: 'BRSR Core Report — FY2024',
      status: 'pending',
      format: 'pdf',
      blobUrl: null,
      metadata: null,
      generatedBy: 'user-123',
      generatedAt: null,
      createdAt: new Date(),
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for viewer role', async () => {
    mockAuth.mockResolvedValue(createSession('viewer'));
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for department role', async () => {
    mockAuth.mockResolvedValue(createSession('department'));
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('successfully enqueues report generation for admin', async () => {
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.jobId).toBe('job-id-123');
    expect(body.data.reportId).toBe(REPORT_ID);
    expect(body.data.framework).toBe('BRSR');
    expect(body.data.status).toBe('pending');

    // Verify job was submitted with correct data
    expect(mockSubmitJob).toHaveBeenCalledWith('report-generation', {
      tenantId: 'tenant-456',
      reportId: REPORT_ID,
      framework: 'BRSR',
      periodId: PERIOD_ID,
      nodeId: NODE_ID,
    });
  });

  it('allows analyst role', async () => {
    mockAuth.mockResolvedValue(createSession('analyst'));
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('returns 400 for invalid framework', async () => {
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'INVALID',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing periodId', async () => {
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when period not found', async () => {
    mockReportRepository.findPeriodById.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when no root node found and nodeId not provided', async () => {
    mockReportRepository.findRootNode.mockResolvedValue(null);
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('uses provided nodeId instead of root node', async () => {
    const customNodeId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    mockReportRepository.findNodeById.mockResolvedValue({ nodeId: customNodeId, name: 'Custom Node' });
    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
      nodeId: customNodeId,
    });
    const response = await POST(req);
    expect(response.status).toBe(201);

    // Should NOT have called findRootNode
    expect(mockReportRepository.findRootNode).not.toHaveBeenCalled();

    // Should have validated node ownership
    expect(mockReportRepository.findNodeById).toHaveBeenCalledWith(customNodeId, 'tenant-456');

    // Should have used the custom nodeId
    expect(mockSubmitJob).toHaveBeenCalledWith('report-generation', expect.objectContaining({
      nodeId: customNodeId,
    }));
  });

  it('creates template record when none exists in DB', async () => {
    mockReportRepository.findTemplateByStandard.mockResolvedValue(null);
    mockReportRepository.createReportTemplate.mockResolvedValue({
      templateId: 'new-template-id',
      name: 'BRSR Core Report',
      standard: 'BRSR',
      version: '1.0',
    });

    const req = createPostRequest('http://localhost/api/reports/generate', {
      framework: 'BRSR',
      periodId: PERIOD_ID,
    });
    const response = await POST(req);
    expect(response.status).toBe(201);

    expect(mockReportRepository.createReportTemplate).toHaveBeenCalledWith({
      tenantId: 'tenant-456',
      name: 'BRSR Core Report',
      standard: 'BRSR',
      version: '1.0',
    });
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('works with all four frameworks', async () => {
    for (const framework of ['BRSR', 'ESRS', 'GRI', 'IFRS_S2']) {
      vi.clearAllMocks();
      mockAuth.mockResolvedValue(createSession());
      mockSubmitJob.mockResolvedValue('job-id-123');
      mockReportRepository.findPeriodById.mockResolvedValue({
        periodId: PERIOD_ID,
        fiscalYear: 'FY2024',
        startDate: new Date(),
        endDate: new Date(),
        status: 'open',
      });
      mockReportRepository.findRootNode.mockResolvedValue({ nodeId: NODE_ID, name: 'Corp' });
      mockReportRepository.findTemplateByStandard.mockResolvedValue({
        templateId: TEMPLATE_ID,
        name: `${framework} Report`,
        standard: framework,
        version: '1.0',
        structure: null,
      });
      mockReportRepository.createGeneratedReport.mockResolvedValue({
        reportId: REPORT_ID,
        tenantId: 'tenant-456',
        templateId: TEMPLATE_ID,
        periodId: PERIOD_ID,
        name: `${framework} Report — FY2024`,
        status: 'pending',
        format: 'pdf',
        blobUrl: null,
        metadata: null,
        generatedBy: 'user-123',
        generatedAt: null,
        createdAt: new Date(),
      });

      const req = createPostRequest('http://localhost/api/reports/generate', {
        framework,
        periodId: PERIOD_ID,
      });
      const response = await POST(req);
      expect(response.status).toBe(201);
    }
  });
});
