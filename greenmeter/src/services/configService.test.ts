import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock configRepository
const mockGetThresholdsWithParams = vi.fn();
const mockGetThresholds = vi.fn();
const mockUpsertThreshold = vi.fn();
const mockGetWeights = vi.fn();
const mockReplaceWeights = vi.fn();

vi.mock('@/db/repositories/configRepository', () => ({
  configRepository: {
    getThresholdsWithParams: (...args: unknown[]) => mockGetThresholdsWithParams(...args),
    getThresholds: (...args: unknown[]) => mockGetThresholds(...args),
    upsertThreshold: (...args: unknown[]) => mockUpsertThreshold(...args),
    getWeights: (...args: unknown[]) => mockGetWeights(...args),
    replaceWeights: (...args: unknown[]) => mockReplaceWeights(...args),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock job submission
const mockSubmitJob = vi.fn();
vi.mock('@/jobs', () => ({
  submitJob: (...args: unknown[]) => mockSubmitJob(...args),
}));

import { configService } from './configService';

const TENANT_ID = 'tenant-123';
const USER_ID = 'user-456';

describe('configService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getThresholds', () => {
    it('merges platform defaults with tenant overrides', async () => {
      mockGetThresholdsWithParams.mockResolvedValue([
        // Tenant override for specific param
        {
          thresholdId: 't1',
          tenantId: TENANT_ID,
          paramId: 'param-1',
          category: 'Climate',
          pillar: 'E',
          redMax: '20',
          amberMax: '50',
          unit: '%',
          createdAt: new Date(),
          updatedAt: new Date(),
          paramName: 'CO2 Emissions',
          paramCode: 'E-01',
        },
        // Platform default for same param (should be overridden)
        {
          thresholdId: 't2',
          tenantId: null,
          paramId: 'param-1',
          category: 'Climate',
          pillar: 'E',
          redMax: '30',
          amberMax: '60',
          unit: '%',
          createdAt: new Date(),
          updatedAt: new Date(),
          paramName: 'CO2 Emissions',
          paramCode: 'E-01',
        },
        // Platform default for different param (should be kept)
        {
          thresholdId: 't3',
          tenantId: null,
          paramId: 'param-2',
          category: 'Water',
          pillar: 'E',
          redMax: '40',
          amberMax: '70',
          unit: 'liters',
          createdAt: new Date(),
          updatedAt: new Date(),
          paramName: 'Water Usage',
          paramCode: 'E-02',
        },
      ]);

      const result = await configService.getThresholds(TENANT_ID);

      expect(result).toHaveLength(2);
      // Tenant override should win
      expect(result[0].thresholdId).toBe('t1');
      expect(result[0].source).toBe('tenant');
      expect(result[0].redMax).toBe('20');
      // Platform default for different param should be kept
      expect(result[1].thresholdId).toBe('t3');
      expect(result[1].source).toBe('platform');
    });

    it('returns empty array when no thresholds exist', async () => {
      mockGetThresholdsWithParams.mockResolvedValue([]);
      const result = await configService.getThresholds(TENANT_ID);
      expect(result).toHaveLength(0);
    });
  });

  describe('upsertThreshold', () => {
    it('saves valid threshold override', async () => {
      const newValue = {
        thresholdId: 't-new',
        tenantId: TENANT_ID,
        paramId: 'param-1',
        category: 'Climate',
        pillar: 'E',
        redMax: '25',
        amberMax: '55',
        unit: '%',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUpsertThreshold.mockResolvedValue({ oldValue: null, newValue });

      const result = await configService.upsertThreshold(TENANT_ID, {
        paramId: 'param-1',
        category: 'Climate',
        pillar: 'E',
        redMax: '25',
        amberMax: '55',
        unit: '%',
      });

      expect(result.newValue.thresholdId).toBe('t-new');
      expect(result.oldValue).toBeNull();
    });

    it('rejects redMax > amberMax', async () => {
      await expect(
        configService.upsertThreshold(TENANT_ID, {
          redMax: '70',
          amberMax: '30',
        })
      ).rejects.toThrow('Red threshold must be less than or equal to amber threshold');
    });

    it('rejects non-numeric redMax', async () => {
      await expect(
        configService.upsertThreshold(TENANT_ID, {
          redMax: 'abc',
          amberMax: '60',
        })
      ).rejects.toThrow('redMax and amberMax must be valid numbers');
    });

    it('rejects non-numeric amberMax', async () => {
      await expect(
        configService.upsertThreshold(TENANT_ID, {
          redMax: '30',
          amberMax: 'xyz',
        })
      ).rejects.toThrow('redMax and amberMax must be valid numbers');
    });
  });

  describe('getWeights', () => {
    it('separates category and pillar weights', async () => {
      mockGetWeights.mockResolvedValue([
        // Tenant override for category weight
        { weightId: 'w1', tenantId: TENANT_ID, pillar: 'E', category: 'Climate', weight: '40', createdAt: new Date(), updatedAt: new Date() },
        // Platform default for same category (should be overridden)
        { weightId: 'w2', tenantId: null, pillar: 'E', category: 'Climate', weight: '33', createdAt: new Date(), updatedAt: new Date() },
        // Pillar weight
        { weightId: 'w3', tenantId: null, pillar: 'E', category: '_overall', weight: '40', createdAt: new Date(), updatedAt: new Date() },
        { weightId: 'w4', tenantId: null, pillar: 'S', category: '_overall', weight: '30', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await configService.getWeights(TENANT_ID);

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].weight).toBe('40');
      expect(result.categories[0].source).toBe('tenant');

      expect(result.pillars).toHaveLength(2);
      expect(result.pillars[0].pillar).toBe('E');
      expect(result.pillars[1].pillar).toBe('S');
    });
  });

  describe('saveWeights', () => {
    it('saves valid weights and triggers score-recompute', async () => {
      mockReplaceWeights.mockResolvedValue({
        oldValues: [],
        newValues: [
          { weightId: 'w1', tenantId: TENANT_ID, pillar: 'E', category: 'Climate', weight: '50', createdAt: new Date(), updatedAt: new Date() },
          { weightId: 'w2', tenantId: TENANT_ID, pillar: 'E', category: 'Pollution', weight: '50', createdAt: new Date(), updatedAt: new Date() },
          { weightId: 'w3', tenantId: TENANT_ID, pillar: 'E', category: '_overall', weight: '100', createdAt: new Date(), updatedAt: new Date() },
        ],
      });
      mockSubmitJob.mockResolvedValue('job-id-1');

      const result = await configService.saveWeights(TENANT_ID, USER_ID, [
        { pillar: 'E', category: 'Climate', weight: '50' },
        { pillar: 'E', category: 'Pollution', weight: '50' },
        { pillar: 'E', category: '_overall', weight: '100' },
      ]);

      expect(result.newValues).toHaveLength(3);
      expect(mockSubmitJob).toHaveBeenCalledWith(
        'score-recompute',
        expect.objectContaining({ tenantId: TENANT_ID, triggeredBy: USER_ID }),
        expect.objectContaining({ singletonKey: `score-recompute-weights-${TENANT_ID}` })
      );
    });

    it('rejects category weights that do not sum to 100%', async () => {
      await expect(
        configService.saveWeights(TENANT_ID, USER_ID, [
          { pillar: 'E', category: 'Climate', weight: '30' },
          { pillar: 'E', category: 'Pollution', weight: '30' },
        ])
      ).rejects.toThrow('Category weights for pillar "E" sum to 60.00%, must equal 100%');
    });

    it('rejects pillar weights that do not sum to 100%', async () => {
      await expect(
        configService.saveWeights(TENANT_ID, USER_ID, [
          { pillar: 'E', category: '_overall', weight: '40' },
          { pillar: 'S', category: '_overall', weight: '30' },
        ])
      ).rejects.toThrow('Pillar weights sum to 70.00%, must equal 100%');
    });

    it('rejects negative weight values', async () => {
      await expect(
        configService.saveWeights(TENANT_ID, USER_ID, [
          { pillar: 'E', category: 'Climate', weight: '-10' },
          { pillar: 'E', category: 'Pollution', weight: '110' },
        ])
      ).rejects.toThrow('Weight value "-10"');
    });

    it('rejects weight values over 100', async () => {
      // Two categories that sum to 100, but one exceeds individual range
      await expect(
        configService.saveWeights(TENANT_ID, USER_ID, [
          { pillar: 'E', category: 'Climate', weight: '101' },
          { pillar: 'E', category: 'Pollution', weight: '-1' },
        ])
      ).rejects.toThrow('Weight value');
    });

    it('rejects duplicate category/pillar entries', async () => {
      await expect(
        configService.saveWeights(TENANT_ID, USER_ID, [
          { pillar: 'E', category: 'Climate', weight: '50' },
          { pillar: 'E', category: 'Climate', weight: '50' },
        ])
      ).rejects.toThrow('Duplicate weight entry for E/Climate');
    });

    it('does not fail if score-recompute job submission fails', async () => {
      mockReplaceWeights.mockResolvedValue({ oldValues: [], newValues: [] });
      mockSubmitJob.mockRejectedValue(new Error('pg-boss down'));

      // Should not throw — job failure is non-blocking
      const result = await configService.saveWeights(TENANT_ID, USER_ID, []);
      expect(result.newValues).toEqual([]);
    });
  });
});
