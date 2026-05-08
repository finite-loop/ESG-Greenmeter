import { orgHierarchyRepository } from '@/db/repositories/orgHierarchyRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import type { CreateOrgNode, UpdateOrgNode } from '@/schemas/orgHierarchy';
import type { OrgNodeRow } from '@/db/repositories/orgHierarchyRepository';

export interface OrgNodeTree extends OrgNodeRow {
  children: OrgNodeTree[];
}

function buildTree(nodes: OrgNodeRow[]): OrgNodeTree[] {
  const nodeMap = new Map<string, OrgNodeTree>();
  const roots: OrgNodeTree[] = [];

  for (const node of nodes) {
    nodeMap.set(node.nodeId, { ...node, children: [] });
  }

  for (const node of nodes) {
    const treeNode = nodeMap.get(node.nodeId)!;
    if (node.parentNodeId && nodeMap.has(node.parentNodeId)) {
      nodeMap.get(node.parentNodeId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}

export const orgHierarchyService = {
  async getTree(): Promise<OrgNodeTree[]> {
    const nodes = await orgHierarchyRepository.findAllByTenant();
    return buildTree(nodes);
  },

  async getById(nodeId: string): Promise<OrgNodeRow> {
    const node = await orgHierarchyRepository.findById(nodeId);

    if (!node) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Org node not found: ${nodeId}`,
        404
      );
    }

    return node;
  },

  async create(tenantId: string, input: CreateOrgNode): Promise<OrgNodeRow> {
    const parent = await orgHierarchyRepository.findById(input.parentNodeId);

    if (!parent) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Parent node not found: ${input.parentNodeId}`,
        404
      );
    }

    return orgHierarchyRepository.create({
      tenantId,
      parentNodeId: input.parentNodeId,
      name: input.name,
      nodeType: input.nodeType,
      code: input.code,
      currency: input.currency,
      level: parent.level + 1,
    });
  },

  async update(nodeId: string, input: UpdateOrgNode): Promise<OrgNodeRow> {
    const existing = await orgHierarchyRepository.findById(nodeId);

    if (!existing) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Org node not found: ${nodeId}`,
        404
      );
    }

    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.nodeType !== undefined) updates.nodeType = input.nodeType;
    if (input.code !== undefined) updates.code = input.code;
    if (input.currency !== undefined) updates.currency = input.currency;

    if (input.parentNodeId !== undefined) {
      if (input.parentNodeId === nodeId) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'A node cannot be its own parent',
          400
        );
      }

      const newParent = await orgHierarchyRepository.findById(input.parentNodeId);
      if (!newParent) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          `Parent node not found: ${input.parentNodeId}`,
          404
        );
      }

      // Check for circular reference: ensure new parent is not a descendant
      const descendantIds = await orgHierarchyRepository.findDescendantIds(nodeId);
      if (descendantIds.includes(input.parentNodeId)) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot reparent node under its own descendant (circular reference)',
          400
        );
      }

      updates.parentNodeId = input.parentNodeId;
      updates.level = newParent.level + 1;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const updated = await orgHierarchyRepository.update(nodeId, updates);

    if (!updated) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'Failed to update org node',
        500
      );
    }

    // Update descendant levels when reparenting
    if (input.parentNodeId !== undefined) {
      await orgHierarchyRepository.updateDescendantLevels(nodeId, updated.level);
    }

    return updated;
  },

  async delete(nodeId: string): Promise<void> {
    const existing = await orgHierarchyRepository.findById(nodeId);

    if (!existing) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Org node not found: ${nodeId}`,
        404
      );
    }

    const hasChildren = await orgHierarchyRepository.hasChildren(nodeId);
    if (hasChildren) {
      throw new AppError(
        ErrorCode.CONFLICT,
        'Cannot delete node with child nodes. Remove or reassign children first.',
        409
      );
    }

    const hasValues = await orgHierarchyRepository.hasKpiValues(nodeId);
    if (hasValues) {
      throw new AppError(
        ErrorCode.CONFLICT,
        'Cannot delete node with existing KPI values. Remove values first.',
        409
      );
    }

    await orgHierarchyRepository.delete(nodeId);
  },
};
