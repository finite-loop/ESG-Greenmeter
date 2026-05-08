import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TENANT_A,
  PERIOD_FY24,
  CANONICAL_GHG,
  CANONICAL_WATER,
  makeBenchmarkPercentiles,
} from './helpers/test-fixtures';

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

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

// Import AFTER mocks
import { benchmarkService } from '@/services/benchmarkService';

// ─── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Integration: Benchmark Percentile Pipeline', () => {
  // ── Percentile Assembly ────────────────────────────────────

  describe('Percentile assembly', () => {
    it('returns Q1-Q4, median, min, max from repository data', async () => {
      mockGetPercentiles.mockResolvedValue(
        makeBenchmarkPercentiles({ q1: 50, median: 100, q3: 150, min: 20, max: 200, peerCount: 10 })
      );
      mockGetTenantValue.mockResolvedValue(null);

      const result = await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024'
      );

      expect(result).not.toBeNull();
      expect(result!.q1).toBe(50);
      expect(result!.q2).toBe(100); // q2 = median
      expect(result!.q3).toBe(150);
      expect(result!.q4).toBe(200); // q4 = max
      expect(result!.min).toBe(20);
      expect(result!.max).toBe(200);
      expect(result!.sectorMedian).toBe(100);
    });
  });

  // ── Insufficient Data ──────────────────────────────────────

  describe('Insufficient data handling', () => {
    it('flags insufficientData when peerCount < 3', async () => {
      mockGetPercentiles.mockResolvedValue(
        makeBenchmarkPercentiles({ peerCount: 2 })
      );

      const result = await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024'
      );

      expect(result).not.toBeNull();
      expect(result!.insufficientData).toBe(true);
      expect(result!.peerCount).toBe(2);
    });

    it('marks sufficient data when peerCount >= 3', async () => {
      mockGetPercentiles.mockResolvedValue(
        makeBenchmarkPercentiles({ peerCount: 5 })
      );

      const result = await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024'
      );

      expect(result!.insufficientData).toBe(false);
    });
  });

  // ── Tenant Ranking ─────────────────────────────────────────

  describe('Tenant ranking', () => {
    it('includes percentileRank when periodId is provided', async () => {
      mockGetPercentiles.mockResolvedValue(
        makeBenchmarkPercentiles({ peerCount: 10 })
      );
      mockGetTenantValue.mockResolvedValue({
        canonicalId: CANONICAL_GHG,
        value: 75,
        paramId: 'param-1',
      });
      mockGetPercentileRank.mockResolvedValue(65);

      const result = await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024', PERIOD_FY24
      );

      expect(result!.tenantValue).toBe(75);
      expect(result!.percentileRank).toBe(65);
    });

    it('returns null percentileRank when no periodId provided', async () => {
      mockGetPercentiles.mockResolvedValue(
        makeBenchmarkPercentiles({ peerCount: 10 })
      );

      const result = await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024'
        // no periodId
      );

      expect(result!.tenantValue).toBeNull();
      expect(result!.percentileRank).toBeNull();
    });

    it('returns null tenantValue when tenant has no value for this metric', async () => {
      mockGetPercentiles.mockResolvedValue(
        makeBenchmarkPercentiles({ peerCount: 10 })
      );
      mockGetTenantValue.mockResolvedValue(null);

      const result = await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024', PERIOD_FY24
      );

      expect(result!.tenantValue).toBeNull();
      expect(result!.percentileRank).toBeNull();
    });
  });

  // ── No Peer Data ───────────────────────────────────────────

  describe('No peer data', () => {
    it('returns null when no peer data exists', async () => {
      mockGetPercentiles.mockResolvedValue(null);

      const result = await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024'
      );

      expect(result).toBeNull();
    });
  });

  // ── Filtering Pass-Through ─────────────────────────────────

  describe('Sector and peerIds filtering', () => {
    it('passes sector filter to repository', async () => {
      mockGetPercentiles.mockResolvedValue(
        makeBenchmarkPercentiles({ peerCount: 10 })
      );

      await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024', undefined, 'Technology'
      );

      expect(mockGetPercentiles).toHaveBeenCalledWith(
        TENANT_A, CANONICAL_GHG, '2024', 'Technology', undefined
      );
    });

    it('passes peerIds filter to repository', async () => {
      mockGetPercentiles.mockResolvedValue(
        makeBenchmarkPercentiles({ peerCount: 5 })
      );

      const peerIds = ['peer-1', 'peer-2'];
      await benchmarkService.getBenchmark(
        TENANT_A, CANONICAL_GHG, '2024', undefined, undefined, peerIds
      );

      expect(mockGetPercentiles).toHaveBeenCalledWith(
        TENANT_A, CANONICAL_GHG, '2024', undefined, peerIds
      );
    });
  });
});
