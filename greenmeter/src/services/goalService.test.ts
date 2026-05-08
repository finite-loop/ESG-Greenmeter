import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

const mockFindAllByTenant = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetComponents = vi.fn();
const mockAddComponent = vi.fn();
const mockRemoveComponent = vi.fn();
const mockGetMilestones = vi.fn();
const mockMarkMilestonesMissed = vi.fn();

vi.mock('@/db/repositories/goalRepository', () => ({
  goalRepository: {
    findAllByTenant: (...args: unknown[]) => mockFindAllByTenant(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    getComponents: (...args: unknown[]) => mockGetComponents(...args),
    addComponent: (...args: unknown[]) => mockAddComponent(...args),
    removeComponent: (...args: unknown[]) => mockRemoveComponent(...args),
    getMilestones: (...args: unknown[]) => mockGetMilestones(...args),
    markMilestonesMissed: (...args: unknown[]) => mockMarkMilestonesMissed(...args),
    findMilestoneById: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    findPendingMilestonesByGoalParam: vi.fn(),
    markMilestoneAchieved: vi.fn(),
    findPendingMilestonesPastDue: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { goalService } from './goalService';

const TENANT_ID = 'tenant-123';
const USER_ID = 'user-456';

const baseGoal = {
  goalId: 'goal-1',
  tenantId: TENANT_ID,
  paramId: 'param-1',
  canonicalId: null,
  name: 'Reduce Scope 1 Emissions',
  description: null,
  targetValue: '100',
  baselineValue: '150',
  baselineYear: '2020',
  targetYear: '2030',
  unit: 'tCO2e',
  direction: 'lower_is_better',
  status: 'active',
  createdBy: USER_ID,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const baseComponent = {
  componentId: 'comp-1',
  goalId: 'goal-1',
  tenantId: TENANT_ID,
  name: 'Fleet Electrification',
  targetValue: '50',
  weight: '0.5',
  paramId: null,
  sortOrder: 0,
  createdAt: new Date('2026-01-01'),
};

describe('goalService.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns goals with pagination and progress', async () => {
    mockFindAllByTenant.mockResolvedValue({
      data: [{ ...baseGoal, componentCount: 2 }],
      total: 1,
    });
    mockGetComponents.mockResolvedValue([
      { ...baseComponent, weight: '0.5' },
      { ...baseComponent, componentId: 'comp-2', weight: '0.5' },
    ]);

    const result = await goalService.list(TENANT_ID, { page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Reduce Scope 1 Emissions');
    expect(result.data[0].progress).toBeDefined();
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('returns empty list when no goals exist', async () => {
    mockFindAllByTenant.mockResolvedValue({ data: [], total: 0 });

    const result = await goalService.list(TENANT_ID, { page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('passes status filter to repository', async () => {
    mockFindAllByTenant.mockResolvedValue({ data: [], total: 0 });

    await goalService.list(TENANT_ID, { status: 'active', page: 1, pageSize: 20 });

    expect(mockFindAllByTenant).toHaveBeenCalledWith(TENANT_ID, {
      status: 'active',
      page: 1,
      pageSize: 20,
    });
  });
});

describe('goalService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns goal with components, milestones, and progress', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    mockGetComponents.mockResolvedValue([baseComponent]);
    mockGetMilestones.mockResolvedValue([]);

    const result = await goalService.getById('goal-1', TENANT_ID);

    expect(result.goalId).toBe('goal-1');
    expect(result.components).toHaveLength(1);
    expect(result.milestones).toHaveLength(0);
    expect(result.progress).toBeDefined();
  });

  it('throws NOT_FOUND when goal does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(goalService.getById('goal-missing', TENANT_ID)).rejects.toThrow(AppError);

    try {
      await goalService.getById('goal-missing', TENANT_ID);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });

  it('returns zero progress when no components exist', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    mockGetComponents.mockResolvedValue([]);
    mockGetMilestones.mockResolvedValue([]);

    const result = await goalService.getById('goal-1', TENANT_ID);

    expect(result.components).toHaveLength(0);
    expect(result.progress).toBe(0);
  });
});

describe('goalService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a goal with all fields', async () => {
    mockCreate.mockResolvedValue(baseGoal);

    const result = await goalService.create(TENANT_ID, USER_ID, {
      paramId: 'param-1',
      name: 'Reduce Scope 1 Emissions',
      targetValue: '100',
      targetYear: '2030',
      unit: 'tCO2e',
      direction: 'lower_is_better',
      baselineValue: '150',
      baselineYear: '2020',
    });

    expect(result.name).toBe('Reduce Scope 1 Emissions');
    expect(mockCreate).toHaveBeenCalledWith(
      TENANT_ID,
      USER_ID,
      expect.objectContaining({
        paramId: 'param-1',
        name: 'Reduce Scope 1 Emissions',
        targetValue: '100',
        targetYear: '2030',
      })
    );
  });

  it('creates a goal with only required fields', async () => {
    const minGoal = { ...baseGoal, unit: null, baselineValue: null };
    mockCreate.mockResolvedValue(minGoal);

    const result = await goalService.create(TENANT_ID, USER_ID, {
      paramId: 'param-1',
      name: 'Basic Goal',
      targetValue: '50',
      targetYear: '2025',
      direction: 'lower_is_better',
    });

    expect(result).toBeDefined();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('goalService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates goal and returns old+new values', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    const updated = { ...baseGoal, name: 'Updated Goal', updatedAt: new Date() };
    mockUpdate.mockResolvedValue({ oldValue: baseGoal, newValue: updated });

    const result = await goalService.update('goal-1', TENANT_ID, { name: 'Updated Goal' });

    expect(result.oldValue.name).toBe('Reduce Scope 1 Emissions');
    expect(result.newValue.name).toBe('Updated Goal');
  });

  it('throws NOT_FOUND when goal does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      goalService.update('goal-missing', TENANT_ID, { name: 'X' })
    ).rejects.toThrow(AppError);

    try {
      await goalService.update('goal-missing', TENANT_ID, { name: 'X' });
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });
});

describe('goalService.deleteGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes goal and returns deleted row', async () => {
    mockDelete.mockResolvedValue(baseGoal);

    const result = await goalService.deleteGoal('goal-1', TENANT_ID);

    expect(result.goalId).toBe('goal-1');
    expect(mockDelete).toHaveBeenCalledWith('goal-1', TENANT_ID);
  });

  it('throws NOT_FOUND when goal does not exist', async () => {
    mockDelete.mockResolvedValue(null);

    await expect(goalService.deleteGoal('goal-missing', TENANT_ID)).rejects.toThrow(AppError);

    try {
      await goalService.deleteGoal('goal-missing', TENANT_ID);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });
});

describe('goalService.addComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds component when weights are valid', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    mockGetComponents.mockResolvedValue([
      { ...baseComponent, weight: '0.5' },
    ]);
    mockAddComponent.mockResolvedValue({
      ...baseComponent,
      componentId: 'comp-new',
      name: 'Green Energy',
      weight: '0.3',
    });

    const result = await goalService.addComponent('goal-1', TENANT_ID, {
      name: 'Green Energy',
      weight: '0.3',
      sortOrder: 0,
    });

    expect(result.name).toBe('Green Energy');
    expect(mockAddComponent).toHaveBeenCalledTimes(1);
  });

  it('rejects component when weights would exceed 1.0', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    mockGetComponents.mockResolvedValue([
      { ...baseComponent, weight: '0.8' },
    ]);

    await expect(
      goalService.addComponent('goal-1', TENANT_ID, {
        name: 'Too Heavy',
        weight: '0.5',
        sortOrder: 0,
      })
    ).rejects.toThrow(AppError);

    try {
      await goalService.addComponent('goal-1', TENANT_ID, {
        name: 'Too Heavy',
        weight: '0.5',
        sortOrder: 0,
      });
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('VALIDATION_ERROR');
      expect(appErr.status).toBe(400);
    }
  });

  it('throws NOT_FOUND when goal does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      goalService.addComponent('goal-missing', TENANT_ID, {
        name: 'Test',
        weight: '0.5',
        sortOrder: 0,
      })
    ).rejects.toThrow(AppError);
  });
});

describe('goalService.removeComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes component and returns deleted row', async () => {
    mockRemoveComponent.mockResolvedValue(baseComponent);

    const result = await goalService.removeComponent('comp-1', TENANT_ID);

    expect(result.componentId).toBe('comp-1');
    expect(mockRemoveComponent).toHaveBeenCalledWith('comp-1', TENANT_ID);
  });

  it('throws NOT_FOUND when component does not exist', async () => {
    mockRemoveComponent.mockResolvedValue(null);

    await expect(
      goalService.removeComponent('comp-missing', TENANT_ID)
    ).rejects.toThrow(AppError);
  });
});
