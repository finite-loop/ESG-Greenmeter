import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
const mockFindExtraction = vi.fn();
const mockFindFlaggedMetrics = vi.fn();
const mockFindMetricById = vi.fn();
const mockUpdateMetricMapping = vi.fn();
const mockInsertAlias = vi.fn();
const mockUpsertPeerKpiValue = vi.fn();
const mockDeletePeerKpiValueByMetric = vi.fn();
const mockFindPeerIdByDocId = vi.fn();
const mockFindCanonicalId = vi.fn();
const mockUpdateExtractionMappedCount = vi.fn();
const mockFindExtractionByDocId = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/db/repositories/mappingReviewRepository', () => ({
  mappingReviewRepository: {
    findExtraction: (...args: unknown[]) => mockFindExtraction(...args),
    findFlaggedMetrics: (...args: unknown[]) => mockFindFlaggedMetrics(...args),
    findMetricById: (...args: unknown[]) => mockFindMetricById(...args),
    updateMetricMapping: (...args: unknown[]) => mockUpdateMetricMapping(...args),
    insertAlias: (...args: unknown[]) => mockInsertAlias(...args),
    upsertPeerKpiValue: (...args: unknown[]) => mockUpsertPeerKpiValue(...args),
    deletePeerKpiValueByMetric: (...args: unknown[]) => mockDeletePeerKpiValueByMetric(...args),
    findPeerIdByDocId: (...args: unknown[]) => mockFindPeerIdByDocId(...args),
    findCanonicalId: (...args: unknown[]) => mockFindCanonicalId(...args),
    updateExtractionMappedCount: (...args: unknown[]) => mockUpdateExtractionMappedCount(...args),
    findExtractionByDocId: (...args: unknown[]) => mockFindExtractionByDocId(...args),
    get db() {
      return {
        transaction: (...args: unknown[]) => mockTransaction(...args),
      };
    },
  },
}));

vi.mock('@/lib/errors', () => ({
  AppError: class AppError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number,
      public details?: Record<string, string[]>
    ) {
      super(message);
    }
  },
  ErrorCode: {
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { mappingReviewService } from './mappingReviewService';

const EXTRACTION_ID = 'ext-111';
const METRIC_ID = 'met-222';
const PARAM_ID = 'par-333';
const USER_ID = 'usr-444';
const DOC_ID = 'doc-555';
const PEER_ID = 'peer-666';
const TENANT_ID = 'tenant-777';

function createMetric(overrides: Record<string, unknown> = {}) {
  return {
    metricId: METRIC_ID,
    extractionId: EXTRACTION_ID,
    tenantId: TENANT_ID,
    standard: 'BRSR',
    metricName: 'Total GHG Emissions',
    metricValue: '1500',
    parsedValue: '1500',
    unit: 'tCO2e',
    paramId: PARAM_ID,
    mappingStatus: 'auto_mapped',
    ...overrides,
  };
}

function createExtraction() {
  return {
    extractionId: EXTRACTION_ID,
    tenantId: TENANT_ID,
    docId: DOC_ID,
    standard: 'BRSR',
    fiscalYear: '2024',
  };
}

describe('mappingReviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindExtraction.mockResolvedValue(createExtraction());
    mockFindPeerIdByDocId.mockResolvedValue(PEER_ID);
    mockFindCanonicalId.mockResolvedValue('can-888');
    mockUpdateMetricMapping.mockResolvedValue(undefined);
    mockInsertAlias.mockResolvedValue(true);
    mockUpsertPeerKpiValue.mockResolvedValue(undefined);
    mockDeletePeerKpiValueByMetric.mockResolvedValue(undefined);
    mockUpdateExtractionMappedCount.mockResolvedValue(undefined);
    // Transaction mock: execute the callback immediately with a fake tx
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb({});
    });
  });

  describe('listFlaggedMetrics', () => {
    it('returns flagged metrics for a valid extraction', async () => {
      const metrics = [createMetric()];
      mockFindFlaggedMetrics.mockResolvedValue(metrics);

      const result = await mappingReviewService.listFlaggedMetrics(EXTRACTION_ID);

      expect(mockFindExtraction).toHaveBeenCalledWith(EXTRACTION_ID);
      expect(mockFindFlaggedMetrics).toHaveBeenCalledWith(EXTRACTION_ID);
      expect(result).toEqual(metrics);
    });

    it('throws NOT_FOUND if extraction does not exist', async () => {
      mockFindExtraction.mockResolvedValue(null);

      await expect(
        mappingReviewService.listFlaggedMetrics('nonexistent')
      ).rejects.toThrow('not found');
    });
  });

  describe('processDecision — confirm', () => {
    it('confirms a metric with existing paramId', async () => {
      mockFindMetricById.mockResolvedValue(createMetric());

      const result = await mappingReviewService.processDecision(USER_ID, EXTRACTION_ID, {
        metricId: METRIC_ID,
        action: 'confirm',
      });

      expect(result.action).toBe('confirm');
      expect(result.mappingStatus).toBe('manual_mapped');
      expect(result.paramId).toBe(PARAM_ID);

      // Transaction should have been used
      expect(mockTransaction).toHaveBeenCalled();

      expect(mockUpdateMetricMapping).toHaveBeenCalledWith(
        METRIC_ID,
        expect.objectContaining({
          paramId: PARAM_ID,
          mappingStatus: 'manual_mapped',
          mappingMethod: 'manual',
          mappedBy: USER_ID,
          mappingConfidence: '100',
        }),
        expect.anything() // tx
      );

      expect(mockInsertAlias).toHaveBeenCalledWith(PARAM_ID, 'Total GHG Emissions', 'BRSR', expect.anything());
      expect(mockUpsertPeerKpiValue).toHaveBeenCalled();
      expect(mockUpdateExtractionMappedCount).toHaveBeenCalledWith(EXTRACTION_ID, expect.anything());
    });

    it('reports aliasCreated as false when alias already existed', async () => {
      mockFindMetricById.mockResolvedValue(createMetric());
      mockInsertAlias.mockResolvedValue(false); // ON CONFLICT — already existed

      const result = await mappingReviewService.processDecision(USER_ID, EXTRACTION_ID, {
        metricId: METRIC_ID,
        action: 'confirm',
      });

      expect(result.aliasCreated).toBe(false);
    });

    it('throws VALIDATION_ERROR if metric has no paramId', async () => {
      mockFindMetricById.mockResolvedValue(createMetric({ paramId: null }));

      await expect(
        mappingReviewService.processDecision(USER_ID, EXTRACTION_ID, {
          metricId: METRIC_ID,
          action: 'confirm',
        })
      ).rejects.toThrow('no suggested mapping');
    });
  });

  describe('processDecision — reassign', () => {
    it('reassigns a metric to a different param', async () => {
      const newParamId = 'new-param-999';
      mockFindMetricById.mockResolvedValue(createMetric());

      const result = await mappingReviewService.processDecision(USER_ID, EXTRACTION_ID, {
        metricId: METRIC_ID,
        action: 'reassign',
        paramId: newParamId,
      });

      expect(result.action).toBe('reassign');
      expect(result.mappingStatus).toBe('manual_mapped');
      expect(result.paramId).toBe(newParamId);

      // Transaction should have been used
      expect(mockTransaction).toHaveBeenCalled();

      // Old peer_kpi_values should be deleted first
      expect(mockDeletePeerKpiValueByMetric).toHaveBeenCalledWith(METRIC_ID, expect.anything());

      expect(mockUpdateMetricMapping).toHaveBeenCalledWith(
        METRIC_ID,
        expect.objectContaining({
          paramId: newParamId,
          mappingStatus: 'manual_mapped',
        }),
        expect.anything() // tx
      );

      expect(mockInsertAlias).toHaveBeenCalledWith(newParamId, 'Total GHG Emissions', 'BRSR', expect.anything());
      expect(mockUpsertPeerKpiValue).toHaveBeenCalled();
    });

    it('throws VALIDATION_ERROR if paramId not provided for reassign', async () => {
      mockFindMetricById.mockResolvedValue(createMetric());

      await expect(
        mappingReviewService.processDecision(USER_ID, EXTRACTION_ID, {
          metricId: METRIC_ID,
          action: 'reassign',
        })
      ).rejects.toThrow('paramId is required');
    });
  });

  describe('processDecision — reject', () => {
    it('rejects a metric while preserving paramId', async () => {
      mockFindMetricById.mockResolvedValue(createMetric());

      const result = await mappingReviewService.processDecision(USER_ID, EXTRACTION_ID, {
        metricId: METRIC_ID,
        action: 'reject',
      });

      expect(result.action).toBe('reject');
      expect(result.mappingStatus).toBe('rejected');
      // Reject preserves the suggested paramId
      expect(result.paramId).toBe(PARAM_ID);
      expect(result.aliasCreated).toBe(false);

      expect(mockUpdateMetricMapping).toHaveBeenCalledWith(
        METRIC_ID,
        expect.objectContaining({
          mappingStatus: 'rejected',
          mappingConfidence: '0',
        })
      );

      // paramId should NOT be in the update fields for reject
      const updateCall = mockUpdateMetricMapping.mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty('paramId');

      // Alias should NOT be created on reject
      expect(mockInsertAlias).not.toHaveBeenCalled();
      // peer_kpi_values should NOT be deleted or created on reject
      expect(mockDeletePeerKpiValueByMetric).not.toHaveBeenCalled();
      expect(mockUpsertPeerKpiValue).not.toHaveBeenCalled();
    });
  });

  describe('processDecision — metric not found', () => {
    it('throws NOT_FOUND when metric does not exist', async () => {
      mockFindMetricById.mockResolvedValue(null);

      await expect(
        mappingReviewService.processDecision(USER_ID, EXTRACTION_ID, {
          metricId: 'nonexistent',
          action: 'confirm',
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('processDecision — extraction mismatch', () => {
    it('throws VALIDATION_ERROR when metric belongs to different extraction', async () => {
      mockFindMetricById.mockResolvedValue(createMetric({ extractionId: 'other-extraction' }));

      await expect(
        mappingReviewService.processDecision(USER_ID, EXTRACTION_ID, {
          metricId: METRIC_ID,
          action: 'confirm',
        })
      ).rejects.toThrow('does not belong');
    });
  });

  describe('findExtractionByDocId', () => {
    it('returns extraction summary for valid docId', async () => {
      const summary = {
        extractionId: EXTRACTION_ID,
        standard: 'BRSR',
        companyName: 'Test Corp',
        metricCount: 10,
        mappedCount: 5,
        status: 'completed',
        extractedAt: new Date(),
      };
      mockFindExtractionByDocId.mockResolvedValue(summary);

      const result = await mappingReviewService.findExtractionByDocId(DOC_ID);

      expect(mockFindExtractionByDocId).toHaveBeenCalledWith(DOC_ID);
      expect(result).toEqual(summary);
    });

    it('throws NOT_FOUND when no extraction exists for document', async () => {
      mockFindExtractionByDocId.mockResolvedValue(null);

      await expect(
        mappingReviewService.findExtractionByDocId('nonexistent')
      ).rejects.toThrow('No extraction found');
    });
  });

  describe('_createPeerKpiValue', () => {
    it('creates peer KPI value with correct data', async () => {
      const metric = createMetric();

      await mappingReviewService._createPeerKpiValue(metric, PARAM_ID);

      expect(mockUpsertPeerKpiValue).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          peerId: PEER_ID,
          paramId: PARAM_ID,
          canonicalId: 'can-888',
          fiscalYear: '2024',
          value: '1500',
          unit: 'tCO2e',
          sourceExtractionId: EXTRACTION_ID,
          sourceMetricId: METRIC_ID,
          confidence: '100',
        }),
        undefined // no tx passed
      );
    });

    it('does nothing if extraction not found', async () => {
      mockFindExtraction.mockResolvedValue(null);

      await mappingReviewService._createPeerKpiValue(createMetric(), PARAM_ID);

      expect(mockUpsertPeerKpiValue).not.toHaveBeenCalled();
    });

    it('does nothing if peerId not found', async () => {
      mockFindPeerIdByDocId.mockResolvedValue(null);

      await mappingReviewService._createPeerKpiValue(createMetric(), PARAM_ID);

      expect(mockUpsertPeerKpiValue).not.toHaveBeenCalled();
    });
  });
});
