import { withApiHandler } from '@/middleware';
import { orgHierarchyService } from '@/services/orgHierarchyService';
import { createOrgNodeSchema } from '@/schemas/orgHierarchy';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (_req, ctx) => {
    const tree = await orgHierarchyService.getTree(ctx.tenantId);

    return { data: tree };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);

export const POST = withApiHandler(
  async (req, ctx) => {
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

    const parsed = createOrgNodeSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid org node data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const node = await orgHierarchyService.create(ctx.tenantId, parsed.data);

    return {
      data: node,
      _audit: {
        entityType: 'org_node',
        entityId: node.nodeId,
        newValue: node,
      },
    };
  },
  { roles: ['admin'] }
);
