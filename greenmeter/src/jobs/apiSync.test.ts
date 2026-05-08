import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'pg-boss';
import type { ApiSyncJobData } from './apiSync';

// ─── Mock Setup ───────────────────────────────────────────────────────────────

vi.mock('pg-boss', () => {
  class MockPgBoss {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn();
    resume = vi.fn().mockResolvedValue(undefined);
  }
  return { PgBoss: MockPgBoss };
});

const mockSetTenantContext = vi.fn();
const mockDbExecute = vi.fn();

vi.mock('@/db', () => ({
  db: {
    execute: (...args: unknown[]) => mockDbExecute(...args),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            valueId: 'updated-value-id',
            value: '100',
            unit: 'kWh',
            sourceType: 'api',
            sourceRef: 'sap:test-job-id:2026-01-01T00:00:00.000Z',
          }]),
        }),
      }),
    }),
  },
  setTenantContext: (...args: unknown[]) => mockSetTenantContext(...args),
}));

const mockGetIntegrationConfig = vi.fn();
const mockUpsertIntegrationConfig = vi.fn();

vi.mock('@/db/repositories/configRepository', () => ({
  configRepository: {
    getIntegrationConfig: (...args: unknown[]) => mockGetIntegrationConfig(...args),
    upsertIntegrationConfig: (...args: unknown[]) => mockUpsertIntegrationConfig(...args),
  },
}));

const mockFindByParamNodePeriod = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/db/repositories/kpiRepository', () => ({
  kpiRepository: {
    findByParamNodePeriod: (...args: unknown[]) => mockFindByParamNodePeriod(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

const mockFindAllForMatching = vi.fn();

vi.mock('@/db/repositories/parameterRepository', () => ({
  parameterRepository: {
    findAllForMatching: (...args: unknown[]) => mockFindAllForMatching(...args),
  },
}));

const mockLogChange = vi.fn();

vi.mock('@/services/auditService', () => ({
  auditService: {
    logChange: (...args: unknown[]) => mockLogChange(...args),
  },
}));

vi.mock('@/lib/encryption', () => ({
  decrypt: vi.fn().mockReturnValue('decrypted-api-key'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSubmitJob = vi.fn();

vi.mock('@/jobs', () => ({
  submitJob: (...args: unknown[]) => mockSubmitJob(...args),
}));

// Mock drizzle-orm imports used in apiSync
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: vi.fn() }
  ),
}));

vi.mock('@/db/schema/kpi', () => ({
  kpiValues: {
    valueId: 'valueId',
    tenantId: 'tenantId',
    paramId: 'paramId',
    value: 'value',
    unit: 'unit',
    sourceType: 'sourceType',
    sourceRef: 'sourceRef',
    updatedAt: 'updatedAt',
  },
}));

// ─── Test Data ────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-123';
const NODE_ID = 'node-root-456';
const PERIOD_ID = 'period-789';

function createMockJob(data: ApiSyncJobData): Job<ApiSyncJobData> {
  return {
    id: 'test-job-id',
    name: 'api-sync',
    data,
    expireInSeconds: 900,
    heartbeatSeconds: null,
  } as Job<ApiSyncJobData>;
}

const MOCK_SAP_CONFIG = {
  configId: 'config-1',
  tenantId: TENANT_ID,
  key: 'integration_sap',
  value: {
    endpoint: 'https://sap.example.com/api/esg',
    credentialEncrypted: 'encrypted-key',
    scheduleCron: '0 2 * * *',
    enabled: true,
    fieldMappings: [
      { externalField: 'ENERGY_CONSUMPTION', paramCode: 'brsr-e-01' },
      { externalField: 'WATER_WITHDRAWAL', paramCode: 'brsr-e-05' },
    ],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_PARAMETERS = [
  { paramId: 'param-1', code: 'brsr-e-01', name: 'Total Energy Consumption', unit: 'GJ', dataType: 'numeric' },
  { paramId: 'param-2', code: 'brsr-e-05', name: 'Total Water Withdrawal', unit: 'KL', dataType: 'numeric' },
  { paramId: 'param-3', code: 'brsr-s-01', name: 'Total Headcount', unit: 'Number', dataType: 'numeric' },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('apiSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup for successful flow
    mockSetTenantContext.mockResolvedValue(undefined);
    mockDbExecute
      .mockResolvedValueOnce([{ node_id: NODE_ID }])   // root node query
      .mockResolvedValueOnce([{ period_id: PERIOD_ID }]); // active period query
    mockFindAllForMatching.mockResolvedValue(MOCK_PARAMETERS);
    mockFindByParamNodePeriod.mockResolvedValue(null); // no existing values
    mockInsert.mockImplementation((_tenantId: string, input: Record<string, unknown>) =>
      Promise.resolve({
        valueId: `new-value-${input.paramId}`,
        ...input,
        tenantId: _tenantId,
      })
    );
    mockLogChange.mockResolvedValue(undefined);
    mockSubmitJob.mockResolvedValue('job-id');
    mockUpsertIntegrationConfig.mockResolvedValue({ oldValue: null, newValue: {} });
  });

  describe('handleApiSync', () => {
    it('returns failure when integration config is not found', async () => {
      mockGetIntegrationConfig.mockResolvedValue(null);

      const { handleApiSync } = await import('./apiSync');
      const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
      const results = await handleApiSync(jobs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('No integration config found');
    });

    it('skips sync when integration is disabled', async () => {
      mockGetIntegrationConfig.mockResolvedValue({
        ...MOCK_SAP_CONFIG,
        value: { ...MOCK_SAP_CONFIG.value, enabled: false },
      });

      const { handleApiSync } = await import('./apiSync');
      const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
      const results = await handleApiSync(jobs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result?.recordsSynced).toBe(0);
    });

    it('fails when no root org node exists', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);

      // Use a mapped field name so metrics don't get filtered out before db.execute
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ d: { results: [{ FieldName: 'ENERGY_CONSUMPTION', Value: '1500' }] } }),
      });

      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([])  // empty root nodes
        .mockResolvedValueOnce([{ period_id: PERIOD_ID }]);

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        const results = await handleApiSync(jobs);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toContain('No root org node found');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('fails when no active reporting period exists', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ d: { results: [{ FieldName: 'ENERGY_CONSUMPTION', Value: '1500' }] } }),
      });

      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([{ node_id: NODE_ID }])
        .mockResolvedValueOnce([]); // no active periods

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        const results = await handleApiSync(jobs);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toContain('No active reporting period found');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('updates integration status on failure when config exists', async () => {
      mockGetIntegrationConfig
        .mockResolvedValueOnce(null)  // first call fails (no config found → processApiSyncJob throws)
        .mockResolvedValueOnce(MOCK_SAP_CONFIG); // second call for error recovery reads existing config

      const { handleApiSync } = await import('./apiSync');
      const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
      await handleApiSync(jobs);

      // Should update integration status with preserved config + failure fields
      expect(mockUpsertIntegrationConfig).toHaveBeenCalledWith(
        TENANT_ID,
        'sap',
        expect.objectContaining({
          lastSyncStatus: 'failed',
          lastSyncError: expect.stringContaining('No integration config found'),
        })
      );
    });

    it('skips status update on failure when config is missing', async () => {
      mockGetIntegrationConfig
        .mockResolvedValueOnce(null)  // first call fails (no config)
        .mockResolvedValueOnce(null); // second call also returns null

      const { handleApiSync } = await import('./apiSync');
      const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
      await handleApiSync(jobs);

      // Should NOT upsert when config is missing (avoids clobbering)
      expect(mockUpsertIntegrationConfig).not.toHaveBeenCalled();
    });

    it('updates integration status to success after successful sync', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);
      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([{ node_id: NODE_ID }])
        .mockResolvedValueOnce([{ period_id: PERIOD_ID }]);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          d: {
            results: [
              { FieldName: 'ENERGY_CONSUMPTION', Value: '1500' },
            ],
          },
        }),
      });

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        await handleApiSync(jobs);

        // Should update integration status with success
        expect(mockUpsertIntegrationConfig).toHaveBeenCalledWith(
          TENANT_ID,
          'sap',
          expect.objectContaining({
            lastSyncStatus: 'success',
            lastSyncError: null,
          })
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('mapMetricsToParams', () => {
    it('maps metrics using explicit field mappings', async () => {
      const { mapMetricsToParams } = await import('./apiSync');

      const metrics = [
        { externalFieldName: 'ENERGY_CONSUMPTION', value: '1500' },
        { externalFieldName: 'WATER_WITHDRAWAL', value: '2000', unit: 'KL' },
      ];

      const fieldMappings = [
        { externalField: 'ENERGY_CONSUMPTION', paramCode: 'brsr-e-01' },
        { externalField: 'WATER_WITHDRAWAL', paramCode: 'brsr-e-05' },
      ];

      const result = await mapMetricsToParams(TENANT_ID, metrics, fieldMappings);

      expect(result.mapped).toHaveLength(2);
      expect(result.unmapped).toHaveLength(0);
      expect(result.mapped[0].paramId).toBe('param-1');
      expect(result.mapped[0].value).toBe('1500');
      expect(result.mapped[1].paramId).toBe('param-2');
      expect(result.mapped[1].unit).toBe('KL');
    });

    it('falls back to direct param code matching when no field mappings', async () => {
      const { mapMetricsToParams } = await import('./apiSync');

      const metrics = [
        { externalFieldName: 'brsr-e-01', value: '1500' },
        { externalFieldName: 'brsr-s-01', value: '500' },
      ];

      const result = await mapMetricsToParams(TENANT_ID, metrics, undefined);

      expect(result.mapped).toHaveLength(2);
      expect(result.unmapped).toHaveLength(0);
      expect(result.mapped[0].paramId).toBe('param-1');
      expect(result.mapped[1].paramId).toBe('param-3');
    });

    it('is case-insensitive for field matching', async () => {
      const { mapMetricsToParams } = await import('./apiSync');

      const metrics = [
        { externalFieldName: 'energy_consumption', value: '1500' },
      ];

      const fieldMappings = [
        { externalField: 'ENERGY_CONSUMPTION', paramCode: 'BRSR-E-01' },
      ];

      const result = await mapMetricsToParams(TENANT_ID, metrics, fieldMappings);

      expect(result.mapped).toHaveLength(1);
      expect(result.mapped[0].paramId).toBe('param-1');
    });

    it('reports unmapped fields', async () => {
      const { mapMetricsToParams } = await import('./apiSync');

      const metrics = [
        { externalFieldName: 'UNKNOWN_FIELD', value: '999' },
        { externalFieldName: 'ANOTHER_UNKNOWN', value: '111' },
      ];

      const result = await mapMetricsToParams(TENANT_ID, metrics, undefined);

      expect(result.mapped).toHaveLength(0);
      expect(result.unmapped).toHaveLength(2);
      expect(result.unmapped).toContain('UNKNOWN_FIELD');
      expect(result.unmapped).toContain('ANOTHER_UNKNOWN');
    });

    it('handles mix of mapped and unmapped fields', async () => {
      const { mapMetricsToParams } = await import('./apiSync');

      const metrics = [
        { externalFieldName: 'brsr-e-01', value: '1500' },
        { externalFieldName: 'NONEXISTENT', value: '0' },
      ];

      const result = await mapMetricsToParams(TENANT_ID, metrics, undefined);

      expect(result.mapped).toHaveLength(1);
      expect(result.unmapped).toHaveLength(1);
    });
  });

  describe('getConnector', () => {
    it('returns SAP connector for sap type', async () => {
      const { getConnector } = await import('./apiSync');
      const connector = getConnector('sap');
      expect(connector).toBeDefined();
      expect(typeof connector.fetchMetrics).toBe('function');
    });

    it('returns Darwinbox connector for darwinbox type', async () => {
      const { getConnector } = await import('./apiSync');
      const connector = getConnector('darwinbox');
      expect(connector).toBeDefined();
      expect(typeof connector.fetchMetrics).toBe('function');
    });

    it('throws for unknown integration type', async () => {
      const { getConnector } = await import('./apiSync');
      expect(() => getConnector('unknown')).toThrow('No connector implementation');
    });
  });

  describe('sapConnector', () => {
    it('parses SAP OData response format', async () => {
      const mockResponse = {
        d: {
          results: [
            { FieldName: 'ENERGY', Value: '1500', Unit: 'GJ' },
            { FieldName: 'WATER', Value: '2000', Unit: 'KL' },
          ],
        },
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      try {
        const { sapConnector } = await import('./apiSync');
        const metrics = await sapConnector.fetchMetrics('https://sap.example.com/api', 'key');

        expect(metrics).toHaveLength(2);
        expect(metrics[0].externalFieldName).toBe('ENERGY');
        expect(metrics[0].value).toBe('1500');
        expect(metrics[0].unit).toBe('GJ');
        expect(metrics[1].externalFieldName).toBe('WATER');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('filters out empty field names and values', async () => {
      const mockResponse = {
        d: {
          results: [
            { FieldName: 'VALID', Value: '100' },
            { FieldName: '', Value: '200' },
            { FieldName: 'ALSO_VALID', Value: '' },
          ],
        },
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      try {
        const { sapConnector } = await import('./apiSync');
        const metrics = await sapConnector.fetchMetrics('https://sap.example.com/api', 'key');

        expect(metrics).toHaveLength(1);
        expect(metrics[0].externalFieldName).toBe('VALID');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('rejects non-primitive values (objects, arrays, booleans)', async () => {
      const mockResponse = {
        d: {
          results: [
            { FieldName: 'VALID', Value: '100' },
            { FieldName: 'OBJ_VALUE', Value: { nested: 'object' } },
            { FieldName: 'ARRAY_VALUE', Value: [1, 2, 3] },
            { FieldName: 'BOOL_VALUE', Value: false },
            { FieldName: { nested: 'field' }, Value: '200' },
            { FieldName: 'NUMERIC_ZERO', Value: 0 },
          ],
        },
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      try {
        const { sapConnector } = await import('./apiSync');
        const metrics = await sapConnector.fetchMetrics('https://sap.example.com/api', 'key');

        // Only VALID (string value) and NUMERIC_ZERO (number 0 → "0") should pass
        expect(metrics).toHaveLength(2);
        expect(metrics[0].externalFieldName).toBe('VALID');
        expect(metrics[0].value).toBe('100');
        expect(metrics[1].externalFieldName).toBe('NUMERIC_ZERO');
        expect(metrics[1].value).toBe('0');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('throws on non-OK HTTP response', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      try {
        const { sapConnector } = await import('./apiSync');
        await expect(sapConnector.fetchMetrics('https://sap.example.com/api', 'key'))
          .rejects.toThrow('SAP API returned HTTP 500');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('throws on missing results array', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ d: {} }),
      });

      try {
        const { sapConnector } = await import('./apiSync');
        await expect(sapConnector.fetchMetrics('https://sap.example.com/api', 'key'))
          .rejects.toThrow('does not contain a results array');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('darwinboxConnector', () => {
    it('parses Darwinbox response format', async () => {
      const mockResponse = {
        data: [
          { metric_id: 'HEADCOUNT', metric_value: '500' },
          { metric_id: 'TRAINING_HOURS', metric_value: '1200', unit: 'Hours' },
        ],
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      try {
        const { darwinboxConnector } = await import('./apiSync');
        const metrics = await darwinboxConnector.fetchMetrics('https://darwinbox.example.com/api', 'key');

        expect(metrics).toHaveLength(2);
        expect(metrics[0].externalFieldName).toBe('HEADCOUNT');
        expect(metrics[0].value).toBe('500');
        expect(metrics[1].unit).toBe('Hours');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('throws on non-OK HTTP response', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      try {
        const { darwinboxConnector } = await import('./apiSync');
        await expect(darwinboxConnector.fetchMetrics('https://darwinbox.example.com/api', 'key'))
          .rejects.toThrow('Darwinbox API returned HTTP 401');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('audit logging', () => {
    it('audit logs are called for each created value', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);

      // Reset and re-setup db.execute mocks for this specific test
      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([{ node_id: NODE_ID }])
        .mockResolvedValueOnce([{ period_id: PERIOD_ID }]);

      // Mock fetch for SAP connector
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          d: {
            results: [
              { FieldName: 'ENERGY_CONSUMPTION', Value: '1500', Unit: 'GJ' },
            ],
          },
        }),
      });

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        const results = await handleApiSync(jobs);

        expect(results[0].success).toBe(true);
        expect(results[0].result?.recordsSynced).toBe(1);

        // Verify audit log was called for the CREATE
        expect(mockLogChange).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'system',
            tenantId: TENANT_ID,
            action: 'CREATE',
            entityType: 'kpi_value',
          })
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('audit logs UPDATE action when value already exists', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);
      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([{ node_id: NODE_ID }])
        .mockResolvedValueOnce([{ period_id: PERIOD_ID }]);
      mockFindByParamNodePeriod.mockResolvedValue({
        valueId: 'existing-value-1',
        value: '1000',
        unit: 'GJ',
        sourceType: 'manual',
        sourceRef: null,
      });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          d: {
            results: [
              { FieldName: 'ENERGY_CONSUMPTION', Value: '1500', Unit: 'GJ' },
            ],
          },
        }),
      });

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        const results = await handleApiSync(jobs);

        expect(results[0].success).toBe(true);

        // Verify audit log was called for UPDATE with old/new values
        expect(mockLogChange).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'UPDATE',
            entityType: 'kpi_value',
            oldValue: expect.objectContaining({ value: '1000' }),
          })
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('score recomputation', () => {
    it('enqueues score recompute after successful sync', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);
      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([{ node_id: NODE_ID }])
        .mockResolvedValueOnce([{ period_id: PERIOD_ID }]);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          d: {
            results: [
              { FieldName: 'ENERGY_CONSUMPTION', Value: '1500' },
            ],
          },
        }),
      });

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        await handleApiSync(jobs);

        expect(mockSubmitJob).toHaveBeenCalledWith(
          'score-recompute',
          expect.objectContaining({
            tenantId: TENANT_ID,
            periodId: PERIOD_ID,
            triggeredBy: 'api-sync',
          }),
          expect.any(Object)
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('does not enqueue score recompute when no records synced', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);
      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([{ node_id: NODE_ID }])
        .mockResolvedValueOnce([{ period_id: PERIOD_ID }]);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          d: { results: [] },
        }),
      });

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        await handleApiSync(jobs);

        expect(mockSubmitJob).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('concurrent upsert race condition', () => {
    it('catches 23505 unique constraint violation and retries as update', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);
      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([{ node_id: NODE_ID }])
        .mockResolvedValueOnce([{ period_id: PERIOD_ID }]);

      // First findByParamNodePeriod returns null (no existing), then insert fails with 23505,
      // then second findByParamNodePeriod returns the concurrently-inserted row
      mockFindByParamNodePeriod
        .mockResolvedValueOnce(null) // initial check — no existing value
        .mockResolvedValueOnce({     // re-read after 23505 — race winner found
          valueId: 'race-winner-id',
          value: '999',
          unit: 'GJ',
          sourceType: 'api',
          sourceRef: 'other-job:xyz',
        });

      const pgError = new Error('duplicate key value violates unique constraint');
      (pgError as unknown as { code: string }).code = '23505';
      mockInsert.mockRejectedValueOnce(pgError);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          d: {
            results: [
              { FieldName: 'ENERGY_CONSUMPTION', Value: '1500' },
            ],
          },
        }),
      });

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        const results = await handleApiSync(jobs);

        expect(results[0].success).toBe(true);
        expect(results[0].result?.recordsSynced).toBe(1);

        // Verify audit log was called with UPDATE action and concurrentRetry metadata
        expect(mockLogChange).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'UPDATE',
            entityId: 'race-winner-id',
            metadata: expect.objectContaining({
              concurrentRetry: true,
            }),
          })
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('error resilience', () => {
    it('continues processing remaining metrics after individual upsert failure', async () => {
      mockGetIntegrationConfig.mockResolvedValue(MOCK_SAP_CONFIG);
      mockDbExecute
        .mockReset()
        .mockResolvedValueOnce([{ node_id: NODE_ID }])
        .mockResolvedValueOnce([{ period_id: PERIOD_ID }]);

      // First insert fails, second succeeds
      mockInsert
        .mockRejectedValueOnce(new Error('DB constraint violation'))
        .mockImplementation((_tenantId: string, input: Record<string, unknown>) =>
          Promise.resolve({
            valueId: `new-value-${input.paramId}`,
            ...input,
            tenantId: _tenantId,
          })
        );

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          d: {
            results: [
              { FieldName: 'ENERGY_CONSUMPTION', Value: '1500' },
              { FieldName: 'WATER_WITHDRAWAL', Value: '2000' },
            ],
          },
        }),
      });

      try {
        const { handleApiSync } = await import('./apiSync');
        const jobs = [createMockJob({ tenantId: TENANT_ID, integrationType: 'sap' })];
        const results = await handleApiSync(jobs);

        expect(results[0].success).toBe(true);
        expect(results[0].result?.recordsSynced).toBe(1);
        expect(results[0].result?.errorsCount).toBe(1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
