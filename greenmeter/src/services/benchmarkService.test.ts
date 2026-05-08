import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
const mockGetPercentiles = vi.fn();
const mockGetTenantValue = vi.fn();
const mockGetPercentileRank = vi.fn();
const mockGetAvailableMetrics = vi.fn();

vi.mock('@/db/repositories/benchmarkRepository', () => ({
  benchmarkRepository: {
    getPercentiles: (...args: unknown[]) => mockGetPercentiles(...args),
    getTenantValue: (...args: unknown[]) => mockGetTenantValue(...args),
    getPercentileRank: (...args: unknown[]) => mockGetPercentileRank(...args),
    getAvailableMetrics: (...args: unknown[]) => mockGetAvailableMetrics(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { benchmarkService } from './benchmarkService';

const TENANT_ID = 'tenant-001';
const CANONICAL_ID = 'canonical-001';
const FISCAL_YEAR = '2023-24';
const PERIOD_ID = 'period-001';
const SECTOR = 'Energy';

const mockPercentiles = {
  canonicalId: CANONICAL_ID,
  canonicalName: 'GHG Emissions Scope 1',
  pillar: 'E',
  category: 'Climate',
  q1: 100,
  median: 200,
  q3: 350,
  min: 50,
  max: 500,
  peerCount: 10,
};

describe('benchmarkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBenchmark', () => {
    it('returns benchmark with all quartiles and tenant rank', async () => {
      mockGetPercentiles.mockResolvedValue(mockPercentiles);
      mockGetTenantValue.mockResolvedValue({
        canonicalId: CANONICAL_ID,
        value: 150,
        paramId: 'param-001',
      });
      mockGetPercentileRank.mockResolvedValue(35);

      const result = await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR,
        PERIOD_ID,
        SECTOR
      );

      expect(result).not.toBeNull();
      expect(result!.canonicalId).toBe(CANONICAL_ID);
      expect(result!.canonicalName).toBe('GHG Emissions Scope 1');
      expect(result!.sectorMedian).toBe(200);
      expect(result!.q1).toBe(100);
      expect(result!.q2).toBe(200); // Same as median
      expect(result!.q3).toBe(350);
      expect(result!.q4).toBe(500); // Max value
      expect(result!.min).toBe(50);
      expect(result!.max).toBe(500);
      expect(result!.tenantValue).toBe(150);
      expect(result!.percentileRank).toBe(35);
      expect(result!.peerCount).toBe(10);
      expect(result!.insufficientData).toBe(false);
    });

    it('flags insufficient data when fewer than 3 peers', async () => {
      mockGetPercentiles.mockResolvedValue({
        ...mockPercentiles,
        peerCount: 2,
      });
      mockGetTenantValue.mockResolvedValue(null);

      const result = await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR,
        PERIOD_ID,
        SECTOR
      );

      expect(result).not.toBeNull();
      expect(result!.insufficientData).toBe(true);
      expect(result!.peerCount).toBe(2);
    });

    it('returns null when no peer data exists', async () => {
      mockGetPercentiles.mockResolvedValue(null);

      const result = await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR,
        PERIOD_ID,
        SECTOR
      );

      expect(result).toBeNull();
    });

    it('returns benchmark without tenant value when no periodId provided', async () => {
      mockGetPercentiles.mockResolvedValue(mockPercentiles);

      const result = await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR,
        undefined, // no periodId
        SECTOR
      );

      expect(result).not.toBeNull();
      expect(result!.tenantValue).toBeNull();
      expect(result!.percentileRank).toBeNull();
      expect(mockGetTenantValue).not.toHaveBeenCalled();
      expect(mockGetPercentileRank).not.toHaveBeenCalled();
    });

    it('returns benchmark without tenant rank when tenant has no value', async () => {
      mockGetPercentiles.mockResolvedValue(mockPercentiles);
      mockGetTenantValue.mockResolvedValue(null);

      const result = await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR,
        PERIOD_ID,
        SECTOR
      );

      expect(result).not.toBeNull();
      expect(result!.tenantValue).toBeNull();
      expect(result!.percentileRank).toBeNull();
    });

    it('passes sector filter to repository', async () => {
      mockGetPercentiles.mockResolvedValue(mockPercentiles);

      await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR,
        undefined,
        'Manufacturing'
      );

      expect(mockGetPercentiles).toHaveBeenCalledWith(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR,
        'Manufacturing',
        undefined
      );
    });

    it('calls getPercentiles without sector when not provided', async () => {
      mockGetPercentiles.mockResolvedValue(mockPercentiles);

      await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR
      );

      expect(mockGetPercentiles).toHaveBeenCalledWith(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR,
        undefined,
        undefined
      );
    });

    it('correctly reports exact boundary of 3 peers as sufficient data', async () => {
      mockGetPercentiles.mockResolvedValue({
        ...mockPercentiles,
        peerCount: 3,
      });

      const result = await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR
      );

      expect(result!.insufficientData).toBe(false);
    });

    it('correctly reports 1 peer as insufficient', async () => {
      mockGetPercentiles.mockResolvedValue({
        ...mockPercentiles,
        peerCount: 1,
      });

      const result = await benchmarkService.getBenchmark(
        TENANT_ID,
        CANONICAL_ID,
        FISCAL_YEAR
      );

      expect(result!.insufficientData).toBe(true);
    });
  });

  describe('listAvailableMetrics', () => {
    it('returns available metrics with insufficient data flags', async () => {
      mockGetAvailableMetrics.mockResolvedValue([
        {
          canonicalId: 'c-001',
          canonicalName: 'GHG Scope 1',
          pillar: 'E',
          category: 'Climate',
          peerCount: 10,
        },
        {
          canonicalId: 'c-002',
          canonicalName: 'Employee Turnover',
          pillar: 'S',
          category: 'Workforce',
          peerCount: 2,
        },
        {
          canonicalId: 'c-003',
          canonicalName: 'Board Independence',
          pillar: 'G',
          category: 'Governance',
          peerCount: 0,
        },
      ]);

      const result = await benchmarkService.listAvailableMetrics(
        TENANT_ID,
        FISCAL_YEAR,
        SECTOR
      );

      expect(result).toHaveLength(3);
      expect(result[0].insufficientData).toBe(false); // 10 peers
      expect(result[1].insufficientData).toBe(true);  // 2 peers
      expect(result[2].insufficientData).toBe(true);  // 0 peers
    });

    it('returns empty array when no metrics have peer data', async () => {
      mockGetAvailableMetrics.mockResolvedValue([]);

      const result = await benchmarkService.listAvailableMetrics(
        TENANT_ID,
        FISCAL_YEAR
      );

      expect(result).toEqual([]);
    });

    it('passes sector filter to repository', async () => {
      mockGetAvailableMetrics.mockResolvedValue([]);

      await benchmarkService.listAvailableMetrics(
        TENANT_ID,
        FISCAL_YEAR,
        'Financial Services'
      );

      expect(mockGetAvailableMetrics).toHaveBeenCalledWith(
        TENANT_ID,
        FISCAL_YEAR,
        'Financial Services',
        undefined
      );
    });
  });
});
