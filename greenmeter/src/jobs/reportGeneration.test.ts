import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'pg-boss';
import { handleReportGeneration } from './reportGeneration';
import type { ReportGenerationJobData } from './reportGeneration';

vi.mock('@/lib/pgBoss', () => ({
  reportProgress: vi.fn(),
}));

vi.mock('@/services/reportService', () => ({
  reportService: {
    renderReport: vi.fn(),
  },
}));

vi.mock('@/db/repositories/reportRepository', () => ({
  reportRepository: {
    updateGeneratedReport: vi.fn(),
  },
}));

vi.mock('@/lib/pdfGenerator', () => ({
  generatePdfFromReport: vi.fn(),
}));

vi.mock('@/lib/blobStorage', () => ({
  upload: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { reportProgress } from '@/lib/pgBoss';
import { reportService } from '@/services/reportService';
import { reportRepository } from '@/db/repositories/reportRepository';
import { generatePdfFromReport } from '@/lib/pdfGenerator';
import * as blobStorage from '@/lib/blobStorage';

function makeJob(data: ReportGenerationJobData): Job<ReportGenerationJobData> {
  return {
    id: 'job-1',
    name: 'report-generation',
    data,
  } as Job<ReportGenerationJobData>;
}

const jobData: ReportGenerationJobData = {
  tenantId: 'tenant-1',
  reportId: 'report-1',
  framework: 'BRSR',
  periodId: 'period-1',
  nodeId: 'node-root',
};

const mockRenderedReport = {
  framework: 'BRSR',
  templateName: 'BRSR Core Report',
  templateVersion: '1.0',
  tenantId: 'tenant-1',
  periodId: 'period-1',
  fiscalYear: 'FY2024',
  generatedAt: '2024-01-01T00:00:00.000Z',
  sections: [],
  coverage: {
    reported: 50,
    notReported: 10,
    notApplicable: 5,
    total: 65,
    percentComplete: 77,
  },
};

describe('handleReportGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders report, generates PDF, uploads to blob, and updates record', async () => {
    const pdfBuffer = Buffer.from('fake-pdf-content');
    vi.mocked(reportService.renderReport).mockResolvedValue(mockRenderedReport);
    vi.mocked(generatePdfFromReport).mockResolvedValue(pdfBuffer);
    vi.mocked(blobStorage.upload).mockResolvedValue('https://blob.storage/tenant-1/reports/report-1.pdf');
    vi.mocked(reportRepository.updateGeneratedReport).mockResolvedValue(null);

    const results = await handleReportGeneration([makeJob(jobData)]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].result!.reportId).toBe('report-1');
    expect(results[0].result!.blobPath).toBe('reports/report-1.pdf');
    expect(results[0].result!.fileSize).toBe(pdfBuffer.length);
    expect(results[0].result!.coverage.percentComplete).toBe(77);

    // Verify PDF was generated from the rendered report
    expect(generatePdfFromReport).toHaveBeenCalledWith(mockRenderedReport);

    // Verify blob upload with correct path and content type
    expect(blobStorage.upload).toHaveBeenCalledWith(
      'tenant-1',
      'reports/report-1.pdf',
      pdfBuffer,
      'application/pdf'
    );

    // Verify report record was updated with blobUrl and metadata
    const updateCalls = vi.mocked(reportRepository.updateGeneratedReport).mock.calls;
    // First call: status = generating
    expect(updateCalls[0][2]).toMatchObject({ status: 'generating' });
    // Last call: status = complete with blobUrl and metadata
    const lastCall = updateCalls[updateCalls.length - 1][2];
    expect(lastCall).toMatchObject({
      status: 'complete',
      blobUrl: 'https://blob.storage/tenant-1/reports/report-1.pdf',
    });
    const metadata = lastCall.metadata as Record<string, unknown>;
    expect(metadata.fileSize).toBe(pdfBuffer.length);
    expect(metadata.blobPath).toBe('reports/report-1.pdf');
    expect(metadata.coverage).toBeDefined();
    expect(metadata.progressStage).toBe('complete');
  });

  it('reports progress through all stages', async () => {
    const pdfBuffer = Buffer.from('pdf');
    vi.mocked(reportService.renderReport).mockResolvedValue(mockRenderedReport);
    vi.mocked(generatePdfFromReport).mockResolvedValue(pdfBuffer);
    vi.mocked(blobStorage.upload).mockResolvedValue('https://blob.storage/url');
    vi.mocked(reportRepository.updateGeneratedReport).mockResolvedValue(null);

    await handleReportGeneration([makeJob(jobData)]);

    // Verify progress was reported at each stage
    expect(reportProgress).toHaveBeenCalledTimes(6);
    const stages = vi.mocked(reportProgress).mock.calls.map((c) => (c[2] as { stage: string }).stage);
    expect(stages).toEqual([
      'initializing',
      'rendering',
      'generating_pdf',
      'uploading',
      'finalizing',
      'complete',
    ]);
  });

  it('marks report as failed on render error', async () => {
    vi.mocked(reportService.renderReport).mockRejectedValue(
      new Error('Database connection failed')
    );
    vi.mocked(reportRepository.updateGeneratedReport).mockResolvedValue(null);

    const results = await handleReportGeneration([makeJob(jobData)]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('Database connection failed');

    // Should have tried to mark the report as failed
    const failCalls = vi.mocked(reportRepository.updateGeneratedReport).mock.calls.filter(
      (call) => (call[2] as Record<string, unknown>).status === 'failed'
    );
    expect(failCalls.length).toBeGreaterThan(0);
  });

  it('marks report as failed on PDF generation error', async () => {
    vi.mocked(reportService.renderReport).mockResolvedValue(mockRenderedReport);
    vi.mocked(generatePdfFromReport).mockRejectedValue(new Error('PDF generation failed'));
    vi.mocked(reportRepository.updateGeneratedReport).mockResolvedValue(null);

    const results = await handleReportGeneration([makeJob(jobData)]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('PDF generation failed');
  });

  it('marks report as failed on blob upload error', async () => {
    const pdfBuffer = Buffer.from('pdf');
    vi.mocked(reportService.renderReport).mockResolvedValue(mockRenderedReport);
    vi.mocked(generatePdfFromReport).mockResolvedValue(pdfBuffer);
    vi.mocked(blobStorage.upload).mockRejectedValue(new Error('Storage unavailable'));
    vi.mocked(reportRepository.updateGeneratedReport).mockResolvedValue(null);

    const results = await handleReportGeneration([makeJob(jobData)]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('Storage unavailable');
  });

  it('processes multiple jobs', async () => {
    const pdfBuffer = Buffer.from('pdf');
    vi.mocked(reportService.renderReport).mockResolvedValue(mockRenderedReport);
    vi.mocked(generatePdfFromReport).mockResolvedValue(pdfBuffer);
    vi.mocked(blobStorage.upload).mockResolvedValue('https://blob.storage/url');
    vi.mocked(reportRepository.updateGeneratedReport).mockResolvedValue(null);

    const jobs = [
      makeJob({ ...jobData, reportId: 'r1' }),
      makeJob({ ...jobData, reportId: 'r2' }),
    ];
    jobs[1].id = 'job-2';

    const results = await handleReportGeneration(jobs);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });

  it('preserves accumulated metadata on failure', async () => {
    vi.mocked(reportService.renderReport).mockResolvedValue(mockRenderedReport);
    vi.mocked(generatePdfFromReport).mockRejectedValue(new Error('PDF failed'));
    vi.mocked(reportRepository.updateGeneratedReport).mockResolvedValue(null);

    await handleReportGeneration([makeJob(jobData)]);

    // Find the failure update call
    const failCall = vi.mocked(reportRepository.updateGeneratedReport).mock.calls.find(
      (call) => (call[2] as Record<string, unknown>).status === 'failed'
    );
    expect(failCall).toBeDefined();
    const failMetadata = failCall![2].metadata as Record<string, unknown>;
    // Should contain both error and accumulated progress info
    expect(failMetadata.error).toBeDefined();
    expect(failMetadata.progressStage).toBe('failed');
    // Should have progress metadata from earlier stages
    expect(failMetadata.progressPercent).toBeDefined();
  });

  it('continues processing remaining jobs when one fails', async () => {
    const pdfBuffer = Buffer.from('pdf');
    vi.mocked(reportService.renderReport)
      .mockRejectedValueOnce(new Error('First failed'))
      .mockResolvedValueOnce(mockRenderedReport);
    vi.mocked(generatePdfFromReport).mockResolvedValue(pdfBuffer);
    vi.mocked(blobStorage.upload).mockResolvedValue('https://blob.storage/url');
    vi.mocked(reportRepository.updateGeneratedReport).mockResolvedValue(null);

    const jobs = [
      makeJob({ ...jobData, reportId: 'r1' }),
      makeJob({ ...jobData, reportId: 'r2' }),
    ];
    jobs[1].id = 'job-2';

    const results = await handleReportGeneration(jobs);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
  });
});
