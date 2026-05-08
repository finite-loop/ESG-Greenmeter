import { withApiHandler } from '@/middleware';
import { orgHierarchySchema } from '@/schemas/onboarding';
import { AppError, ErrorCode } from '@/lib/errors';
import { db } from '@/db';
import { orgNodes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const POST = withApiHandler(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = orgHierarchySchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid org hierarchy data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { nodes } = parsed.data;

    // Validate parent references: every parentTempId must reference a tempId in the batch
    const tempIds = new Set(nodes.map((n) => n.tempId));
    for (const node of nodes) {
      if (node.parentTempId && !tempIds.has(node.parentTempId)) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          `Invalid parent reference: ${node.parentTempId} not found in batch`,
          400
        );
      }
    }

    // Delete existing org nodes for this tenant (fresh setup during onboarding)
    await db.delete(orgNodes).where(eq(orgNodes.tenantId, ctx.tenantId));

    // Sort nodes so parents are inserted before children (topological order)
    const sorted = topologicalSort(nodes);

    // Map tempId → real nodeId for parent references
    const tempToReal = new Map<string, string>();

    for (const node of sorted) {
      const parentNodeId = node.parentTempId ? tempToReal.get(node.parentTempId) ?? null : null;
      const level = computeLevel(node.parentTempId, tempToReal, sorted);

      const [inserted] = await db
        .insert(orgNodes)
        .values({
          tenantId: ctx.tenantId,
          parentNodeId,
          name: node.name,
          nodeType: node.nodeType,
          currency: node.currency ?? null,
          level,
        })
        .returning({ nodeId: orgNodes.nodeId });

      tempToReal.set(node.tempId, inserted.nodeId);
    }

    return {
      data: { count: nodes.length, nodeIds: Array.from(tempToReal.values()) },
      _audit: {
        entityType: 'org_node',
        entityId: ctx.tenantId,
        action: 'CREATE',
        newValue: { nodeCount: nodes.length },
      },
    };
  },
  { roles: ['admin'], audit: true }
);

interface NodeInput {
  tempId: string;
  parentTempId: string | null;
  name: string;
  nodeType: string;
  currency?: string;
}

function topologicalSort(nodes: NodeInput[]): NodeInput[] {
  const result: NodeInput[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map((n) => [n.tempId, n]));

  function visit(node: NodeInput) {
    if (visited.has(node.tempId)) return;
    if (node.parentTempId) {
      const parent = nodeMap.get(node.parentTempId);
      if (parent) visit(parent);
    }
    visited.add(node.tempId);
    result.push(node);
  }

  for (const node of nodes) {
    visit(node);
  }

  return result;
}

function computeLevel(
  parentTempId: string | null,
  tempToReal: Map<string, string>,
  sorted: NodeInput[]
): number {
  if (!parentTempId) return 0;
  let level = 0;
  let current = parentTempId;
  while (current) {
    level++;
    const parent = sorted.find((n) => n.tempId === current);
    current = parent?.parentTempId ?? '';
  }
  return level;
}
