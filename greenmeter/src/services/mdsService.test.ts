import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
const mockGetPeerMetrics = vi.fn();
const mockGetTenantMetrics = vi.fn();

vi.mock('@/db/repositories/mdsRepository', () => ({
  mdsRepository: {
    getPeerMetrics: (...args: unknown[]) => mockGetPeerMetrics(...args),
    getTenantMetrics: (...args: unknown[]) => mockGetTenantMetrics(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { mdsService } from './mdsService';

const TENANT_ID = 'tenant-001';
const FISCAL_YEAR = '2023-24';
const SECTOR = 'Manufacturing';

// Helper: generate peer metric rows for N peers across M metrics
function generatePeerRows(
  peerCount: number,
  metricCount: number
): { peerId: string; peerName: string; canonicalId: string; value: number }[] {
  const rows = [];
  for (let p = 0; p < peerCount; p++) {
    for (let m = 0; m < metricCount; m++) {
      rows.push({
        peerId: `peer-${p}`,
        peerName: `Peer Company ${p}`,
        canonicalId: `metric-${m}`,
        value: Math.random() * 100 + p * 10 + m,
      });
    }
  }
  return rows;
}

// Helper: generate tenant metric values for M metrics
function generateTenantValues(metricCount: number) {
  return Array.from({ length: metricCount }, (_, m) => ({
    canonicalId: `metric-${m}`,
    value: Math.random() * 100 + 50,
  }));
}

describe('mdsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeMds', () => {
    it('returns MDS points for tenant and peers with sufficient data', async () => {
      const peerRows = generatePeerRows(5, 4);
      const tenantValues = generateTenantValues(4);

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      const result = await mdsService.computeMds(TENANT_ID, FISCAL_YEAR, SECTOR);

      // Should have 5 peer points + 1 tenant point = 6
      expect(result.points).toHaveLength(6);
      expect(result.peerCount).toBe(5);
      expect(result.metricsUsed).toBe(4);

      // Tenant point should be marked
      const tenantPoint = result.points.find((p) => p.isCurrentTenant);
      expect(tenantPoint).toBeDefined();
      expect(tenantPoint!.peerName).toBe('Your Company');
      expect(tenantPoint!.peerId).toBe(TENANT_ID);

      // Peer points should not be marked as tenant
      const peerPoints = result.points.filter((p) => !p.isCurrentTenant);
      expect(peerPoints).toHaveLength(5);
      peerPoints.forEach((p) => {
        expect(p.isCurrentTenant).toBe(false);
        expect(typeof p.x).toBe('number');
        expect(typeof p.y).toBe('number');
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });
    });

    it('throws when fewer than 4 peers are available', async () => {
      const peerRows = generatePeerRows(3, 4); // Only 3 peers
      const tenantValues = generateTenantValues(4);

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      await expect(
        mdsService.computeMds(TENANT_ID, FISCAL_YEAR, SECTOR)
      ).rejects.toThrow('Insufficient peer data: found 3 peers, need at least 4');
    });

    it('throws when zero peers are available', async () => {
      mockGetPeerMetrics.mockResolvedValue([]);
      mockGetTenantMetrics.mockResolvedValue(generateTenantValues(3));

      await expect(
        mdsService.computeMds(TENANT_ID, FISCAL_YEAR)
      ).rejects.toThrow(/Insufficient peer data/);
    });

    it('handles exact minimum of 4 peers', async () => {
      const peerRows = generatePeerRows(4, 3);
      const tenantValues = generateTenantValues(3);

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      const result = await mdsService.computeMds(TENANT_ID, FISCAL_YEAR);

      expect(result.points).toHaveLength(5); // 4 peers + 1 tenant
      expect(result.peerCount).toBe(4);
    });

    it('excludes metrics with >50% missing data', async () => {
      // 5 peers, 3 metrics.
      // metric-2 has data for only 2 of 6 companies (< 50%) → excluded
      const peerRows = [
        // Peers 0-4 have metric-0 and metric-1
        ...Array.from({ length: 5 }, (_, p) => [
          { peerId: `peer-${p}`, peerName: `Peer ${p}`, canonicalId: 'metric-0', value: 10 + p },
          { peerId: `peer-${p}`, peerName: `Peer ${p}`, canonicalId: 'metric-1', value: 20 + p },
        ]).flat(),
        // Only peer-0 has metric-2
        { peerId: 'peer-0', peerName: 'Peer 0', canonicalId: 'metric-2', value: 30 },
      ];

      const tenantValues = [
        { canonicalId: 'metric-0', value: 15 },
        { canonicalId: 'metric-1', value: 25 },
        // Tenant also doesn't have metric-2
      ];

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      const result = await mdsService.computeMds(TENANT_ID, FISCAL_YEAR);

      // metric-2: 1 peer + 0 tenant = 1/6 present = 83% missing → excluded
      expect(result.metricsUsed).toBe(2);
    });

    it('imputes missing values with sector median', async () => {
      // peer-0 is missing metric-1, but metric-1 has ≤50% missing → imputed
      const peerRows = [
        { peerId: 'peer-0', peerName: 'P0', canonicalId: 'metric-0', value: 10 },
        // peer-0 missing metric-1
        { peerId: 'peer-1', peerName: 'P1', canonicalId: 'metric-0', value: 20 },
        { peerId: 'peer-1', peerName: 'P1', canonicalId: 'metric-1', value: 30 },
        { peerId: 'peer-2', peerName: 'P2', canonicalId: 'metric-0', value: 15 },
        { peerId: 'peer-2', peerName: 'P2', canonicalId: 'metric-1', value: 40 },
        { peerId: 'peer-3', peerName: 'P3', canonicalId: 'metric-0', value: 25 },
        { peerId: 'peer-3', peerName: 'P3', canonicalId: 'metric-1', value: 50 },
      ];

      const tenantValues = [
        { canonicalId: 'metric-0', value: 18 },
        { canonicalId: 'metric-1', value: 35 },
      ];

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      // Should not throw — missing data imputed with median
      const result = await mdsService.computeMds(TENANT_ID, FISCAL_YEAR);

      expect(result.points).toHaveLength(5); // 4 peers + 1 tenant
      result.points.forEach((p) => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });
    });

    it('produces different coordinates for different metric values', async () => {
      // Two groups of peers with very different values
      const peerRows = [
        // Group A: low values
        { peerId: 'peer-0', peerName: 'Low1', canonicalId: 'm-0', value: 1 },
        { peerId: 'peer-0', peerName: 'Low1', canonicalId: 'm-1', value: 2 },
        { peerId: 'peer-1', peerName: 'Low2', canonicalId: 'm-0', value: 2 },
        { peerId: 'peer-1', peerName: 'Low2', canonicalId: 'm-1', value: 3 },
        // Group B: high values
        { peerId: 'peer-2', peerName: 'High1', canonicalId: 'm-0', value: 100 },
        { peerId: 'peer-2', peerName: 'High1', canonicalId: 'm-1', value: 200 },
        { peerId: 'peer-3', peerName: 'High2', canonicalId: 'm-0', value: 110 },
        { peerId: 'peer-3', peerName: 'High2', canonicalId: 'm-1', value: 210 },
      ];

      const tenantValues = [
        { canonicalId: 'm-0', value: 1.5 },
        { canonicalId: 'm-1', value: 2.5 },
      ];

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      const result = await mdsService.computeMds(TENANT_ID, FISCAL_YEAR);

      // Tenant should be closer to Low peers than High peers
      const tenant = result.points.find((p) => p.isCurrentTenant)!;
      const low1 = result.points.find((p) => p.peerName === 'Low1')!;
      const high1 = result.points.find((p) => p.peerName === 'High1')!;

      const distToLow = Math.sqrt((tenant.x - low1.x) ** 2 + (tenant.y - low1.y) ** 2);
      const distToHigh = Math.sqrt((tenant.x - high1.x) ** 2 + (tenant.y - high1.y) ** 2);

      expect(distToLow).toBeLessThan(distToHigh);
    });

    it('coordinates are rounded to 3 decimal places', async () => {
      const peerRows = generatePeerRows(5, 3);
      const tenantValues = generateTenantValues(3);

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      const result = await mdsService.computeMds(TENANT_ID, FISCAL_YEAR);

      result.points.forEach((p) => {
        const xDecimals = p.x.toString().split('.')[1]?.length ?? 0;
        const yDecimals = p.y.toString().split('.')[1]?.length ?? 0;
        expect(xDecimals).toBeLessThanOrEqual(3);
        expect(yDecimals).toBeLessThanOrEqual(3);
      });
    });

    it('passes tenantId, fiscalYear and sector to repository', async () => {
      const peerRows = generatePeerRows(4, 2);
      const tenantValues = generateTenantValues(2);

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      await mdsService.computeMds(TENANT_ID, FISCAL_YEAR, SECTOR);

      expect(mockGetPeerMetrics).toHaveBeenCalledWith(TENANT_ID, FISCAL_YEAR, SECTOR);
      expect(mockGetTenantMetrics).toHaveBeenCalledWith(TENANT_ID, FISCAL_YEAR);
    });

    it('passes undefined sector to repository when not provided', async () => {
      const peerRows = generatePeerRows(4, 2);
      const tenantValues = generateTenantValues(2);

      mockGetPeerMetrics.mockResolvedValue(peerRows);
      mockGetTenantMetrics.mockResolvedValue(tenantValues);

      await mdsService.computeMds(TENANT_ID, FISCAL_YEAR);

      expect(mockGetPeerMetrics).toHaveBeenCalledWith(TENANT_ID, FISCAL_YEAR, undefined);
    });
  });
});
