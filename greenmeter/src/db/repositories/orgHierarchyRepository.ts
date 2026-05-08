import { db } from '@/db';
import { orgNodes } from '@/db/schema/tenants';
import { kpiValues } from '@/db/schema/kpi';
import { eq, and, sql } from 'drizzle-orm';

export interface OrgNodeRow {
  nodeId: string;
  tenantId: string;
  parentNodeId: string | null;
  name: string;
  nodeType: string;
  code: string | null;
  currency: string | null;
  level: number;
  active: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgNodeInsert {
  tenantId: string;
  parentNodeId: string | null;
  name: string;
  nodeType: string;
  code?: string | null;
  currency?: string | null;
  level: number;
}

export const orgHierarchyRepository = {
  async findAllByTenant(): Promise<OrgNodeRow[]> {
    const data = await db
      .select()
      .from(orgNodes)
      .orderBy(orgNodes.level, orgNodes.name);

    return data as OrgNodeRow[];
  },

  async findById(nodeId: string): Promise<OrgNodeRow | null> {
    const result = await db
      .select()
      .from(orgNodes)
      .where(eq(orgNodes.nodeId, nodeId))
      .limit(1);

    return (result[0] as OrgNodeRow) ?? null;
  },

  async create(node: OrgNodeInsert): Promise<OrgNodeRow> {
    const result = await db
      .insert(orgNodes)
      .values({
        tenantId: node.tenantId,
        parentNodeId: node.parentNodeId,
        name: node.name,
        nodeType: node.nodeType,
        code: node.code ?? null,
        currency: node.currency ?? null,
        level: node.level,
      })
      .returning();

    return result[0] as OrgNodeRow;
  },

  async update(
    nodeId: string,
    updates: Partial<Omit<OrgNodeInsert, 'tenantId'>>
  ): Promise<OrgNodeRow | null> {
    const result = await db
      .update(orgNodes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(orgNodes.nodeId, nodeId))
      .returning();

    return (result[0] as OrgNodeRow) ?? null;
  },

  async delete(nodeId: string): Promise<boolean> {
    const result = await db
      .delete(orgNodes)
      .where(eq(orgNodes.nodeId, nodeId))
      .returning({ nodeId: orgNodes.nodeId });

    return result.length > 0;
  },

  async hasChildren(nodeId: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orgNodes)
      .where(eq(orgNodes.parentNodeId, nodeId));

    return (result[0]?.count ?? 0) > 0;
  },

  async hasKpiValues(nodeId: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kpiValues)
      .where(eq(kpiValues.nodeId, nodeId));

    return (result[0]?.count ?? 0) > 0;
  },

  async findDescendantIds(nodeId: string): Promise<string[]> {
    const result = await db.execute<{ node_id: string }>(
      sql`WITH RECURSIVE descendants AS (
        SELECT node_id FROM org_nodes WHERE parent_node_id = ${nodeId}
        UNION ALL
        SELECT o.node_id FROM org_nodes o
        INNER JOIN descendants d ON o.parent_node_id = d.node_id
      )
      SELECT node_id FROM descendants`
    );

    return result.map((row) => row.node_id);
  },

  async updateDescendantLevels(nodeId: string, newNodeLevel: number): Promise<void> {
    await db.execute(
      sql`WITH RECURSIVE subtree AS (
        SELECT node_id, parent_node_id, ${newNodeLevel}::int AS new_level
        FROM org_nodes WHERE node_id = ${nodeId}
        UNION ALL
        SELECT o.node_id, o.parent_node_id, s.new_level + 1
        FROM org_nodes o
        INNER JOIN subtree s ON o.parent_node_id = s.node_id
      )
      UPDATE org_nodes SET level = subtree.new_level, updated_at = now()
      FROM subtree
      WHERE org_nodes.node_id = subtree.node_id
        AND org_nodes.node_id != ${nodeId}`
    );
  },
};
