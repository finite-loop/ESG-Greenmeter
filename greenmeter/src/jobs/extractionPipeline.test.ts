import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'pg-boss';
import type { ExtractionJobData } from './extractionPipeline';

// --- Module mocks ---

vi.mock('pg-boss', () => {
  class MockPgBoss {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn();
    resume = vi.fn().mockResolvedValue(undefined);
  }
  return { PgBoss: MockPgBoss };
});

const mockDownload = vi.fn();
vi.mock('@/lib/blobStorage', () => ({
  download: (...args: unknown[]) => mockDownload(...args),
}));

const mockExtractText = vi.fn();
vi.mock('@/lib/documentIntelligence', () => ({
  extractText: (...args: unknown[]) => mockExtractText(...args),
}));

const mockComplete = vi.fn();
vi.mock('@/lib/llm', () => ({
  createLlmClient: () => ({
    complete: mockComplete,
  }),
}));

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbTransaction = vi.fn();
const mockSetTenantContext = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => mockDbSelect(),
    insert: (table: unknown) => mockDbInsert(table),
    update: (table: unknown) => mockDbUpdate(table),
    transaction: (fn: (tx: unknown) => Promise<unknown>) => mockDbTransaction(fn),
  },
  setTenantContext: (...args: unknown[]) => mockSetTenantContext(...args),
}));

vi.mock('@/db/schema/extraction', () => ({
  documents: { docId: 'doc_id' },
  rawExtractions: { extractionId: 'extraction_id' },
  extractedMetrics: {},
}));

vi.mock('@/db/schema/peers', () => ({
  peerOrganisations: { peerId: 'peer_id' },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// --- Helpers ---

function createMockJob(data: ExtractionJobData): Job<ExtractionJobData> {
  return {
    id: 'test-job-id',
    name: 'extraction-pipeline',
    data,
    expireInSeconds: 900,
    heartbeatSeconds: null,
  } as Job<ExtractionJobData>;
}

const MOCK_DOC = {
  docId: 'doc-1',
  tenantId: 'tenant-1',
  peerId: 'peer-1',
  standard: 'BRSR',
  fiscalYear: '2024-25',
  filename: 'report.pdf',
  contentType: 'application/pdf',
  fileSize: 1024,
  blobPath: 'documents/doc-1/report.pdf',
  blobUrl: null,
  status: 'processing',
  jobId: 'test-job-id',
  errorMessage: null,
  uploadedBy: 'user-1',
  uploadedAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_PEER = {
  name: 'Test Corp',
  sector: 'Technology',
  country: 'India',
};

const MOCK_BRSR_LLM_RESPONSE = JSON.stringify({
  document_info: {
    company_name: 'Test Corp',
    reporting_period: 'April 2024 - March 2025',
    fiscal_year: '2024-25',
    sector: 'Technology',
    country: 'India',
    currency: 'INR',
  },
  principles: [
    {
      principle_number: 'P6',
      principle_name: 'Environment',
      essential_indicators: [
        {
          metric_name: 'Total Scope 1 GHG Emissions',
          metric_value: '1,60,000',
          unit: 'tCO2e',
          additional_context: 'Direct emissions',
        },
        {
          metric_name: 'Total Energy Consumption',
          metric_value: '500000',
          unit: 'GJ',
          additional_context: null,
        },
      ],
      leadership_indicators: [
        {
          metric_name: 'Renewable Energy Share',
          metric_value: '35%',
          unit: '%',
          additional_context: null,
        },
      ],
    },
    {
      principle_number: 'P3',
      principle_name: 'Employee Well-being',
      essential_indicators: [
        {
          metric_name: 'Total Employees',
          metric_value: '5000',
          unit: 'count',
          additional_context: null,
        },
        {
          metric_name: 'Water Consumption',
          metric_value: 'NIL',
          unit: 'KL',
          additional_context: 'No water consumption reported',
        },
      ],
      leadership_indicators: [],
    },
  ],
});

/**
 * Creates a mock transaction function that executes the callback
 * with a mock tx object having insert/update methods.
 */
function createMockTransaction() {
  const txInsertReturningMock = vi.fn().mockResolvedValue([{ extractionId: 'ext-123' }]);
  const txInsertValuesMock = vi.fn().mockReturnValue({ returning: txInsertReturningMock });
  const txMetricsValuesMock = vi.fn().mockResolvedValue(undefined);
  const txUpdateSetMock = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });

  let txInsertCallCount = 0;

  const mockTx = {
    insert: () => {
      txInsertCallCount++;
      if (txInsertCallCount === 1) {
        return { values: txInsertValuesMock };
      }
      return { values: txMetricsValuesMock };
    },
    update: () => ({ set: txUpdateSetMock }),
  };

  mockDbTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn(mockTx);
  });

  return { mockTx, txInsertValuesMock, txMetricsValuesMock, txUpdateSetMock };
}

// --- Tests ---

describe('extractionPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/test');
    vi.stubEnv('LLM_MODEL', 'gpt-4o');
  });

  describe('parseNumericValue', () => {
    it('should be importable and testable', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue).toBeDefined();
    });

    it('returns null for null/undefined/empty', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue(null)).toBeNull();
      expect(parseNumericValue(undefined)).toBeNull();
      expect(parseNumericValue('')).toBeNull();
      expect(parseNumericValue('  ')).toBeNull();
    });

    it('returns null for NIL/NA sentinel values', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue('NIL')).toBeNull();
      expect(parseNumericValue('nil')).toBeNull();
      expect(parseNumericValue('NA')).toBeNull();
      expect(parseNumericValue('N/A')).toBeNull();
      expect(parseNumericValue('Not Applicable')).toBeNull();
      expect(parseNumericValue('Not Reported')).toBeNull();
      expect(parseNumericValue('-')).toBeNull();
      expect(parseNumericValue('--')).toBeNull();
      expect(parseNumericValue('Yes')).toBeNull();
      expect(parseNumericValue('No')).toBeNull();
    });

    it('parses standard numbers', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue('100')).toBe('100');
      expect(parseNumericValue('3.14')).toBe('3.14');
      expect(parseNumericValue('-42')).toBe('-42');
      expect(parseNumericValue('0')).toBe('0');
    });

    it('removes commas (standard and Indian formatting)', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue('1,000')).toBe('1000');
      expect(parseNumericValue('1,60,000')).toBe('160000');
      expect(parseNumericValue('1,00,00,000')).toBe('10000000');
    });

    it('handles percentage values', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue('35%')).toBe('35');
      expect(parseNumericValue('99.5%')).toBe('99.5');
    });

    it('handles currency symbols', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue('₹1000')).toBe('1000');
      expect(parseNumericValue('$500.50')).toBe('500.5');
    });

    it('handles parenthesized negatives', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue('(123)')).toBe('-123');
      expect(parseNumericValue('(1,000.50)')).toBe('-1000.5');
    });

    it('returns null for non-numeric strings', async () => {
      const { parseNumericValue } = await import('./extractionPipeline');
      expect(parseNumericValue('hello world')).toBeNull();
      expect(parseNumericValue('abc123def')).toBeNull();
    });
  });

  describe('extractJsonFromResponse', () => {
    it('parses plain JSON', async () => {
      const { extractJsonFromResponse } = await import('./extractionPipeline');
      const result = extractJsonFromResponse('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('strips markdown code fences', async () => {
      const { extractJsonFromResponse } = await import('./extractionPipeline');
      const result = extractJsonFromResponse('```json\n{"key": "value"}\n```');
      expect(result).toEqual({ key: 'value' });
    });

    it('strips <json_output> tags', async () => {
      const { extractJsonFromResponse } = await import('./extractionPipeline');
      const result = extractJsonFromResponse('<json_output>\n{"key": "value"}\n</json_output>');
      expect(result).toEqual({ key: 'value' });
    });

    it('throws on invalid JSON', async () => {
      const { extractJsonFromResponse } = await import('./extractionPipeline');
      expect(() => extractJsonFromResponse('not json')).toThrow();
    });
  });

  describe('parseLlmOutput', () => {
    it('parses BRSR format correctly', async () => {
      const { parseLlmOutput } = await import('./extractionPipeline');
      const payload = JSON.parse(MOCK_BRSR_LLM_RESPONSE);
      const { documentInfo, metrics } = parseLlmOutput(payload, 'BRSR');

      expect(documentInfo.companyName).toBe('Test Corp');
      expect(documentInfo.fiscalYear).toBe('2024-25');
      expect(documentInfo.currency).toBe('INR');
      expect(metrics).toHaveLength(5);
      expect(metrics[0].metricName).toBe('Total Scope 1 GHG Emissions');
      expect(metrics[0].section).toBe('P6');
      expect(metrics[0].indicatorType).toBe('essential');
      expect(metrics[2].indicatorType).toBe('leadership');
    });

    it('parses ESRS format correctly', async () => {
      const { parseLlmOutput } = await import('./extractionPipeline');
      const payload = {
        document_info: {
          company_name: 'EU Corp',
          reporting_period: '2024',
          fiscal_year: '2024',
          sector: 'Manufacturing',
          country: 'Germany',
          currency: 'EUR',
        },
        standards: [
          {
            standard_code: 'ESRS E1',
            standard_name: 'Climate Change',
            metrics: [
              {
                topic: 'Scope 1 Emissions',
                metric_name: 'Direct GHG Emissions',
                metric_value: '50000',
                unit: 'tCO2e',
                additional_context: null,
              },
            ],
          },
        ],
      };
      const { documentInfo, metrics } = parseLlmOutput(payload, 'ESRS');

      expect(documentInfo.companyName).toBe('EU Corp');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].section).toBe('ESRS E1');
      expect(metrics[0].topic).toBe('Scope 1 Emissions');
      expect(metrics[0].indicatorType).toBe('mandatory');
    });

    it('parses GRI format correctly', async () => {
      const { parseLlmOutput } = await import('./extractionPipeline');
      const payload = {
        document_info: {
          company_name: 'Global Inc',
          reporting_period: '2024',
          fiscal_year: '2024',
          sector: 'Energy',
          country: 'USA',
          currency: 'USD',
        },
        gri_standards: [
          {
            gri_series: 'GRI 305',
            series_name: 'Emissions',
            disclosures: [
              {
                gri_code: '305-1',
                disclosure_title: 'Direct (Scope 1) GHG emissions',
                metric_name: 'Scope 1 Emissions',
                metric_value: '100000',
                unit: 'tCO2e',
                additional_context: null,
              },
            ],
          },
        ],
      };
      const { documentInfo, metrics } = parseLlmOutput(payload, 'GRI');

      expect(documentInfo.companyName).toBe('Global Inc');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].section).toBe('GRI 305');
      expect(metrics[0].topic).toBe('Direct (Scope 1) GHG emissions');
    });

    it('handles empty metric arrays gracefully', async () => {
      const { parseLlmOutput } = await import('./extractionPipeline');
      const payload = {
        document_info: { company_name: 'Empty Corp' },
        principles: [],
      };
      const { metrics } = parseLlmOutput(payload, 'BRSR');
      expect(metrics).toHaveLength(0);
    });

    it('skips metrics without a metric_name', async () => {
      const { parseLlmOutput } = await import('./extractionPipeline');
      const payload = {
        document_info: { company_name: 'Test' },
        principles: [
          {
            principle_number: 'P1',
            principle_name: 'Test',
            essential_indicators: [
              { metric_name: '', metric_value: '100', unit: null },
              { metric_name: null, metric_value: '200', unit: null },
              { metric_name: 'Valid Metric', metric_value: '300', unit: 'kg' },
            ],
            leadership_indicators: [],
          },
        ],
      };
      const { metrics } = parseLlmOutput(payload, 'BRSR');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metricName).toBe('Valid Metric');
    });

    it('returns null for object values in safeStr (guards against [object Object])', async () => {
      const { parseLlmOutput } = await import('./extractionPipeline');
      const payload = {
        document_info: {
          company_name: { nested: 'object' },
          sector: ['array'],
        },
        principles: [],
      };
      const { documentInfo } = parseLlmOutput(payload, 'BRSR');
      expect(documentInfo.companyName).toBe('Unknown');
      expect(documentInfo.sector).toBeNull();
    });
  });

  describe('handleExtractionPipeline', () => {
    function setupHappyPath() {
      // DB select for document lookup
      const fromMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce([MOCK_DOC]),
        }),
      });
      // DB select for peer lookup
      const peerFromMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce([MOCK_PEER]),
        }),
      });

      let selectCallCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return { from: fromMock };
        }
        return { from: peerFromMock };
      });

      // Blob download
      mockDownload.mockResolvedValue(Buffer.from('fake-pdf-content'));

      // OCR
      mockExtractText.mockResolvedValue({
        fullText: 'Sample ESG report text content...',
        pages: [{ pageNumber: 1, text: 'Page 1 text' }],
      });

      // LLM
      mockComplete.mockResolvedValue(MOCK_BRSR_LLM_RESPONSE);

      // Transaction mock
      createMockTransaction();

      mockSetTenantContext.mockResolvedValue(undefined);
    }

    it('processes a job through the full pipeline successfully', async () => {
      setupHappyPath();

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'doc-1', tenantId: 'tenant-1' })];
      const results = await handleExtractionPipeline(jobs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result?.extractionId).toBe('ext-123');
      expect(results[0].result?.metricsFound).toBe(5);
    });

    it('sets tenant context before processing', async () => {
      setupHappyPath();

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'doc-1', tenantId: 'tenant-1' })];
      await handleExtractionPipeline(jobs);

      expect(mockSetTenantContext).toHaveBeenCalledWith('tenant-1');
    });

    it('calls blob download with correct tenant and path', async () => {
      setupHappyPath();

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'doc-1', tenantId: 'tenant-1' })];
      await handleExtractionPipeline(jobs);

      expect(mockDownload).toHaveBeenCalledWith('tenant-1', 'documents/doc-1/report.pdf');
    });

    it('calls OCR with the downloaded PDF buffer', async () => {
      setupHappyPath();

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'doc-1', tenantId: 'tenant-1' })];
      await handleExtractionPipeline(jobs);

      expect(mockExtractText).toHaveBeenCalledWith(Buffer.from('fake-pdf-content'));
    });

    it('uses a transaction for DB writes', async () => {
      setupHappyPath();

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'doc-1', tenantId: 'tenant-1' })];
      await handleExtractionPipeline(jobs);

      expect(mockDbTransaction).toHaveBeenCalledOnce();
    });

    it('returns failure when document is not found', async () => {
      const fromMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDbSelect.mockReturnValue({ from: fromMock });
      mockSetTenantContext.mockResolvedValue(undefined);

      // Mock the update for failure status
      const updateSetMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({ set: updateSetMock });

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'missing-doc', tenantId: 'tenant-1' })];
      const results = await handleExtractionPipeline(jobs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Document not found');
    });

    it('re-sets tenant context in error handler', async () => {
      const fromMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDbSelect.mockReturnValue({ from: fromMock });
      mockSetTenantContext.mockResolvedValue(undefined);

      const updateSetMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({ set: updateSetMock });

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'missing-doc', tenantId: 'tenant-1' })];
      await handleExtractionPipeline(jobs);

      // setTenantContext should be called twice: once in processExtractionJob, once in error handler
      expect(mockSetTenantContext).toHaveBeenCalledTimes(2);
      expect(mockSetTenantContext).toHaveBeenNthCalledWith(2, 'tenant-1');
    });

    it('returns failure when OCR produces no text', async () => {
      const fromMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn()
            .mockResolvedValueOnce([MOCK_DOC])
            .mockResolvedValueOnce([MOCK_PEER]),
        }),
      });
      mockDbSelect.mockReturnValue({ from: fromMock });
      mockDownload.mockResolvedValue(Buffer.from('pdf'));
      mockExtractText.mockResolvedValue({ fullText: '', pages: [] });
      mockSetTenantContext.mockResolvedValue(undefined);

      const updateSetMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({ set: updateSetMock });

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'doc-1', tenantId: 'tenant-1' })];
      const results = await handleExtractionPipeline(jobs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('OCR produced no text');
    });

    it('returns failure when LLM returns invalid JSON', async () => {
      const fromMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn()
            .mockResolvedValueOnce([MOCK_DOC])
            .mockResolvedValueOnce([MOCK_PEER]),
        }),
      });
      mockDbSelect.mockReturnValue({ from: fromMock });
      mockDownload.mockResolvedValue(Buffer.from('pdf'));
      mockExtractText.mockResolvedValue({ fullText: 'Some text', pages: [] });
      mockComplete.mockResolvedValue('This is not JSON at all');
      mockSetTenantContext.mockResolvedValue(undefined);

      const updateSetMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({ set: updateSetMock });

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [createMockJob({ documentId: 'doc-1', tenantId: 'tenant-1' })];
      const results = await handleExtractionPipeline(jobs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Failed to parse LLM JSON');
    });

    it('handles multiple jobs in sequence', async () => {
      // First job succeeds, second fails
      let selectCallCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCallCount++;
        const fromMock = vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              if (selectCallCount <= 2) {
                // First job: doc found, peer found
                return selectCallCount === 1
                  ? Promise.resolve([MOCK_DOC])
                  : Promise.resolve([MOCK_PEER]);
              }
              // Second job: doc not found
              return Promise.resolve([]);
            }),
          }),
        });
        return { from: fromMock };
      });

      mockDownload.mockResolvedValue(Buffer.from('pdf'));
      mockExtractText.mockResolvedValue({
        fullText: 'text',
        pages: [{ pageNumber: 1, text: 'text' }],
      });
      mockComplete.mockResolvedValue(MOCK_BRSR_LLM_RESPONSE);

      createMockTransaction();

      const updateSetMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({ set: updateSetMock });
      mockSetTenantContext.mockResolvedValue(undefined);

      const { handleExtractionPipeline } = await import('./extractionPipeline');
      const jobs = [
        createMockJob({ documentId: 'doc-1', tenantId: 'tenant-1' }),
        createMockJob({ documentId: 'doc-2', tenantId: 'tenant-1' }),
      ];
      const results = await handleExtractionPipeline(jobs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});

describe('extractionPrompts', () => {
  it('returns a prompt for each supported standard', async () => {
    const { getExtractionPrompt, isSupportedStandard } = await import('./extractionPrompts');

    for (const std of ['BRSR', 'ESRS', 'GRI'] as const) {
      expect(isSupportedStandard(std)).toBe(true);
      const prompt = getExtractionPrompt(std);
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    }
  });

  it('returns false for unsupported standards', async () => {
    const { isSupportedStandard } = await import('./extractionPrompts');
    expect(isSupportedStandard('IFRS')).toBe(false);
    expect(isSupportedStandard('')).toBe(false);
    expect(isSupportedStandard('brsr')).toBe(false);
  });

  it('throws for unsupported standard in getExtractionPrompt', async () => {
    const { getExtractionPrompt } = await import('./extractionPrompts');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getExtractionPrompt('INVALID' as any)).toThrow('Unsupported extraction standard');
  });
});
