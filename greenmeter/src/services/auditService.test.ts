import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditService, type LogChangeParams } from './auditService';

vi.mock('@/db/repositories/auditRepository', () => ({
  auditRepository: {
    insert: vi.fn().mockResolvedValue(undefined),
    findFiltered: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
}));

describe('auditService', () => {
  let auditRepository: {
    insert: ReturnType<typeof vi.fn>;
    findFiltered: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/db/repositories/auditRepository');
    auditRepository = mod.auditRepository as typeof auditRepository;
  });

  describe('logChange', () => {
    it('inserts an audit entry via the repository', async () => {
      const params: LogChangeParams = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        action: 'CREATE',
        entityType: 'kpi_value',
        entityId: 'entity-1',
        newValue: { value: 100 },
      };

      await auditService.logChange(params);

      expect(auditRepository.insert).toHaveBeenCalledTimes(1);
      expect(auditRepository.insert).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'kpi_value',
        entityId: 'entity-1',
        oldValue: undefined,
        newValue: { value: 100 },
        metadata: undefined,
      });
    });

    it('passes oldValue for update operations', async () => {
      const params: LogChangeParams = {
        userId: 'user-2',
        tenantId: 'tenant-2',
        action: 'UPDATE',
        entityType: 'goal',
        entityId: 'goal-1',
        oldValue: { title: 'Old' },
        newValue: { title: 'New' },
      };

      await auditService.logChange(params);

      expect(auditRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          oldValue: { title: 'Old' },
          newValue: { title: 'New' },
        })
      );
    });

    it('passes metadata when provided', async () => {
      const params: LogChangeParams = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        action: 'DELETE',
        entityType: 'user',
        entityId: 'user-99',
        oldValue: { name: 'Deleted User' },
        metadata: { ip: '10.0.0.1', reason: 'deactivated' },
      };

      await auditService.logChange(params);

      expect(auditRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { ip: '10.0.0.1', reason: 'deactivated' },
        })
      );
    });

    it('does not expose update or delete methods', () => {
      expect(auditService).not.toHaveProperty('update');
      expect(auditService).not.toHaveProperty('delete');
      expect(auditService).not.toHaveProperty('remove');
    });
  });

  describe('getFiltered', () => {
    it('returns paginated data with meta from repository', async () => {
      const mockData = [
        {
          logId: 'log-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'kpi_value',
          entityId: 'entity-1',
          oldValue: null,
          newValue: { value: 42 },
          metadata: null,
          createdAt: new Date('2026-01-01'),
        },
      ];

      auditRepository.findFiltered.mockResolvedValue({
        data: mockData,
        total: 1,
      });

      const result = await auditService.getFiltered({
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toEqual(mockData);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
      });
    });

    it('passes filters to the repository', async () => {
      auditRepository.findFiltered.mockResolvedValue({
        data: [],
        total: 0,
      });

      await auditService.getFiltered({
        page: 2,
        pageSize: 10,
        entityType: 'goal',
        action: 'UPDATE',
      });

      expect(auditRepository.findFiltered).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        entityType: 'goal',
        action: 'UPDATE',
      });
    });

    it('returns empty result when no entries match', async () => {
      auditRepository.findFiltered.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await auditService.getFiltered({
        page: 1,
        pageSize: 20,
        userId: 'non-existent-user',
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
