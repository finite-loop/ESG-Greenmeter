import { withApiHandler } from '@/middleware';
import { orgHierarchyService } from '@/services/orgHierarchyService';
import { updateOrgNodeSchema } from '@/schemas/orgHierarchy';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const nodeId = extractUuidParam(req, 3, 'node ID');
    const node = await orgHierarchyService.getById(nodeId);

    return { data: node };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);

export const PUT = withApiHandler(
  async (req) => {
    const nodeId = extractUuidParam(req, 3, 'node ID');

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400
      );
    }

    const parsed = updateOrgNodeSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid update data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const oldNode = await orgHierarchyService.getById(nodeId);
    const updated = await orgHierarchyService.update(nodeId, parsed.data);

    return {
      data: updated,
      _audit: {
        entityType: 'org_node',
        entityId: nodeId,
        oldValue: oldNode,
        newValue: updated,
      },
    };
  },
  { roles: ['admin'] }
);

export const DELETE = withApiHandler(
  async (req) => {
    const nodeId = extractUuidParam(req, 3, 'node ID');

    const oldNode = await orgHierarchyService.getById(nodeId);
    await orgHierarchyService.delete(nodeId);

    return {
      data: null,
      _audit: {
        entityType: 'org_node',
        entityId: nodeId,
        oldValue: oldNode,
      },
    };
  },
  { roles: ['admin'] }
);
