import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TENANT_A,
  TENANT_B,
  USER_ADMIN,
  USER_ANALYST,
  USER_DEPT_HR,
  USER_DEPT_OPS,
  NODE_ROOT,
  PERIOD_FY24,
  PARAM_GHG,
  DEPT_HR,
  DEPT_OPS,
  makeKpiValueRow,
} from './helpers/test-fixtures';

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/jobs', () => ({
  submitJob: vi.fn().mockResolvedValue('job-id'),
}));
vi.mock('@/jobs/scoreRecompute', () => ({}));

vi.mock('@/services/goalService', () => ({
  goalService: {
    checkMilestonesForParam: vi.fn().mockResolvedValue([]),
  },
}));

const mockFindByFilters = vi.fn();
const mockFindById = vi.fn();
const mockInsert = vi.fn();
const mockFindByParamNodePeriod = vi.fn();
const mockBatchVerify = vi.fn();
const mockBatchMarkNotApplicable = vi.fn();
const mockCheckDepartmentScope = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/db/repositories/kpiRepository', () => ({
  kpiRepository: {
    findByFilters: (...args: unknown[]) => mockFindByFilters(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    findByParamNodePeriod: (...args: unknown[]) => mockFindByParamNodePeriod(...args),
    batchVerify: (...args: unknown[]) => mockBatchVerify(...args),
    batchMarkNotApplicable: (...args: unknown[]) => mockBatchMarkNotApplicable(...args),
    checkDepartmentScope: (...args: unknown[]) => mockCheckDepartmentScope(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

const mockUserFindById = vi.fn();
vi.mock('@/db/repositories/userRepository', () => ({
  userRepository: {
    findById: (...args: unknown[]) => mockUserFindById(...args),
  },
}));

// Import AFTER mocks
import { kpiService } from '@/services/kpiService';
import { AppError } from '@/lib/errors';

// ─── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Integration: Multi-Tenant RBAC Flow', () => {
  // ── Tenant Isolation ───────────────────────────────────────

  describe('Tenant isolation', () => {
    it('getById with wrong tenantId throws NOT_FOUND', async () => {
      mockFindById.mockResolvedValue(null); // repo returns null for wrong tenant

      await expect(
        kpiService.getById('val-1', TENANT_B)
      ).rejects.toThrow(AppError);

      try {
        await kpiService.getById('val-1', TENANT_B);
      } catch (err) {
        expect((err as AppError).code).toBe('NOT_FOUND');
        expect((err as AppError).status).toBe(404);
      }
    });

    it('getById succeeds with correct tenantId', async () => {
      const value = makeKpiValueRow({ tenantId: TENANT_A });
      mockFindById.mockResolvedValue(value);

      const result = await kpiService.getById('val-1', TENANT_A);

      expect(result.tenantId).toBe(TENANT_A);
      expect(mockFindById).toHaveBeenCalledWith('val-1', TENANT_A);
    });

    it('listValues scopes by tenantId', async () => {
      mockFindByFilters.mockResolvedValue({
        data: [{ ...makeKpiValueRow(), paramName: 'GHG', paramCode: 'ENV-001', pillar: 'E', category: 'Climate', standard: 'BRSR', paramUnit: 'tCO2e', dataType: 'numeric' }],
        total: 1,
      });

      await kpiService.listValues(TENANT_A, {
        periodId: PERIOD_FY24,
        page: 1,
        pageSize: 10,
      });

      // First argument to findByFilters should be the tenantId
      expect(mockFindByFilters).toHaveBeenCalledWith(
        TENANT_A,
        expect.any(Object),
      );
    });
  });

  // ── Department Scope ───────────────────────────────────────

  describe('Department scope on verifyValues', () => {
    it('department user verifying own-dept values → allowed', async () => {
      mockUserFindById.mockResolvedValue({
        userId: USER_DEPT_HR,
        departmentId: DEPT_HR,
      });
      mockCheckDepartmentScope.mockResolvedValue(true);
      mockBatchVerify.mockResolvedValue({
        oldValues: [makeKpiValueRow()],
        newValues: [makeKpiValueRow({ verified: true })],
      });

      const result = await kpiService.verifyValues(
        TENANT_A, USER_DEPT_HR, ['val-1'], 'department'
      );

      expect(result.updated).toHaveLength(1);
      expect(mockCheckDepartmentScope).toHaveBeenCalledWith(['val-1'], TENANT_A, DEPT_HR);
    });

    it('department user verifying other-dept values → FORBIDDEN (403)', async () => {
      mockUserFindById.mockResolvedValue({
        userId: USER_DEPT_HR,
        departmentId: DEPT_HR,
      });
      mockCheckDepartmentScope.mockResolvedValue(false); // out of scope

      await expect(
        kpiService.verifyValues(TENANT_A, USER_DEPT_HR, ['val-1'], 'department')
      ).rejects.toThrow(AppError);

      try {
        await kpiService.verifyValues(TENANT_A, USER_DEPT_HR, ['val-1'], 'department');
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
        expect((err as AppError).status).toBe(403);
      }
    });

    it('department user with no departmentId → FORBIDDEN', async () => {
      mockUserFindById.mockResolvedValue({
        userId: USER_DEPT_HR,
        departmentId: null, // no department assigned
      });

      await expect(
        kpiService.verifyValues(TENANT_A, USER_DEPT_HR, ['val-1'], 'department')
      ).rejects.toThrow(AppError);

      try {
        await kpiService.verifyValues(TENANT_A, USER_DEPT_HR, ['val-1'], 'department');
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });
  });

  // ── Admin & Analyst Bypass ─────────────────────────────────

  describe('Admin and analyst bypass department scope', () => {
    it('admin skips department scope check entirely', async () => {
      mockBatchVerify.mockResolvedValue({
        oldValues: [makeKpiValueRow()],
        newValues: [makeKpiValueRow({ verified: true })],
      });

      // Passing role='admin' (not 'department')
      const result = await kpiService.verifyValues(
        TENANT_A, USER_ADMIN, ['val-1'], 'admin'
      );

      expect(result.updated).toHaveLength(1);
      expect(mockUserFindById).not.toHaveBeenCalled();
      expect(mockCheckDepartmentScope).not.toHaveBeenCalled();
    });

    it('analyst skips department scope check entirely', async () => {
      mockBatchVerify.mockResolvedValue({
        oldValues: [makeKpiValueRow()],
        newValues: [makeKpiValueRow({ verified: true })],
      });

      const result = await kpiService.verifyValues(
        TENANT_A, USER_ANALYST, ['val-1'], 'analyst'
      );

      expect(result.updated).toHaveLength(1);
      expect(mockUserFindById).not.toHaveBeenCalled();
      expect(mockCheckDepartmentScope).not.toHaveBeenCalled();
    });
  });

  // ── Duplicate Detection ────────────────────────────────────

  describe('Duplicate detection', () => {
    it('createValue with existing param+node+period throws DUPLICATE_ENTRY (409)', async () => {
      mockFindByParamNodePeriod.mockResolvedValue(makeKpiValueRow()); // already exists

      await expect(
        kpiService.createValue(TENANT_A, {
          paramId: PARAM_GHG,
          nodeId: NODE_ROOT,
          periodId: PERIOD_FY24,
          value: '100',
          sourceType: 'manual',
        })
      ).rejects.toThrow(AppError);

      try {
        await kpiService.createValue(TENANT_A, {
          paramId: PARAM_GHG,
          nodeId: NODE_ROOT,
          periodId: PERIOD_FY24,
          value: '100',
          sourceType: 'manual',
        });
      } catch (err) {
        expect((err as AppError).code).toBe('DUPLICATE_ENTRY');
        expect((err as AppError).status).toBe(409);
      }
    });

    it('createValue succeeds when no duplicate exists', async () => {
      mockFindByParamNodePeriod.mockResolvedValue(null); // no duplicate
      const newValue = makeKpiValueRow({ value: '150' });
      mockInsert.mockResolvedValue(newValue);

      const result = await kpiService.createValue(TENANT_A, {
        paramId: PARAM_GHG,
        nodeId: NODE_ROOT,
        periodId: PERIOD_FY24,
        value: '150',
        sourceType: 'manual',
      });

      expect(result.value).toBe('150');
    });
  });

  // ── Department Scope on markNotApplicable ──────────────────

  describe('Department scope on markNotApplicable', () => {
    it('department user marking own-dept values as N/A → allowed', async () => {
      mockUserFindById.mockResolvedValue({
        userId: USER_DEPT_OPS,
        departmentId: DEPT_OPS,
      });
      mockCheckDepartmentScope.mockResolvedValue(true);
      mockBatchMarkNotApplicable.mockResolvedValue({
        oldValues: [makeKpiValueRow()],
        newValues: [makeKpiValueRow({ notApplicable: true })],
      });

      const result = await kpiService.markNotApplicable(
        TENANT_A, USER_DEPT_OPS, ['val-1'], 'department'
      );

      expect(result.updated).toHaveLength(1);
    });

    it('department user marking other-dept values → FORBIDDEN', async () => {
      mockUserFindById.mockResolvedValue({
        userId: USER_DEPT_OPS,
        departmentId: DEPT_OPS,
      });
      mockCheckDepartmentScope.mockResolvedValue(false);

      await expect(
        kpiService.markNotApplicable(TENANT_A, USER_DEPT_OPS, ['val-1'], 'department')
      ).rejects.toThrow(AppError);
    });
  });
});
