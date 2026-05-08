import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'pg-boss';

vi.mock('pg-boss', () => {
  class MockPgBoss {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn();
    resume = vi.fn().mockResolvedValue(undefined);
  }
  return { PgBoss: MockPgBoss };
});

describe('Job Handlers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/test');
  });

  function createMockJobs<T>(data: T): Job<T>[] {
    return [
      {
        id: 'test-job-id',
        name: 'test-queue',
        data,
        expireInSeconds: 900,
        heartbeatSeconds: null,
      } as Job<T>,
    ];
  }

  // Note: handleExtractionPipeline is fully tested in extractionPipeline.test.ts
  // with proper mocks for DB, blob storage, OCR, and LLM dependencies.

  describe('handleMetricMapping', () => {
    it('returns standard JobResult shape for each job', async () => {
      // handleMetricMapping is fully implemented (Story 5.4) and requires
      // DB mocks — comprehensive tests are in metricMapping.test.ts.
      // Here we just verify the handler returns the expected shape on failure
      // (no DB mocks set up, so it will fail gracefully).
      const { handleMetricMapping } = await import('./metricMapping');

      const jobs = createMockJobs({ extractionId: 'ext-1', tenantId: 'tenant-1' });
      const results = await handleMetricMapping(jobs);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('success');
      expect(typeof results[0].success).toBe('boolean');
      // Without DB mocks, it returns a failure with error message
      if (!results[0].success) {
        expect(results[0]).toHaveProperty('error');
      } else {
        expect(results[0].result).toHaveProperty('mappedCount');
        expect(results[0].result).toHaveProperty('unmappedCount');
      }
    });
  });

  describe('handleScoreRecompute', () => {
    it('returns standard JobResult shape with success for each job', async () => {
      // Comprehensive tests in scoreRecompute.test.ts with proper DB/service mocks.
      // Here we verify the handler doesn't crash with dynamic import.
      vi.doMock('@/db/repositories/scoringRepository', () => ({
        scoringRepository: { refreshScores: vi.fn().mockResolvedValue(undefined) },
      }));
      vi.doMock('@/services/rollupService', () => ({
        rollupService: { recomputeAncestors: vi.fn().mockResolvedValue(undefined) },
      }));
      vi.doMock('@/lib/logger', () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));

      const { handleScoreRecompute } = await import('./scoreRecompute');

      const jobs = createMockJobs({ tenantId: 't1', periodId: 'p1', triggeredBy: 'user' });
      const results = await handleScoreRecompute(jobs);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[0].result).toHaveProperty('scoresUpdated');
      expect(results[0].result).toHaveProperty('rollupsRecomputed');
    });
  });

  describe('handleReportGeneration', () => {
    it('returns standard JobResult shape with success for each job', async () => {
      vi.doMock('@/db/repositories/reportRepository', () => ({
        reportRepository: {
          updateGeneratedReport: vi.fn().mockResolvedValue(null),
        },
      }));
      vi.doMock('@/services/reportService', () => ({
        reportService: {
          renderReport: vi.fn().mockResolvedValue({
            framework: 'BRSR',
            templateName: 'BRSR Core Report',
            templateVersion: '1.0',
            tenantId: 't1',
            periodId: 'p1',
            fiscalYear: 'FY2024',
            generatedAt: '2024-01-01T00:00:00.000Z',
            sections: [],
            coverage: { reported: 10, notReported: 0, notApplicable: 0, total: 10, percentComplete: 100 },
          }),
        },
      }));
      vi.doMock('@/lib/pdfGenerator', () => ({
        generatePdfFromReport: vi.fn().mockResolvedValue(Buffer.from('fake-pdf')),
      }));
      vi.doMock('@/lib/blobStorage', () => ({
        upload: vi.fn().mockResolvedValue('https://blob.storage/t1/reports/report-1.pdf'),
      }));
      vi.doMock('@/lib/logger', () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));

      const { handleReportGeneration } = await import('./reportGeneration');

      const jobs = createMockJobs({
        tenantId: 't1',
        reportId: 'report-1',
        framework: 'BRSR',
        periodId: 'p1',
        nodeId: 'node-root',
      });
      const results = await handleReportGeneration(jobs);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[0].result).toHaveProperty('reportId');
      expect(results[0].result).toHaveProperty('blobPath');
      expect(results[0].result).toHaveProperty('fileSize');
      expect(results[0].result).toHaveProperty('coverage');
    });
  });

  describe('handleApiSync', () => {
    it('returns standard JobResult shape for each job', async () => {
      // Without DB mocks, the handler will fail at config loading — that's expected.
      // Comprehensive tests are in apiSync.test.ts with proper mocks.
      vi.doMock('@/db', () => ({
        db: { execute: vi.fn().mockResolvedValue([]) },
        setTenantContext: vi.fn(),
      }));
      vi.doMock('@/db/repositories/configRepository', () => ({
        configRepository: {
          getIntegrationConfig: vi.fn().mockResolvedValue(null),
          upsertIntegrationConfig: vi.fn().mockResolvedValue({ oldValue: null, newValue: {} }),
        },
      }));
      vi.doMock('@/db/repositories/kpiRepository', () => ({
        kpiRepository: { findByParamNodePeriod: vi.fn(), insert: vi.fn() },
      }));
      vi.doMock('@/db/repositories/parameterRepository', () => ({
        parameterRepository: { findAllForMatching: vi.fn().mockResolvedValue([]) },
      }));
      vi.doMock('@/services/auditService', () => ({
        auditService: { logChange: vi.fn() },
      }));
      vi.doMock('@/lib/encryption', () => ({
        decrypt: vi.fn().mockReturnValue('test-key'),
      }));
      vi.doMock('@/lib/logger', () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));
      vi.doMock('@/jobs', () => ({
        submitJob: vi.fn(),
      }));

      const { handleApiSync } = await import('./apiSync');

      const jobs = createMockJobs({ tenantId: 't1', integrationType: 'sap' as const });
      const results = await handleApiSync(jobs);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('success');
      expect(typeof results[0].success).toBe('boolean');
      // Without proper config, it will fail gracefully
      if (!results[0].success) {
        expect(results[0]).toHaveProperty('error');
      } else {
        expect(results[0].result).toHaveProperty('recordsSynced');
        expect(results[0].result).toHaveProperty('syncedAt');
      }
    });
  });

  describe('handleLlmRecommendations', () => {
    it('returns standard JobResult shape with success for each job', async () => {
      vi.doMock('@/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        },
        setTenantContext: vi.fn(),
      }));
      vi.doMock('@/db/schema/tenants', () => ({
        tenants: { tenantId: 'tenantId', active: 'active' },
        reportingPeriods: { tenantId: 'tenantId', periodId: 'periodId', active: 'active', endDate: 'endDate' },
      }));
      vi.doMock('@/db/schema/kpi', () => ({
        kpiValues: {},
        kpiParameters: {},
      }));
      vi.doMock('@/db/schema/config', () => ({
        thresholds: {},
        recommendations: {},
      }));
      vi.doMock('@/db/repositories/recommendationRepository', () => ({
        recommendationRepository: {
          deleteByTenant: vi.fn().mockResolvedValue(0),
          insertBatch: vi.fn().mockResolvedValue(0),
          getByTenant: vi.fn().mockResolvedValue([]),
        },
      }));
      vi.doMock('@/lib/llm', () => ({
        createLlmClient: () => ({ complete: vi.fn() }),
      }));
      vi.doMock('@/lib/logger', () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));
      vi.doMock('@/services/recommendationService', () => ({
        recommendationService: {
          generateForTenant: vi.fn().mockResolvedValue(0),
        },
      }));

      const { handleLlmRecommendations } = await import('./llmRecommendations');

      const jobs = createMockJobs({ tenantId: 't1', scope: 'full' as const });
      const results = await handleLlmRecommendations(jobs);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[0].result).toHaveProperty('recommendationsGenerated');
      expect(results[0].result).toHaveProperty('tenantsProcessed');
    });
  });
});
