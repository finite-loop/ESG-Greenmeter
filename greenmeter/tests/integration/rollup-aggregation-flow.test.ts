import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TENANT_A,
  NODE_ROOT,
  NODE_CHILD_1,
  NODE_CHILD_2,
  NODE_GRANDCHILD,
  PERIOD_FY24,
  PARAM_GHG,
  PARAM_WATER,
  makeChildValueRow,
  makeOrgNode,
} from './helpers/test-fixtures';

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockFindById = vi.fn();
const mockFindAllByTenant = vi.fn();

vi.mock('@/db/repositories/orgHierarchyRepository', () => ({
  orgHierarchyRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    findAllByTenant: (...args: unknown[]) => mockFindAllByTenant(...args),
  },
}));

const mockFindChildValues = vi.fn();
const mockUpsertRollupValue = vi.fn().mockResolvedValue({ valueId: 'rollup-val-1' });
const mockFindExchangeRate = vi.fn();

vi.mock('@/db/repositories/rollupRepository', () => ({
  rollupRepository: {
    findChildValues: (...args: unknown[]) => mockFindChildValues(...args),
    upsertRollupValue: (...args: unknown[]) => mockUpsertRollupValue(...args),
    findExchangeRate: (...args: unknown[]) => mockFindExchangeRate(...args),
  },
}));

// Import AFTER mocks
import { rollupService } from '@/services/rollupService';

// ─── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Integration: Hierarchy Rollup', () => {
  // ── SUM Aggregation ────────────────────────────────────────

  describe('SUM method', () => {
    it('sums children [100, 200, 300] → aggregated=600', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({ nodeId: NODE_CHILD_1, value: '100', rollupMethod: 'SUM' }),
        makeChildValueRow({ nodeId: NODE_CHILD_2, value: '200', rollupMethod: 'SUM' }),
        makeChildValueRow({ nodeId: NODE_GRANDCHILD, value: '300', rollupMethod: 'SUM' }),
      ]);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results).toHaveLength(1);
      expect(results[0].aggregatedValue).toBe(600);
      expect(results[0].method).toBe('SUM');
    });
  });

  // ── AVG Aggregation ────────────────────────────────────────

  describe('AVG/AVERAGE method', () => {
    it('averages children [100, 200, 300] → aggregated=200', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({ nodeId: NODE_CHILD_1, value: '100', rollupMethod: 'AVG' }),
        makeChildValueRow({ nodeId: NODE_CHILD_2, value: '200', rollupMethod: 'AVG' }),
        makeChildValueRow({ nodeId: NODE_GRANDCHILD, value: '300', rollupMethod: 'AVG' }),
      ]);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results).toHaveLength(1);
      expect(results[0].aggregatedValue).toBe(200);
      expect(results[0].method).toBe('AVG');
    });

    it('handles AVERAGE as alias for AVG', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({ value: '100', rollupMethod: 'AVERAGE' }),
        makeChildValueRow({ nodeId: NODE_CHILD_2, value: '300', rollupMethod: 'AVERAGE' }),
      ]);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results[0].aggregatedValue).toBe(200);
    });
  });

  // ── Currency Conversion ────────────────────────────────────

  describe('Currency conversion', () => {
    it('converts USD child value to INR using exchange rate', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT, currency: 'INR' }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({
          nodeId: NODE_CHILD_1,
          value: '100',
          unit: 'currency',
          nodeCurrency: 'USD',
          rollupMethod: 'SUM',
        }),
      ]);
      mockFindExchangeRate.mockResolvedValue(83);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results).toHaveLength(1);
      expect(results[0].aggregatedValue).toBe(8300);
      expect(results[0].childContributions[0].currencyConverted).toBe(true);
      expect(results[0].childContributions[0].conversionRate).toBe(83);
      expect(results[0].hasMissingExchangeRates).toBe(false);
    });

    it('skips conversion when currencies match', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT, currency: 'INR' }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({
          nodeId: NODE_CHILD_1,
          value: '500',
          unit: 'currency',
          nodeCurrency: 'INR',
          rollupMethod: 'SUM',
        }),
      ]);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results[0].aggregatedValue).toBe(500);
      expect(results[0].childContributions[0].currencyConverted).toBe(false);
      expect(mockFindExchangeRate).not.toHaveBeenCalled();
    });

    it('flags hasMissingExchangeRates when rate is unavailable', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT, currency: 'INR' }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({
          nodeId: NODE_CHILD_1,
          value: '100',
          unit: 'currency',
          nodeCurrency: 'EUR',
          rollupMethod: 'SUM',
        }),
      ]);
      mockFindExchangeRate.mockResolvedValue(null);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results[0].hasMissingExchangeRates).toBe(true);
      expect(results[0].childContributions[0].missingExchangeRate).toBe(true);
      // Original value used as-is
      expect(results[0].aggregatedValue).toBe(100);
    });
  });

  // ── NONE/LATEST Skipped ────────────────────────────────────

  describe('Skipped methods', () => {
    it('skips NONE method', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({ rollupMethod: 'NONE', value: '100' }),
      ]);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results).toHaveLength(0);
    });

    it('skips LATEST method', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({ rollupMethod: 'LATEST', value: '100' }),
      ]);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results).toHaveLength(0);
    });
  });

  // ── Ancestor Walk ──────────────────────────────────────────

  describe('Ancestor recomputation', () => {
    it('recomputes ancestors bottom-up: leaf → parent → grandparent', async () => {
      // Hierarchy: ROOT → CHILD_1 → GRANDCHILD
      mockFindAllByTenant.mockResolvedValue([
        makeOrgNode({ nodeId: NODE_ROOT, parentNodeId: null, level: 0 }),
        makeOrgNode({ nodeId: NODE_CHILD_1, parentNodeId: NODE_ROOT, level: 1 }),
        makeOrgNode({ nodeId: NODE_GRANDCHILD, parentNodeId: NODE_CHILD_1, level: 2 }),
      ]);

      // computeRollup is called for CHILD_1 (parent of GRANDCHILD), then ROOT (parent of CHILD_1)
      mockFindById
        .mockResolvedValueOnce(makeOrgNode({ nodeId: NODE_CHILD_1 }))
        .mockResolvedValueOnce(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues
        .mockResolvedValueOnce([makeChildValueRow({ nodeId: NODE_GRANDCHILD, value: '50' })])
        .mockResolvedValueOnce([makeChildValueRow({ nodeId: NODE_CHILD_1, value: '50' })]);

      await rollupService.recomputeAncestors(TENANT_A, NODE_GRANDCHILD, PERIOD_FY24);

      // Should have been called for CHILD_1 (first ancestor), then ROOT (second ancestor)
      expect(mockFindChildValues).toHaveBeenCalledTimes(2);
      expect(mockUpsertRollupValue).toHaveBeenCalledTimes(2);
    });
  });

  // ── Null/NaN Filtering ─────────────────────────────────────

  describe('Null and NaN child value filtering', () => {
    it('filters out null child values', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({ nodeId: NODE_CHILD_1, value: '100', rollupMethod: 'SUM' }),
        makeChildValueRow({ nodeId: NODE_CHILD_2, value: null, rollupMethod: 'SUM' }),
      ]);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results[0].aggregatedValue).toBe(100);
      expect(results[0].childContributions).toHaveLength(1);
    });

    it('filters out NaN child values', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({ nodeId: NODE_CHILD_1, value: '200', rollupMethod: 'SUM' }),
        makeChildValueRow({ nodeId: NODE_CHILD_2, value: 'not-a-number', rollupMethod: 'SUM' }),
      ]);

      const results = await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(results[0].aggregatedValue).toBe(200);
      expect(results[0].childContributions).toHaveLength(1);
    });
  });

  // ── Upsert Verification ────────────────────────────────────

  describe('Persistence', () => {
    it('calls upsertRollupValue with correct aggregated string', async () => {
      mockFindById.mockResolvedValue(makeOrgNode({ nodeId: NODE_ROOT }));
      mockFindChildValues.mockResolvedValue([
        makeChildValueRow({ value: '150', rollupMethod: 'SUM' }),
        makeChildValueRow({ nodeId: NODE_CHILD_2, value: '250', rollupMethod: 'SUM' }),
      ]);

      await rollupService.computeRollup(TENANT_A, NODE_ROOT, PERIOD_FY24);

      expect(mockUpsertRollupValue).toHaveBeenCalledWith(
        TENANT_A,
        PARAM_GHG,
        NODE_ROOT,
        PERIOD_FY24,
        '400',
      );
    });
  });
});
