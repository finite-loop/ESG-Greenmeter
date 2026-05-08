import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

// Mock orgHierarchyRepository
const mockFindById = vi.fn();
const mockFindAllByTenant = vi.fn();

vi.mock('@/db/repositories/orgHierarchyRepository', () => ({
  orgHierarchyRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    findAllByTenant: (...args: unknown[]) => mockFindAllByTenant(...args),
  },
}));

// Mock rollupRepository
const mockFindChildValues = vi.fn();
const mockUpsertRollupValue = vi.fn();
const mockFindRollupSummary = vi.fn();
const mockFindExchangeRate = vi.fn();

vi.mock('@/db/repositories/rollupRepository', () => ({
  rollupRepository: {
    findChildValues: (...args: unknown[]) => mockFindChildValues(...args),
    upsertRollupValue: (...args: unknown[]) => mockUpsertRollupValue(...args),
    findRollupSummary: (...args: unknown[]) => mockFindRollupSummary(...args),
    findExchangeRate: (...args: unknown[]) => mockFindExchangeRate(...args),
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

import { rollupService } from './rollupService';

const TENANT_ID = 'tenant-123';
const PERIOD_ID = 'period-1';

const parentNode = {
  nodeId: 'parent-1',
  tenantId: TENANT_ID,
  parentNodeId: null,
  name: 'HQ',
  nodeType: 'company',
  code: 'HQ',
  currency: 'INR',
  level: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const childNode1 = {
  nodeId: 'child-1',
  tenantId: TENANT_ID,
  parentNodeId: 'parent-1',
  name: 'Division A',
  nodeType: 'division',
  code: 'DIV-A',
  currency: 'INR',
  level: 1,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const childNode2 = {
  nodeId: 'child-2',
  tenantId: TENANT_ID,
  parentNodeId: 'parent-1',
  name: 'Division B',
  nodeType: 'division',
  code: 'DIV-B',
  currency: 'INR',
  level: 1,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('rollupService.computeRollup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes SUM rollup from child values', async () => {
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1, childNode2]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-1', paramName: 'Emissions', rollupMethod: 'SUM', unit: 'tCO2e', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '100', valueText: null },
      { paramId: 'param-1', paramName: 'Emissions', rollupMethod: 'SUM', unit: 'tCO2e', nodeId: 'child-2', nodeName: 'Division B', nodeCurrency: 'INR', value: '200', valueText: null },
    ]);

    mockUpsertRollupValue.mockResolvedValue({ valueId: 'rv-1' });

    const result = await rollupService.computeRollup(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result).toHaveLength(1);
    expect(result[0].aggregatedValue).toBe(300);
    expect(result[0].method).toBe('SUM');
    expect(result[0].childContributions).toHaveLength(2);
  });

  it('computes AVERAGE rollup from child values', async () => {
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1, childNode2]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-2', paramName: 'Score', rollupMethod: 'AVG', unit: '%', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '80', valueText: null },
      { paramId: 'param-2', paramName: 'Score', rollupMethod: 'AVG', unit: '%', nodeId: 'child-2', nodeName: 'Division B', nodeCurrency: 'INR', value: '60', valueText: null },
    ]);

    mockUpsertRollupValue.mockResolvedValue({ valueId: 'rv-2' });

    const result = await rollupService.computeRollup(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result).toHaveLength(1);
    expect(result[0].aggregatedValue).toBe(70);
    expect(result[0].method).toBe('AVG');
  });

  it('computes WEIGHTED_AVG rollup from child values', async () => {
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1, childNode2]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-3', paramName: 'Intensity', rollupMethod: 'WEIGHTED_AVG', unit: 'kWh/m2', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '50', valueText: null },
      { paramId: 'param-3', paramName: 'Intensity', rollupMethod: 'WEIGHTED_AVG', unit: 'kWh/m2', nodeId: 'child-2', nodeName: 'Division B', nodeCurrency: 'INR', value: '100', valueText: null },
    ]);

    mockUpsertRollupValue.mockResolvedValue({ valueId: 'rv-3' });

    // For WEIGHTED_AVG without explicit weights, falls back to equal weight (same as AVG)
    const result = await rollupService.computeRollup(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result).toHaveLength(1);
    expect(result[0].aggregatedValue).toBe(75);
    expect(result[0].method).toBe('WEIGHTED_AVG');
  });

  it('skips parameters with NONE rollup method', async () => {
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-4', paramName: 'Notes', rollupMethod: 'NONE', unit: 'text', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '10', valueText: null },
    ]);

    const result = await rollupService.computeRollup(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result).toHaveLength(0);
  });

  it('skips null/non-numeric values in aggregation', async () => {
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1, childNode2]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-1', paramName: 'Emissions', rollupMethod: 'SUM', unit: 'tCO2e', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '100', valueText: null },
      { paramId: 'param-1', paramName: 'Emissions', rollupMethod: 'SUM', unit: 'tCO2e', nodeId: 'child-2', nodeName: 'Division B', nodeCurrency: 'INR', value: null, valueText: null },
    ]);

    mockUpsertRollupValue.mockResolvedValue({ valueId: 'rv-1' });

    const result = await rollupService.computeRollup(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result).toHaveLength(1);
    expect(result[0].aggregatedValue).toBe(100);
    expect(result[0].childContributions).toHaveLength(1);
  });

  it('throws NOT_FOUND when node does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      rollupService.computeRollup(TENANT_ID, 'nonexistent', PERIOD_ID)
    ).rejects.toThrow(AppError);
  });

  it('returns empty array for leaf nodes with no children', async () => {
    mockFindById.mockResolvedValue(childNode1);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1]);
    mockFindChildValues.mockResolvedValue([]);

    const result = await rollupService.computeRollup(TENANT_ID, 'child-1', PERIOD_ID);

    expect(result).toHaveLength(0);
  });
});

describe('rollupService.computeRollup with currency conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies currency conversion when child currency differs from parent', async () => {
    const usdChild = { ...childNode2, currency: 'USD' };
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1, usdChild]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-1', paramName: 'Revenue', rollupMethod: 'SUM', unit: 'currency', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '1000', valueText: null },
      { paramId: 'param-1', paramName: 'Revenue', rollupMethod: 'SUM', unit: 'currency', nodeId: 'child-2', nodeName: 'Division B', nodeCurrency: 'USD', value: '100', valueText: null },
    ]);

    // 1 USD = 83 INR
    mockFindExchangeRate.mockResolvedValue(83);
    mockUpsertRollupValue.mockResolvedValue({ valueId: 'rv-1' });

    const result = await rollupService.computeRollup(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result).toHaveLength(1);
    // 1000 INR + (100 USD * 83) = 1000 + 8300 = 9300
    expect(result[0].aggregatedValue).toBe(9300);
    expect(result[0].childContributions.some((c: { currencyConverted: boolean }) => c.currencyConverted)).toBe(true);
    expect(result[0].hasMissingExchangeRates).toBe(false);
  });

  it('flags missing exchange rates when rate is unavailable', async () => {
    const usdChild = { ...childNode2, currency: 'USD' };
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1, usdChild]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-1', paramName: 'Revenue', rollupMethod: 'SUM', unit: 'currency', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '1000', valueText: null },
      { paramId: 'param-1', paramName: 'Revenue', rollupMethod: 'SUM', unit: 'currency', nodeId: 'child-2', nodeName: 'Division B', nodeCurrency: 'USD', value: '100', valueText: null },
    ]);

    // Exchange rate NOT found
    mockFindExchangeRate.mockResolvedValue(null);
    mockUpsertRollupValue.mockResolvedValue({ valueId: 'rv-1' });

    const result = await rollupService.computeRollup(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result).toHaveLength(1);
    // USD value included unconverted: 1000 + 100 = 1100
    expect(result[0].aggregatedValue).toBe(1100);
    expect(result[0].hasMissingExchangeRates).toBe(true);
    const usdContrib = result[0].childContributions.find((c) => c.nodeId === 'child-2');
    expect(usdContrib?.missingExchangeRate).toBe(true);
    expect(usdContrib?.currencyConverted).toBe(false);
  });

  it('skips currency conversion when unit is not currency-type', async () => {
    const usdChild = { ...childNode2, currency: 'USD' };
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1, usdChild]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-1', paramName: 'Emissions', rollupMethod: 'SUM', unit: 'tCO2e', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '100', valueText: null },
      { paramId: 'param-1', paramName: 'Emissions', rollupMethod: 'SUM', unit: 'tCO2e', nodeId: 'child-2', nodeName: 'Division B', nodeCurrency: 'USD', value: '200', valueText: null },
    ]);

    mockUpsertRollupValue.mockResolvedValue({ valueId: 'rv-1' });

    const result = await rollupService.computeRollup(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result).toHaveLength(1);
    // No currency conversion for non-monetary units
    expect(result[0].aggregatedValue).toBe(300);
    expect(mockFindExchangeRate).not.toHaveBeenCalled();
  });
});

describe('rollupService.getRollupSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rollup summary for a node', async () => {
    mockFindById.mockResolvedValue(parentNode);
    mockFindAllByTenant.mockResolvedValue([parentNode, childNode1, childNode2]);

    mockFindChildValues.mockResolvedValue([
      { paramId: 'param-1', paramName: 'Emissions', rollupMethod: 'SUM', unit: 'tCO2e', nodeId: 'child-1', nodeName: 'Division A', nodeCurrency: 'INR', value: '100', valueText: null },
      { paramId: 'param-1', paramName: 'Emissions', rollupMethod: 'SUM', unit: 'tCO2e', nodeId: 'child-2', nodeName: 'Division B', nodeCurrency: 'INR', value: '200', valueText: null },
    ]);

    mockUpsertRollupValue.mockResolvedValue({ valueId: 'rv-1' });

    const result = await rollupService.getRollupSummary(TENANT_ID, 'parent-1', PERIOD_ID);

    expect(result.nodeId).toBe('parent-1');
    expect(result.nodeName).toBe('HQ');
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].aggregatedValue).toBe(300);
  });

  it('throws NOT_FOUND when node does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      rollupService.getRollupSummary(TENANT_ID, 'nonexistent', PERIOD_ID)
    ).rejects.toThrow(AppError);
  });
});
