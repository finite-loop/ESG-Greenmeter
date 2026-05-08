import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing the service
const mockTx = {
  execute: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  }),
};

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
  setTenantContext: vi.fn(),
}));

vi.mock('@/db/schema/kpi', () => ({
  kpiValues: { paramId: 'paramId', tenantId: 'tenantId', periodId: 'periodId', notApplicable: 'notApplicable', value: 'value' },
  kpiParameters: { paramId: 'paramId', tenantId: 'tenantId', name: 'name', direction: 'direction', pillar: 'pillar', category: 'category', unit: 'unit' },
}));

vi.mock('@/db/schema/config', () => ({
  thresholds: { tenantId: 'tenantId', paramId: 'paramId', category: 'category', pillar: 'pillar', redMax: 'redMax', amberMax: 'amberMax' },
  recommendations: {},
}));

vi.mock('@/db/schema/tenants', () => ({
  tenants: { tenantId: 'tenantId', active: 'active' },
  reportingPeriods: { tenantId: 'tenantId', periodId: 'periodId', active: 'active', endDate: 'endDate' },
}));

const mockDeleteByTenant = vi.fn().mockResolvedValue(0);
const mockInsertBatch = vi.fn().mockResolvedValue(0);
const mockGetByTenant = vi.fn().mockResolvedValue([]);

vi.mock('@/db/repositories/recommendationRepository', () => ({
  recommendationRepository: {
    deleteByTenant: (...args: unknown[]) => mockDeleteByTenant(...args),
    insertBatch: (...args: unknown[]) => mockInsertBatch(...args),
    getByTenant: (...args: unknown[]) => mockGetByTenant(...args),
  },
}));

const mockLlmComplete = vi.fn();
vi.mock('@/lib/llm', () => ({
  createLlmClient: () => ({ complete: mockLlmComplete }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('recommendationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset transaction mock chain
    mockTx.execute.mockResolvedValue(undefined);
    mockTx.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });
  });

  describe('generateRuleBasedAlerts', () => {
    it('returns empty array when no active period exists', async () => {
      const { db } = await import('@/db');
      // Mock chain: select().from().where().orderBy().limit() → []
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as never);

      const { recommendationService } = await import('./recommendationService');
      const result = await recommendationService.generateRuleBasedAlerts('tenant-1');

      expect(result).toEqual([]);
    });

    it('returns empty array when no KPI values found', async () => {
      const { db } = await import('@/db');

      // First call: periods query → returns one period
      // Second call: values query → returns empty
      // Third call: thresholds query → doesn't matter
      let callIndex = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          // Periods query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ periodId: 'period-1' }]),
                }),
              }),
            }),
          } as never;
        }
        // Values query (and all subsequent)
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as never;
      });

      const { recommendationService } = await import('./recommendationService');
      const result = await recommendationService.generateRuleBasedAlerts('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('generateLlmRecommendations', () => {
    it('returns empty array when no candidates exist', async () => {
      const { recommendationService } = await import('./recommendationService');
      const result = await recommendationService.generateLlmRecommendations('tenant-1', []);

      expect(result).toEqual([]);
    });

    it('returns empty array when only info-level alerts exist', async () => {
      const { recommendationService } = await import('./recommendationService');
      const infoAlerts = [{
        tenantId: 'tenant-1',
        metric: 'Carbon Emissions',
        recommendationText: 'test',
        priority: 'info' as const,
        source: 'rule' as const,
        currentValue: 55,
        thresholdValue: 60,
      }];

      const result = await recommendationService.generateLlmRecommendations('tenant-1', infoAlerts);
      expect(result).toEqual([]);
    });

    it('parses valid LLM JSON response', async () => {
      mockLlmComplete.mockResolvedValue(
        '{"recommendation": "Reduce energy consumption by upgrading to LED lighting.", "confidence": 85}'
      );

      const { recommendationService } = await import('./recommendationService');
      const candidates = [{
        tenantId: 'tenant-1',
        paramId: 'param-1',
        metric: 'Energy Consumption',
        recommendationText: 'existing',
        priority: 'critical' as const,
        source: 'rule' as const,
        currentValue: 100,
        thresholdValue: 60,
        pillar: 'E',
        category: 'Energy',
      }];

      const result = await recommendationService.generateLlmRecommendations('tenant-1', candidates);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('llm');
      expect(result[0].recommendationText).toBe('Reduce energy consumption by upgrading to LED lighting.');
      expect(result[0].confidence).toBe(85);
    });

    it('handles LLM failure gracefully', async () => {
      mockLlmComplete.mockRejectedValue(new Error('LLM unavailable'));

      const { recommendationService } = await import('./recommendationService');
      const candidates = [{
        tenantId: 'tenant-1',
        paramId: 'param-1',
        metric: 'Energy Consumption',
        recommendationText: 'existing',
        priority: 'critical' as const,
        source: 'rule' as const,
        currentValue: 100,
        thresholdValue: 60,
        pillar: 'E',
        category: 'Energy',
      }];

      // Should not throw, just return empty
      const result = await recommendationService.generateLlmRecommendations('tenant-1', candidates);
      expect(result).toEqual([]);
    });
  });

  describe('generateForTenant', () => {
    it('runs delete and insert inside a transaction with tenant context', async () => {
      const { db } = await import('@/db');
      // Mock all DB queries to return empty (no active period)
      vi.mocked(db.select).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as never));

      const { recommendationService } = await import('./recommendationService');
      await recommendationService.generateForTenant('tenant-1');

      // Transaction was called
      expect(db.transaction).toHaveBeenCalledOnce();
      // Tenant context was set inside the transaction
      expect(mockTx.execute).toHaveBeenCalled();
      // Delete was called inside the transaction
      expect(mockTx.delete).toHaveBeenCalled();
    });

    it('returns 0 when no alerts are generated', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.select).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as never));

      const { recommendationService } = await import('./recommendationService');
      const count = await recommendationService.generateForTenant('tenant-1');

      // No alerts generated → delete runs but insert returns 0
      expect(count).toBe(0);
    });
  });

  describe('getRecommendations', () => {
    it('delegates to repository', async () => {
      const mockRecs = [
        {
          recommendationId: 'r-1',
          tenantId: 'tenant-1',
          metric: 'Carbon Emissions',
          recommendationText: 'Reduce emissions',
          priority: 'critical',
          source: 'rule',
          createdAt: new Date(),
        },
      ];
      mockGetByTenant.mockResolvedValue(mockRecs);

      const { recommendationService } = await import('./recommendationService');
      const result = await recommendationService.getRecommendations('tenant-1', 10);

      expect(mockGetByTenant).toHaveBeenCalledWith('tenant-1', 10);
      expect(result).toBe(mockRecs);
    });
  });
});
