import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

const mockFindById = vi.fn();
const mockGetMilestones = vi.fn();
const mockFindMilestoneById = vi.fn();
const mockCreateMilestone = vi.fn();
const mockUpdateMilestone = vi.fn();
const mockDeleteMilestone = vi.fn();
const mockFindPendingMilestonesByGoalParam = vi.fn();
const mockMarkMilestoneAchieved = vi.fn();
const mockFindPendingMilestonesPastDue = vi.fn();
const mockMarkMilestonesMissed = vi.fn();
const mockGetComponents = vi.fn();

vi.mock('@/db/repositories/goalRepository', () => ({
  goalRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    getMilestones: (...args: unknown[]) => mockGetMilestones(...args),
    findMilestoneById: (...args: unknown[]) => mockFindMilestoneById(...args),
    createMilestone: (...args: unknown[]) => mockCreateMilestone(...args),
    updateMilestone: (...args: unknown[]) => mockUpdateMilestone(...args),
    deleteMilestone: (...args: unknown[]) => mockDeleteMilestone(...args),
    findPendingMilestonesByGoalParam: (...args: unknown[]) => mockFindPendingMilestonesByGoalParam(...args),
    markMilestoneAchieved: (...args: unknown[]) => mockMarkMilestoneAchieved(...args),
    findPendingMilestonesPastDue: (...args: unknown[]) => mockFindPendingMilestonesPastDue(...args),
    markMilestonesMissed: (...args: unknown[]) => mockMarkMilestonesMissed(...args),
    getComponents: (...args: unknown[]) => mockGetComponents(...args),
    findAllByTenant: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addComponent: vi.fn(),
    removeComponent: vi.fn(),
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
const GOAL_ID = 'goal-1';

const baseGoal = {
  goalId: GOAL_ID,
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
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const baseMilestone = {
  milestoneId: 'ms-1',
  goalId: GOAL_ID,
  tenantId: TENANT_ID,
  name: '10% Reduction by Q2',
  description: null,
  targetValue: '135',
  targetDate: new Date('2027-06-30'),
  status: 'pending',
  achievedAt: null,
  sortOrder: 0,
  createdAt: new Date('2026-01-01'),
};

describe('goalService.getMilestones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns milestones for a goal', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    mockGetMilestones.mockResolvedValue([baseMilestone]);

    const result = await goalService.getMilestones(GOAL_ID, TENANT_ID);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('10% Reduction by Q2');
    expect(mockGetMilestones).toHaveBeenCalledWith(GOAL_ID, TENANT_ID);
  });

  it('throws NOT_FOUND when goal does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(goalService.getMilestones('goal-missing', TENANT_ID)).rejects.toThrow(AppError);

    try {
      await goalService.getMilestones('goal-missing', TENANT_ID);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });

  it('returns empty array when no milestones exist', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    mockGetMilestones.mockResolvedValue([]);

    const result = await goalService.getMilestones(GOAL_ID, TENANT_ID);

    expect(result).toHaveLength(0);
  });
});

describe('goalService.createMilestone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a milestone for an existing goal', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    mockCreateMilestone.mockResolvedValue(baseMilestone);

    const result = await goalService.createMilestone(GOAL_ID, TENANT_ID, {
      name: '10% Reduction by Q2',
      targetValue: '135',
      targetDate: new Date('2027-06-30'),
    });

    expect(result.name).toBe('10% Reduction by Q2');
    expect(mockCreateMilestone).toHaveBeenCalledWith(
      GOAL_ID,
      TENANT_ID,
      expect.objectContaining({
        name: '10% Reduction by Q2',
        targetValue: '135',
      })
    );
  });

  it('throws NOT_FOUND when goal does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      goalService.createMilestone('goal-missing', TENANT_ID, {
        name: 'Test',
      })
    ).rejects.toThrow(AppError);
  });

  it('creates milestone with only required fields', async () => {
    mockFindById.mockResolvedValue(baseGoal);
    const minMilestone = { ...baseMilestone, targetValue: null, targetDate: null };
    mockCreateMilestone.mockResolvedValue(minMilestone);

    const result = await goalService.createMilestone(GOAL_ID, TENANT_ID, {
      name: 'Basic Milestone',
    });

    expect(result).toBeDefined();
    expect(mockCreateMilestone).toHaveBeenCalledTimes(1);
  });
});

describe('goalService.updateMilestone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates milestone and returns old+new values', async () => {
    mockFindMilestoneById.mockResolvedValue(baseMilestone);
    const updated = { ...baseMilestone, name: 'Updated Milestone' };
    mockUpdateMilestone.mockResolvedValue({ oldValue: baseMilestone, newValue: updated });

    const result = await goalService.updateMilestone('ms-1', TENANT_ID, { name: 'Updated Milestone' });

    expect(result.oldValue.name).toBe('10% Reduction by Q2');
    expect(result.newValue.name).toBe('Updated Milestone');
  });

  it('throws NOT_FOUND when milestone does not exist', async () => {
    mockFindMilestoneById.mockResolvedValue(null);

    await expect(
      goalService.updateMilestone('ms-missing', TENANT_ID, { name: 'X' })
    ).rejects.toThrow(AppError);

    try {
      await goalService.updateMilestone('ms-missing', TENANT_ID, { name: 'X' });
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });
});

describe('goalService.deleteMilestone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes milestone and returns deleted row', async () => {
    mockDeleteMilestone.mockResolvedValue(baseMilestone);

    const result = await goalService.deleteMilestone('ms-1', TENANT_ID);

    expect(result.milestoneId).toBe('ms-1');
    expect(mockDeleteMilestone).toHaveBeenCalledWith('ms-1', TENANT_ID);
  });

  it('throws NOT_FOUND when milestone does not exist', async () => {
    mockDeleteMilestone.mockResolvedValue(null);

    await expect(goalService.deleteMilestone('ms-missing', TENANT_ID)).rejects.toThrow(AppError);

    try {
      await goalService.deleteMilestone('ms-missing', TENANT_ID);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });
});

describe('goalService.checkMilestonesForParam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks milestone as achieved when current value meets target (lower_is_better)', async () => {
    mockFindPendingMilestonesByGoalParam.mockResolvedValue([
      { ...baseMilestone, targetValue: '135', goalParamId: 'param-1', goalDirection: 'lower_is_better' },
    ]);
    mockMarkMilestoneAchieved.mockResolvedValue({ ...baseMilestone, status: 'achieved', achievedAt: new Date() });

    const result = await goalService.checkMilestonesForParam(TENANT_ID, 'param-1', 130);

    expect(result).toHaveLength(1);
    expect(mockMarkMilestoneAchieved).toHaveBeenCalledWith('ms-1', TENANT_ID);
  });

  it('marks milestone as achieved when current value meets target (higher_is_better)', async () => {
    mockFindPendingMilestonesByGoalParam.mockResolvedValue([
      { ...baseMilestone, targetValue: '50', goalParamId: 'param-1', goalDirection: 'higher_is_better' },
    ]);
    mockMarkMilestoneAchieved.mockResolvedValue({ ...baseMilestone, status: 'achieved' });

    const result = await goalService.checkMilestonesForParam(TENANT_ID, 'param-1', 55);

    expect(result).toHaveLength(1);
    expect(mockMarkMilestoneAchieved).toHaveBeenCalledTimes(1);
  });

  it('does not mark milestone when value does not meet target', async () => {
    mockFindPendingMilestonesByGoalParam.mockResolvedValue([
      { ...baseMilestone, targetValue: '100', goalParamId: 'param-1', goalDirection: 'lower_is_better' },
    ]);

    const result = await goalService.checkMilestonesForParam(TENANT_ID, 'param-1', 150);

    expect(result).toHaveLength(0);
    expect(mockMarkMilestoneAchieved).not.toHaveBeenCalled();
  });

  it('skips milestones without target value', async () => {
    mockFindPendingMilestonesByGoalParam.mockResolvedValue([
      { ...baseMilestone, targetValue: null, goalParamId: 'param-1', goalDirection: 'lower_is_better' },
    ]);

    const result = await goalService.checkMilestonesForParam(TENANT_ID, 'param-1', 100);

    expect(result).toHaveLength(0);
    expect(mockMarkMilestoneAchieved).not.toHaveBeenCalled();
  });

  it('returns empty array when no pending milestones exist', async () => {
    mockFindPendingMilestonesByGoalParam.mockResolvedValue([]);

    const result = await goalService.checkMilestonesForParam(TENANT_ID, 'param-1', 100);

    expect(result).toHaveLength(0);
  });
});

describe('goalService.detectMissedMilestones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks past-due milestones as missed', async () => {
    const pastDue = [
      { ...baseMilestone, targetDate: new Date('2025-01-01') },
    ];
    mockFindPendingMilestonesPastDue.mockResolvedValue(pastDue);
    mockMarkMilestonesMissed.mockResolvedValue(1);

    const count = await goalService.detectMissedMilestones(TENANT_ID, new Date('2026-01-01'));

    expect(count).toBe(1);
    expect(mockMarkMilestonesMissed).toHaveBeenCalledWith(['ms-1'], TENANT_ID);
  });

  it('returns 0 when no milestones are past due', async () => {
    mockFindPendingMilestonesPastDue.mockResolvedValue([]);

    const count = await goalService.detectMissedMilestones(TENANT_ID);

    expect(count).toBe(0);
    expect(mockMarkMilestonesMissed).not.toHaveBeenCalled();
  });
});
