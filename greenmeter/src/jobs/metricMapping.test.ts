import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'pg-boss';
import type { MetricMappingJobData } from './metricMapping';

// --- Module mocks ---

vi.mock('pg-boss', () => {
  class MockPgBoss {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn();
    resume = vi.fn().mockResolvedValue(undefined);
  }
  return { PgBoss: MockPgBoss };
});

const mockSetTenantContext = vi.fn();

// Track all db operations
const dbOps = {
  selectResults: new Map<number, unknown>(),
  selectCallCount: 0,
  updateCalls: [] as Array<{ table: unknown; set: unknown }>,
  transactionFn: null as ((tx: unknown) => Promise<unknown>) | null,
};

function resetDbOps() {
  dbOps.selectResults.clear();
  dbOps.selectCallCount = 0;
  dbOps.updateCalls = [];
  dbOps.transactionFn = null;
}

vi.mock('@/db', () => {
  // Build chainable mock for select queries
  function createSelectChain(resultOrFn: unknown) {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        if (typeof resultOrFn === 'function') {
          return (resultOrFn as () => unknown)();
        }
        return Promise.resolve(resultOrFn);
      }),
      // For queries without .limit() — make the chain itself thenable
      then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) => {
        const result = typeof resultOrFn === 'function' ? (resultOrFn as () => unknown)() : resultOrFn;
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    // .from() and .where() return the chain so you can call .limit() or await directly
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    return chain;
  }

  return {
    db: {
      select: vi.fn().mockImplementation((...args: unknown[]) => {
        dbOps.selectCallCount++;
        const result = dbOps.selectResults.get(dbOps.selectCallCount);
        return createSelectChain(result ?? []);
      }),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })),
      transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {
          execute: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return fn(mockTx);
      }),
    },
    setTenantContext: (...args: unknown[]) => mockSetTenantContext(...args),
  };
});

vi.mock('@/db/schema/extraction', () => ({
  rawExtractions: { extractionId: 'extraction_id' },
  extractedMetrics: { extractionId: 'extraction_id', metricId: 'metric_id' },
  peerKpiValues: {
    tenantId: 'tenant_id',
    peerId: 'peer_id',
    paramId: 'param_id',
    fiscalYear: 'fiscal_year',
  },
  unmappedMetrics: {},
  documents: { docId: 'doc_id', peerId: 'peer_id' },
}));

vi.mock('@/db/schema/mapping', () => ({
  metricAliases: {},
  metricMappingRules: { active: 'active' },
}));

vi.mock('@/db/schema/kpi', () => ({
  kpiParameters: {},
}));

const mockFindAllForMatching = vi.fn();
vi.mock('@/db/repositories/parameterRepository', () => ({
  parameterRepository: {
    findAllForMatching: (...args: unknown[]) => mockFindAllForMatching(...args),
  },
}));

const mockMapMetric = vi.fn();
const mockClassifyMappingResult = vi.fn();

vi.mock('@/services/mappingService', () => ({
  mapMetric: (...args: unknown[]) => mockMapMetric(...args),
  classifyMappingResult: (...args: unknown[]) => mockClassifyMappingResult(...args),
  DEFAULT_THRESHOLDS: { autoMapThreshold: 85, reviewThreshold: 60 },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// --- Helpers ---

function createMockJob(data: MetricMappingJobData): Job<MetricMappingJobData> {
  return {
    id: 'test-job-id',
    name: 'metric-mapping',
    data,
    expireInSeconds: 900,
    heartbeatSeconds: null,
  } as Job<MetricMappingJobData>;
}

const MOCK_EXTRACTION = {
  extractionId: 'ext-1',
  tenantId: 'tenant-1',
  docId: 'doc-1',
  standard: 'BRSR',
  companyName: 'Test Corp',
  sector: 'Technology',
  country: 'India',
  currency: 'INR',
  reportingPeriod: 'April 2024 - March 2025',
  fiscalYear: '2024-25',
  rawPayload: {},
  extractionModel: 'gpt-4o',
  extractionPrompt: 'BRSR_v1',
  extractedAt: new Date(),
  status: 'pending_mapping',
  metricCount: 2,
  mappedCount: 0,
};

const MOCK_METRICS = [
  {
    metricId: 'metric-1',
    extractionId: 'ext-1',
    tenantId: 'tenant-1',
    standard: 'BRSR',
    section: 'P6',
    topic: 'Environment',
    metricName: 'Total Scope 1 GHG Emissions',
    metricValue: '160000',
    parsedValue: '160000',
    unit: 'tCO2e',
    indicatorType: 'essential',
    additionalContext: null,
    paramId: null,
    mappingConfidence: '0',
    mappingMethod: null,
    mappingStatus: 'unmapped',
    mappedBy: null,
    mappedAt: null,
  },
  {
    metricId: 'metric-2',
    extractionId: 'ext-1',
    tenantId: 'tenant-1',
    standard: 'BRSR',
    section: 'P3',
    topic: 'Employee Well-being',
    metricName: 'Unknown Metric XYZ',
    metricValue: '5000',
    parsedValue: '5000',
    unit: 'count',
    indicatorType: 'essential',
    additionalContext: null,
    paramId: null,
    mappingConfidence: '0',
    mappingMethod: null,
    mappingStatus: 'unmapped',
    mappedBy: null,
    mappedAt: null,
  },
];

const MOCK_PARAMS = [
  {
    paramId: 'param-1',
    tenantId: null,
    canonicalId: 'can-1',
    standard: 'BRSR',
    standardSection: 'P6',
    standardCode: 'P6-E1',
    code: 'BRSR-P6-E1',
    name: 'Total Scope 1 GHG Emissions',
    pillar: 'E',
    unit: 'tCO2e',
    dataType: 'numeric',
    category: 'emissions',
    status: 'active',
    overrideParamId: null,
  },
];

/**
 * Sets up DB mocks for a successful mapping flow.
 * DB select call sequence:
 *   1. raw_extractions lookup → [MOCK_EXTRACTION]
 *   2. documents lookup (peerId) → [{ peerId: 'peer-1' }]
 *   3. extracted_metrics → MOCK_METRICS
 *   4. metric_aliases → []
 *   5. metric_mapping_rules → []
 */
function setupHappyPath() {
  resetDbOps();
  mockSetTenantContext.mockResolvedValue(undefined);

  // Configure sequential select results
  dbOps.selectResults.set(1, [MOCK_EXTRACTION]);       // extraction
  dbOps.selectResults.set(2, [{ peerId: 'peer-1' }]);  // document peerId
  dbOps.selectResults.set(3, MOCK_METRICS);              // extracted metrics
  dbOps.selectResults.set(4, []);                        // aliases
  dbOps.selectResults.set(5, []);                        // rules

  mockFindAllForMatching.mockResolvedValue(MOCK_PARAMS);

  // First metric maps with high confidence, second unmapped
  mockMapMetric
    .mockResolvedValueOnce({ paramId: 'param-1', confidence: 100, method: 'exact' })
    .mockResolvedValueOnce({ paramId: null, confidence: 0, method: 'none', pillarGuess: 'S', categoryGuess: 'workforce' });

  mockClassifyMappingResult
    .mockReturnValueOnce('auto_mapped')
    .mockReturnValueOnce('unmapped');
}

// --- Tests ---

describe('metricMapping job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbOps();
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/test');
  });

  describe('handleMetricMapping', () => {
    it('processes a job successfully and returns counts', async () => {
      setupHappyPath();

      const { handleMetricMapping } = await import('./metricMapping');
      const jobs = [createMockJob({ extractionId: 'ext-1', tenantId: 'tenant-1' })];
      const results = await handleMetricMapping(jobs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result?.mappedCount).toBe(1);
      expect(results[0].result?.unmappedCount).toBe(1);
    });

    it('sets tenant context before processing', async () => {
      setupHappyPath();

      const { handleMetricMapping } = await import('./metricMapping');
      await handleMetricMapping([createMockJob({ extractionId: 'ext-1', tenantId: 'tenant-1' })]);

      expect(mockSetTenantContext).toHaveBeenCalledWith('tenant-1');
    });

    it('calls parameterRepository.findAllForMatching with tenantId', async () => {
      setupHappyPath();

      const { handleMetricMapping } = await import('./metricMapping');
      await handleMetricMapping([createMockJob({ extractionId: 'ext-1', tenantId: 'tenant-1' })]);

      expect(mockFindAllForMatching).toHaveBeenCalledWith('tenant-1');
    });

    it('calls mapMetric for each extracted metric', async () => {
      setupHappyPath();

      const { handleMetricMapping } = await import('./metricMapping');
      await handleMetricMapping([createMockJob({ extractionId: 'ext-1', tenantId: 'tenant-1' })]);

      expect(mockMapMetric).toHaveBeenCalledTimes(2);
    });

    it('returns failure when extraction is not found', async () => {
      resetDbOps();
      mockSetTenantContext.mockResolvedValue(undefined);
      dbOps.selectResults.set(1, []); // extraction not found

      const { handleMetricMapping } = await import('./metricMapping');
      const results = await handleMetricMapping([
        createMockJob({ extractionId: 'missing-ext', tenantId: 'tenant-1' }),
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Extraction not found');
    });

    it('handles empty metrics list gracefully', async () => {
      resetDbOps();
      mockSetTenantContext.mockResolvedValue(undefined);

      dbOps.selectResults.set(1, [MOCK_EXTRACTION]);       // extraction found
      dbOps.selectResults.set(2, [{ peerId: 'peer-1' }]);  // document
      dbOps.selectResults.set(3, []);                        // no metrics

      const { handleMetricMapping } = await import('./metricMapping');
      const results = await handleMetricMapping([
        createMockJob({ extractionId: 'ext-1', tenantId: 'tenant-1' }),
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result?.mappedCount).toBe(0);
      expect(results[0].result?.unmappedCount).toBe(0);
    });

    it('re-sets tenant context in error handler when extraction not found', async () => {
      resetDbOps();
      mockSetTenantContext.mockResolvedValue(undefined);
      dbOps.selectResults.set(1, []); // extraction not found

      const { handleMetricMapping } = await import('./metricMapping');
      await handleMetricMapping([
        createMockJob({ extractionId: 'missing', tenantId: 'tenant-1' }),
      ]);

      // Called once in processMappingJob, once in error handler
      expect(mockSetTenantContext).toHaveBeenCalledTimes(2);
      expect(mockSetTenantContext).toHaveBeenNthCalledWith(2, 'tenant-1');
    });

    it('includes reviewCount in result', async () => {
      setupHappyPath();

      // Override: second metric is review instead of unmapped
      mockMapMetric.mockReset();
      mockMapMetric
        .mockResolvedValueOnce({ paramId: 'param-1', confidence: 100, method: 'exact' })
        .mockResolvedValueOnce({ paramId: 'param-1', confidence: 70, method: 'fuzzy' });

      mockClassifyMappingResult.mockReset();
      mockClassifyMappingResult
        .mockReturnValueOnce('auto_mapped')
        .mockReturnValueOnce('auto_mapped_review');

      const { handleMetricMapping } = await import('./metricMapping');
      const results = await handleMetricMapping([
        createMockJob({ extractionId: 'ext-1', tenantId: 'tenant-1' }),
      ]);

      expect(results[0].success).toBe(true);
      expect(results[0].result).toHaveProperty('reviewCount');
      expect(results[0].result?.reviewCount).toBe(1);
      expect(results[0].result?.mappedCount).toBe(1);
    });
  });
});
