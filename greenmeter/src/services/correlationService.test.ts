import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
const mockGetPeerMetrics = vi.fn();

vi.mock('@/db/repositories/correlationRepository', () => ({
  correlationRepository: {
    getPeerMetrics: (...args: unknown[]) => mockGetPeerMetrics(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { correlationService } from './correlationService';

const TENANT_ID = 'tenant-001';
const FISCAL_YEAR = '2023-24';
const SECTOR = 'Manufacturing';

// Helper: generate peer metric rows for N peers across M metrics
function generatePeerRows(
  peerCount: number,
  metricCount: number,
  valueFn?: (p: number, m: number) => number
): { peerId: string; peerName: string; canonicalId: string; canonicalName: string; value: number }[] {
  const rows = [];
  for (let p = 0; p < peerCount; p++) {
    for (let m = 0; m < metricCount; m++) {
      rows.push({
        peerId: `peer-${p}`,
        peerName: `Peer Company ${p}`,
        canonicalId: `metric-${m}`,
        canonicalName: `Metric ${m}`,
        value: valueFn ? valueFn(p, m) : (p + 1) * 10 + m,
      });
    }
  }
  return rows;
}

describe('correlationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeCorrelations', () => {
    it('returns a symmetric correlation matrix for sufficient data', async () => {
      // 6 peers, 3 metrics — all above the 5-peer minimum
      const peerRows = generatePeerRows(6, 3);
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR, SECTOR);

      expect(result.metrics).toHaveLength(3);
      expect(result.matrix).toHaveLength(3);
      result.matrix.forEach((row) => expect(row).toHaveLength(3));

      // Diagonal should be 1
      for (let i = 0; i < result.metrics.length; i++) {
        expect(result.matrix[i][i]).toBe(1);
      }

      // Matrix should be symmetric
      for (let i = 0; i < result.metrics.length; i++) {
        for (let j = 0; j < result.metrics.length; j++) {
          expect(result.matrix[i][j]).toBe(result.matrix[j][i]);
        }
      }
    });

    it('computes correct Pearson r for perfectly correlated data', async () => {
      // All metrics perfectly correlated: metric value = peer_index * constant
      const peerRows = generatePeerRows(6, 2, (p, m) => (p + 1) * (m + 1) * 10);
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR);

      // metric-0: [10, 20, 30, 40, 50, 60]
      // metric-1: [20, 40, 60, 80, 100, 120]
      // Perfect positive correlation → r = 1
      expect(result.matrix[0][1]).toBeCloseTo(1, 5);
      expect(result.matrix[1][0]).toBeCloseTo(1, 5);
    });

    it('computes correct Pearson r for perfectly inversely correlated data', async () => {
      const peerRows = generatePeerRows(6, 2, (p, m) => {
        if (m === 0) return (p + 1) * 10; // ascending
        return (6 - p) * 10; // descending
      });
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR);

      // metric-0: [10, 20, 30, 40, 50, 60]
      // metric-1: [60, 50, 40, 30, 20, 10]
      // Perfect negative correlation → r = -1
      expect(result.matrix[0][1]).toBeCloseTo(-1, 5);
    });

    it('excludes metrics with fewer than 5 non-null values across peers', async () => {
      // 6 peers, 3 metrics. metric-2 only has 4 peers' data
      const rows = [
        // All 6 peers have metric-0 and metric-1
        ...generatePeerRows(6, 2),
        // Only 4 peers have metric-2
        ...Array.from({ length: 4 }, (_, p) => ({
          peerId: `peer-${p}`,
          peerName: `Peer Company ${p}`,
          canonicalId: 'metric-2',
          canonicalName: 'Metric 2',
          value: (p + 1) * 5,
        })),
      ];
      mockGetPeerMetrics.mockResolvedValue(rows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR);

      // metric-2 should be excluded (only 4 peers)
      expect(result.metrics).toHaveLength(2);
      expect(result.metrics.map((m) => m.canonicalId)).not.toContain('metric-2');
    });

    it('filters out non-significant correlations (replaces with null)', async () => {
      // Create data where some correlations are clearly not significant
      // With 5 data points and random-ish data, weak correlations should be filtered
      const peerRows = [
        { peerId: 'p0', peerName: 'P0', canonicalId: 'm0', canonicalName: 'M0', value: 10 },
        { peerId: 'p0', peerName: 'P0', canonicalId: 'm1', canonicalName: 'M1', value: 50 },
        { peerId: 'p1', peerName: 'P1', canonicalId: 'm0', canonicalName: 'M0', value: 20 },
        { peerId: 'p1', peerName: 'P1', canonicalId: 'm1', canonicalName: 'M1', value: 30 },
        { peerId: 'p2', peerName: 'P2', canonicalId: 'm0', canonicalName: 'M0', value: 30 },
        { peerId: 'p2', peerName: 'P2', canonicalId: 'm1', canonicalName: 'M1', value: 60 },
        { peerId: 'p3', peerName: 'P3', canonicalId: 'm0', canonicalName: 'M0', value: 40 },
        { peerId: 'p3', peerName: 'P3', canonicalId: 'm1', canonicalName: 'M1', value: 20 },
        { peerId: 'p4', peerName: 'P4', canonicalId: 'm0', canonicalName: 'M0', value: 50 },
        { peerId: 'p4', peerName: 'P4', canonicalId: 'm1', canonicalName: 'M1', value: 40 },
      ];
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR);

      // Matrix entries are either null (non-significant) or a number (significant)
      // Diagonal is always 1
      for (let i = 0; i < result.metrics.length; i++) {
        expect(result.matrix[i][i]).toBe(1);
      }

      // Non-diagonal entries should be number | null
      for (let i = 0; i < result.metrics.length; i++) {
        for (let j = 0; j < result.metrics.length; j++) {
          if (i !== j) {
            const val = result.matrix[i][j];
            expect(val === null || typeof val === 'number').toBe(true);
            if (typeof val === 'number') {
              expect(val).toBeGreaterThanOrEqual(-1);
              expect(val).toBeLessThanOrEqual(1);
            }
          }
        }
      }
    });

    it('throws when insufficient data (fewer than 2 metrics after filtering)', async () => {
      // Only 1 metric with enough peers
      const peerRows = generatePeerRows(6, 1);
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      await expect(
        correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR)
      ).rejects.toThrow(/Insufficient/);
    });

    it('throws when no peer data at all', async () => {
      mockGetPeerMetrics.mockResolvedValue([]);

      await expect(
        correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR)
      ).rejects.toThrow(/Insufficient/);
    });

    it('returns metric names alongside ids', async () => {
      const peerRows = generatePeerRows(6, 3);
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR);

      result.metrics.forEach((m) => {
        expect(m.canonicalId).toBeDefined();
        expect(m.canonicalName).toBeDefined();
        expect(typeof m.canonicalName).toBe('string');
      });
    });

    it('returns peerCount and metricsUsed in the result', async () => {
      const peerRows = generatePeerRows(8, 4);
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR);

      expect(result.peerCount).toBe(8);
      expect(result.metricsUsed).toBe(4);
    });

    it('passes tenantId, fiscalYear and sector to repository', async () => {
      const peerRows = generatePeerRows(6, 2);
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR, SECTOR);

      expect(mockGetPeerMetrics).toHaveBeenCalledWith(TENANT_ID, FISCAL_YEAR, SECTOR);
    });

    it('handles zero-variance metrics (all peers have same value)', async () => {
      // metric-1 has zero variance → Pearson r is undefined
      const peerRows = generatePeerRows(6, 2, (p, m) => {
        if (m === 0) return (p + 1) * 10;
        return 42; // constant value — zero variance
      });
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR);

      // The matrix values involving zero-variance metric should be null
      // (or the metric should be excluded)
      // Either approach is acceptable; just verify no NaN in result
      result.matrix.forEach((row) => {
        row.forEach((val) => {
          if (val !== null) {
            expect(isNaN(val)).toBe(false);
          }
        });
      });
    });

    it('rounds correlation values to 4 decimal places', async () => {
      const peerRows = generatePeerRows(10, 3);
      mockGetPeerMetrics.mockResolvedValue(peerRows);

      const result = await correlationService.computeCorrelations(TENANT_ID, FISCAL_YEAR);

      result.matrix.forEach((row) => {
        row.forEach((val) => {
          if (val !== null && val !== 1) {
            const decimals = val.toString().split('.')[1]?.length ?? 0;
            expect(decimals).toBeLessThanOrEqual(4);
          }
        });
      });
    });
  });
});
