import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

const mockFindAllByTenant = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteNode = vi.fn();
const mockHasChildren = vi.fn();
const mockHasKpiValues = vi.fn();
const mockFindDescendantIds = vi.fn();
const mockUpdateDescendantLevels = vi.fn();

vi.mock('@/db/repositories/orgHierarchyRepository', () => ({
  orgHierarchyRepository: {
    findAllByTenant: (...args: unknown[]) => mockFindAllByTenant(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDeleteNode(...args),
    hasChildren: (...args: unknown[]) => mockHasChildren(...args),
    hasKpiValues: (...args: unknown[]) => mockHasKpiValues(...args),
    findDescendantIds: (...args: unknown[]) => mockFindDescendantIds(...args),
    updateDescendantLevels: (...args: unknown[]) => mockUpdateDescendantLevels(...args),
  },
}));

import { orgHierarchyService } from './orgHierarchyService';

const rootNode = {
  nodeId: 'node-root',
  tenantId: 'tenant-1',
  parentNodeId: null,
  name: 'Acme Corp',
  nodeType: 'company',
  code: 'ACME',
  currency: 'INR',
  level: 0,
  active: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const childNode = {
  nodeId: 'node-child',
  tenantId: 'tenant-1',
  parentNodeId: 'node-root',
  name: 'Engineering',
  nodeType: 'department',
  code: 'ENG',
  currency: null,
  level: 1,
  active: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('orgHierarchyService.getTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array for no nodes', async () => {
    mockFindAllByTenant.mockResolvedValue([]);
    const tree = await orgHierarchyService.getTree();
    expect(tree).toEqual([]);
  });

  it('builds tree with parent-child relationship', async () => {
    mockFindAllByTenant.mockResolvedValue([rootNode, childNode]);
    const tree = await orgHierarchyService.getTree();

    expect(tree).toHaveLength(1);
    expect(tree[0].nodeId).toBe('node-root');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].nodeId).toBe('node-child');
    expect(tree[0].children[0].children).toEqual([]);
  });

  it('handles multiple roots', async () => {
    const root2 = { ...rootNode, nodeId: 'node-root-2', name: 'Beta Corp' };
    mockFindAllByTenant.mockResolvedValue([rootNode, root2]);
    const tree = await orgHierarchyService.getTree();

    expect(tree).toHaveLength(2);
  });
});

describe('orgHierarchyService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns node when found', async () => {
    mockFindById.mockResolvedValue(rootNode);
    const node = await orgHierarchyService.getById('node-root');
    expect(node.name).toBe('Acme Corp');
  });

  it('throws NOT_FOUND when node does not exist', async () => {
    mockFindById.mockResolvedValue(null);
    await expect(orgHierarchyService.getById('nonexistent')).rejects.toThrow(AppError);
    await expect(orgHierarchyService.getById('nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});

describe('orgHierarchyService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates node under existing parent', async () => {
    mockFindById.mockResolvedValue(rootNode);
    const created = { ...childNode };
    mockCreate.mockResolvedValue(created);

    const result = await orgHierarchyService.create('tenant-1', {
      parentNodeId: 'node-root',
      name: 'Engineering',
      nodeType: 'department',
      code: 'ENG',
    });

    expect(result.name).toBe('Engineering');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        parentNodeId: 'node-root',
        name: 'Engineering',
        nodeType: 'department',
        level: 1,
      })
    );
  });

  it('throws NOT_FOUND when parent does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      orgHierarchyService.create('tenant-1', {
        parentNodeId: 'nonexistent',
        name: 'Test',
        nodeType: 'department',
      })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});

describe('orgHierarchyService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates name', async () => {
    const updated = { ...rootNode, name: 'Updated Corp' };
    mockFindById.mockResolvedValue(rootNode);
    mockUpdate.mockResolvedValue(updated);

    const result = await orgHierarchyService.update('node-root', { name: 'Updated Corp' });
    expect(result.name).toBe('Updated Corp');
    expect(mockUpdate).toHaveBeenCalledWith('node-root', { name: 'Updated Corp' });
  });

  it('throws NOT_FOUND when node does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      orgHierarchyService.update('nonexistent', { name: 'Test' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('rejects self-parenting', async () => {
    mockFindById.mockResolvedValue(rootNode);

    await expect(
      orgHierarchyService.update('node-root', { parentNodeId: 'node-root' })
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });

  it('rejects circular reparenting', async () => {
    mockFindById.mockImplementation(async (id: string) => {
      if (id === 'node-root') return rootNode;
      if (id === 'node-child') return childNode;
      return null;
    });
    mockFindDescendantIds.mockResolvedValue(['node-child', 'node-grandchild']);

    await expect(
      orgHierarchyService.update('node-root', { parentNodeId: 'node-child' })
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });

  it('allows valid reparenting', async () => {
    const siblingNode = {
      ...rootNode,
      nodeId: 'node-sibling',
      parentNodeId: null,
      name: 'Sibling',
      level: 0,
    };
    mockFindById.mockImplementation(async (id: string) => {
      if (id === 'node-child') return childNode;
      if (id === 'node-sibling') return siblingNode;
      return null;
    });
    mockFindDescendantIds.mockResolvedValue([]);
    const reparented = { ...childNode, parentNodeId: 'node-sibling', level: 1 };
    mockUpdate.mockResolvedValue(reparented);

    const result = await orgHierarchyService.update('node-child', { parentNodeId: 'node-sibling' });
    expect(result.parentNodeId).toBe('node-sibling');
    expect(mockUpdate).toHaveBeenCalledWith(
      'node-child',
      expect.objectContaining({ parentNodeId: 'node-sibling', level: 1 })
    );
    expect(mockUpdateDescendantLevels).toHaveBeenCalledWith('node-child', 1);
  });

  it('returns existing node when no fields are changed', async () => {
    mockFindById.mockResolvedValue(rootNode);

    const result = await orgHierarchyService.update('node-root', {});
    expect(result).toEqual(rootNode);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('orgHierarchyService.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes node without children or values', async () => {
    mockFindById.mockResolvedValue(childNode);
    mockHasChildren.mockResolvedValue(false);
    mockHasKpiValues.mockResolvedValue(false);
    mockDeleteNode.mockResolvedValue(true);

    await orgHierarchyService.delete('node-child');
    expect(mockDeleteNode).toHaveBeenCalledWith('node-child');
  });

  it('throws NOT_FOUND when node does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(orgHierarchyService.delete('nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('returns 409 CONFLICT when node has children', async () => {
    mockFindById.mockResolvedValue(rootNode);
    mockHasChildren.mockResolvedValue(true);

    await expect(orgHierarchyService.delete('node-root')).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
  });

  it('returns 409 CONFLICT when node has KPI values', async () => {
    mockFindById.mockResolvedValue(childNode);
    mockHasChildren.mockResolvedValue(false);
    mockHasKpiValues.mockResolvedValue(true);

    await expect(orgHierarchyService.delete('node-child')).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
  });
});
