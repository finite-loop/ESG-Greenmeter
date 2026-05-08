import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock jobs (imported by kpiService for score recomputation)
vi.mock('@/jobs', () => ({
  submitJob: vi.fn().mockResolvedValue(undefined),
}));

// Mock goalService (imported by kpiService for milestone auto-achievement)
vi.mock('@/services/goalService', () => ({
  goalService: {
    checkMilestonesForParam: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/jobs/scoreRecompute', () => ({}));

// Mock userRepository (imported by kpiService for department scope check)
const mockUserFindById = vi.fn();
vi.mock('@/db/repositories/userRepository', () => ({
  userRepository: {
    findById: (...args: unknown[]) => mockUserFindById(...args),
  },
}));

// Mock kpiRepository
const mockFindByFilters = vi.fn();
const mockFindById = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFindByParamNodePeriod = vi.fn();
const mockBatchVerify = vi.fn();
const mockBatchMarkNotApplicable = vi.fn();
const mockCheckDepartmentScope = vi.fn();

vi.mock('@/db/repositories/kpiRepository', () => ({
  kpiRepository: {
    findByFilters: (...args: unknown[]) => mockFindByFilters(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    findByParamNodePeriod: (...args: unknown[]) => mockFindByParamNodePeriod(...args),
    batchVerify: (...args: unknown[]) => mockBatchVerify(...args),
    batchMarkNotApplicable: (...args: unknown[]) => mockBatchMarkNotApplicable(...args),
    checkDepartmentScope: (...args: unknown[]) => mockCheckDepartmentScope(...args),
  },
}));

import { kpiService } from './kpiService';

const TENANT_ID = 'tenant-123';

const baseValue = {
  valueId: 'val-1',
  tenantId: TENANT_ID,
  paramId: 'param-1',
  canonicalId: null,
  nodeId: 'node-1',
  periodId: 'period-1',
  value: '1200',
  valueText: null,
  unit: 'tCO2e',
  sourceType: 'manual',
  sourceRef: null,
  verified: false,
  notApplicable: false,
  verifiedBy: null,
  verifiedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const baseValueWithParam = {
  ...baseValue,
  paramName: 'GHG Emissions',
  paramCode: 'ENV-001',
  pillar: 'E',
  category: 'Climate',
  standard: 'BRSR',
  paramUnit: 'tCO2e',
  dataType: 'numeric',
};

describe('kpiService.listValues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data with RAG status amber for unverified values', async () => {
    mockFindByFilters.mockResolvedValue({
      data: [baseValueWithParam],
      total: 1,
    });

    const result = await kpiService.listValues(TENANT_ID, {
      standard: 'BRSR',
      page: 1,
      pageSize: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].ragStatus).toBe('amber');
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('returns data with RAG status green for verified values', async () => {
    const verifiedValue = { ...baseValueWithParam, verified: true };
    mockFindByFilters.mockResolvedValue({
      data: [verifiedValue],
      total: 1,
    });

    const result = await kpiService.listValues(TENANT_ID, {
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].ragStatus).toBe('green');
  });

  it('returns empty list when no values match', async () => {
    mockFindByFilters.mockResolvedValue({ data: [], total: 0 });

    const result = await kpiService.listValues(TENANT_ID, {
      standard: 'GRI',
      page: 1,
      pageSize: 20,
    });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('passes filters to repository', async () => {
    mockFindByFilters.mockResolvedValue({ data: [], total: 0 });

    await kpiService.listValues(TENANT_ID, {
      periodId: 'period-1',
      standard: 'BRSR',
      pillar: 'E',
      category: 'Climate',
      nodeId: 'node-1',
      page: 2,
      pageSize: 10,
    });

    expect(mockFindByFilters).toHaveBeenCalledWith(TENANT_ID, {
      periodId: 'period-1',
      standard: 'BRSR',
      pillar: 'E',
      category: 'Climate',
      department: undefined,
      nodeId: 'node-1',
      page: 2,
      pageSize: 10,
    });
  });
});

describe('kpiService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns value when found', async () => {
    mockFindById.mockResolvedValue(baseValue);

    const result = await kpiService.getById('val-1', TENANT_ID);
    expect(result.valueId).toBe('val-1');
  });

  it('throws NOT_FOUND when value does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(kpiService.getById('val-missing', TENANT_ID))
      .rejects
      .toThrow(AppError);

    try {
      await kpiService.getById('val-missing', TENANT_ID);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });
});

describe('kpiService.createValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates value when no duplicate exists', async () => {
    mockFindByParamNodePeriod.mockResolvedValue(null);
    mockInsert.mockResolvedValue(baseValue);

    const result = await kpiService.createValue(TENANT_ID, {
      paramId: 'param-1',
      nodeId: 'node-1',
      periodId: 'period-1',
      value: '1200',
      sourceType: 'manual',
    });

    expect(result.valueId).toBe('val-1');
    expect(mockInsert).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ paramId: 'param-1', sourceType: 'manual' })
    );
  });

  it('throws DUPLICATE_ENTRY when value already exists', async () => {
    mockFindByParamNodePeriod.mockResolvedValue(baseValue);

    await expect(
      kpiService.createValue(TENANT_ID, {
        paramId: 'param-1',
        nodeId: 'node-1',
        periodId: 'period-1',
        value: '999',
        sourceType: 'manual',
      })
    ).rejects.toThrow(AppError);

    try {
      await kpiService.createValue(TENANT_ID, {
        paramId: 'param-1',
        nodeId: 'node-1',
        periodId: 'period-1',
        value: '999',
        sourceType: 'manual',
      });
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('DUPLICATE_ENTRY');
      expect(appErr.status).toBe(409);
    }
  });

  it('handles PostgreSQL unique violation gracefully', async () => {
    mockFindByParamNodePeriod.mockResolvedValue(null);
    mockInsert.mockRejectedValue({ code: '23505' });

    await expect(
      kpiService.createValue(TENANT_ID, {
        paramId: 'param-1',
        nodeId: 'node-1',
        periodId: 'period-1',
        value: '999',
        sourceType: 'manual',
      })
    ).rejects.toThrow(AppError);
  });
});

describe('kpiService.updateValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates value and returns old+new for audit', async () => {
    mockFindById.mockResolvedValue(baseValue);
    const updated = { ...baseValue, value: '1500' };
    mockUpdate.mockResolvedValue({ oldValue: baseValue, newValue: updated });

    const result = await kpiService.updateValue('val-1', TENANT_ID, {
      value: '1500',
    });

    expect(result.oldValue.value).toBe('1200');
    expect(result.newValue.value).toBe('1500');
  });

  it('throws NOT_FOUND when value does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      kpiService.updateValue('val-missing', TENANT_ID, { value: '1500' })
    ).rejects.toThrow(AppError);
  });
});

describe('kpiService.deleteValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes value and returns deleted row', async () => {
    mockDelete.mockResolvedValue(baseValue);

    const result = await kpiService.deleteValue('val-1', TENANT_ID);
    expect(result.valueId).toBe('val-1');
  });

  it('throws NOT_FOUND when value does not exist', async () => {
    mockDelete.mockResolvedValue(null);

    await expect(
      kpiService.deleteValue('val-missing', TENANT_ID)
    ).rejects.toThrow(AppError);
  });
});

describe('kpiService.verifyValues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies values and returns old+updated rows', async () => {
    const verifiedValue = {
      ...baseValue,
      verified: true,
      verifiedBy: 'user-1',
      verifiedAt: new Date('2026-05-07'),
    };
    mockBatchVerify.mockResolvedValue({
      oldValues: [baseValue],
      newValues: [verifiedValue],
    });

    const result = await kpiService.verifyValues(TENANT_ID, 'user-1', ['val-1']);

    expect(result.oldValues).toHaveLength(1);
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0].verified).toBe(true);
    expect(result.updated[0].verifiedBy).toBe('user-1');
    expect(mockBatchVerify).toHaveBeenCalledWith(['val-1'], TENANT_ID, 'user-1');
  });

  it('propagates COUNT_MISMATCH from repository when values not found', async () => {
    mockBatchVerify.mockRejectedValue(new Error('COUNT_MISMATCH'));

    await expect(
      kpiService.verifyValues(TENANT_ID, 'user-1', ['val-1', 'val-missing'])
    ).rejects.toThrow('COUNT_MISMATCH');
  });

  it('handles batch of multiple values', async () => {
    const val2 = { ...baseValue, valueId: 'val-2' };
    mockBatchVerify.mockResolvedValue({
      oldValues: [baseValue, val2],
      newValues: [
        { ...baseValue, verified: true, verifiedBy: 'user-1' },
        { ...val2, verified: true, verifiedBy: 'user-1' },
      ],
    });

    const result = await kpiService.verifyValues(TENANT_ID, 'user-1', ['val-1', 'val-2']);
    expect(result.updated).toHaveLength(2);
  });

  it('deduplicates valueIds before calling repository', async () => {
    mockBatchVerify.mockResolvedValue({
      oldValues: [baseValue],
      newValues: [{ ...baseValue, verified: true }],
    });

    await kpiService.verifyValues(TENANT_ID, 'user-1', ['val-1', 'val-1']);

    expect(mockBatchVerify).toHaveBeenCalledWith(['val-1'], TENANT_ID, 'user-1');
  });

  it('checks department scope when role is department', async () => {
    mockUserFindById.mockResolvedValue({ userId: 'user-1', departmentId: 'dept-1' });
    mockCheckDepartmentScope.mockResolvedValue(true);
    mockBatchVerify.mockResolvedValue({
      oldValues: [baseValue],
      newValues: [{ ...baseValue, verified: true }],
    });

    await kpiService.verifyValues(TENANT_ID, 'user-1', ['val-1'], 'department');

    expect(mockUserFindById).toHaveBeenCalledWith('user-1');
    expect(mockCheckDepartmentScope).toHaveBeenCalledWith(['val-1'], TENANT_ID, 'dept-1');
  });

  it('throws FORBIDDEN when department user has values outside scope', async () => {
    mockUserFindById.mockResolvedValue({ userId: 'user-1', departmentId: 'dept-1' });
    mockCheckDepartmentScope.mockResolvedValue(false);

    await expect(
      kpiService.verifyValues(TENANT_ID, 'user-1', ['val-1'], 'department')
    ).rejects.toThrow(AppError);

    try {
      await kpiService.verifyValues(TENANT_ID, 'user-1', ['val-1'], 'department');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('FORBIDDEN');
      expect(appErr.status).toBe(403);
    }
  });

  it('skips department scope check for admin role', async () => {
    mockBatchVerify.mockResolvedValue({
      oldValues: [baseValue],
      newValues: [{ ...baseValue, verified: true }],
    });

    await kpiService.verifyValues(TENANT_ID, 'user-1', ['val-1'], 'admin');

    expect(mockUserFindById).not.toHaveBeenCalled();
    expect(mockCheckDepartmentScope).not.toHaveBeenCalled();
  });
});

describe('kpiService.markNotApplicable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks values as not applicable and returns old+updated rows', async () => {
    const naValue = { ...baseValue, notApplicable: true };
    mockBatchMarkNotApplicable.mockResolvedValue({
      oldValues: [baseValue],
      newValues: [naValue],
    });

    const result = await kpiService.markNotApplicable(TENANT_ID, 'user-1', ['val-1']);

    expect(result.oldValues).toHaveLength(1);
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0].notApplicable).toBe(true);
    expect(mockBatchMarkNotApplicable).toHaveBeenCalledWith(['val-1'], TENANT_ID);
  });

  it('propagates COUNT_MISMATCH from repository when values not found', async () => {
    mockBatchMarkNotApplicable.mockRejectedValue(new Error('COUNT_MISMATCH'));

    await expect(
      kpiService.markNotApplicable(TENANT_ID, 'user-1', ['val-missing'])
    ).rejects.toThrow('COUNT_MISMATCH');
  });

  it('checks department scope when role is department', async () => {
    mockUserFindById.mockResolvedValue({ userId: 'user-1', departmentId: 'dept-1' });
    mockCheckDepartmentScope.mockResolvedValue(true);
    const naValue = { ...baseValue, notApplicable: true };
    mockBatchMarkNotApplicable.mockResolvedValue({
      oldValues: [baseValue],
      newValues: [naValue],
    });

    await kpiService.markNotApplicable(TENANT_ID, 'user-1', ['val-1'], 'department');

    expect(mockUserFindById).toHaveBeenCalledWith('user-1');
    expect(mockCheckDepartmentScope).toHaveBeenCalledWith(['val-1'], TENANT_ID, 'dept-1');
  });
});

describe('kpiService.listValues RAG status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns grey RAG status for not-applicable values', async () => {
    const naValue = { ...baseValueWithParam, notApplicable: true };
    mockFindByFilters.mockResolvedValue({
      data: [naValue],
      total: 1,
    });

    const result = await kpiService.listValues(TENANT_ID, {
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].ragStatus).toBe('grey');
  });

  it('returns red RAG status for missing values (null valueId)', async () => {
    const missing = { ...baseValueWithParam, valueId: null };
    mockFindByFilters.mockResolvedValue({
      data: [missing],
      total: 1,
    });

    const result = await kpiService.listValues(TENANT_ID, {
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].ragStatus).toBe('red');
  });
});
