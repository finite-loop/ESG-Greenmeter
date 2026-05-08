import { db } from '@/db';
import { recommendations } from '@/db/schema/config';
import { eq, desc, sql } from 'drizzle-orm';

export interface RecommendationRow {
  recommendationId: string;
  tenantId: string;
  paramId: string | null;
  metric: string;
  recommendationText: string;
  priority: string;
  confidence: string | null;
  source: string;
  currentValue: string | null;
  thresholdValue: string | null;
  pillar: string | null;
  category: string | null;
  createdAt: Date;
}

export interface RecommendationInsert {
  tenantId: string;
  paramId?: string | null;
  metric: string;
  recommendationText: string;
  priority: string;
  confidence?: number | null;
  source: 'rule' | 'llm';
  currentValue?: number | null;
  thresholdValue?: number | null;
  pillar?: string | null;
  category?: string | null;
}

export const recommendationRepository = {
  /**
   * Get top N recommendations for a tenant, ordered by priority then recency.
   */
  async getByTenant(
    tenantId: string,
    limit = 20
  ): Promise<RecommendationRow[]> {
    const rows = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.tenantId, tenantId))
      .orderBy(
        sql`CASE ${recommendations.priority}
          WHEN 'critical' THEN 0
          WHEN 'warning' THEN 1
          WHEN 'info' THEN 2
          ELSE 3
        END`,
        desc(recommendations.createdAt)
      )
      .limit(limit);

    return rows as RecommendationRow[];
  },

  /**
   * Insert multiple recommendations in a batch.
   */
  async insertBatch(items: RecommendationInsert[]): Promise<number> {
    if (items.length === 0) return 0;

    const CHUNK_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const values = chunk.map((item) => ({
        tenantId: item.tenantId,
        paramId: item.paramId ?? null,
        metric: item.metric,
        recommendationText: item.recommendationText,
        priority: item.priority,
        confidence: item.confidence != null ? String(item.confidence) : null,
        source: item.source,
        currentValue: item.currentValue != null ? String(item.currentValue) : null,
        thresholdValue: item.thresholdValue != null ? String(item.thresholdValue) : null,
        pillar: item.pillar ?? null,
        category: item.category ?? null,
      }));

      const inserted = await db
        .insert(recommendations)
        .values(values)
        .returning({ id: recommendations.recommendationId });
      totalInserted += inserted.length;
    }

    return totalInserted;
  },

  /**
   * Delete all recommendations for a tenant (used before nightly refresh).
   */
  async deleteByTenant(tenantId: string): Promise<number> {
    const deleted = await db
      .delete(recommendations)
      .where(eq(recommendations.tenantId, tenantId))
      .returning({ id: recommendations.recommendationId });

    return deleted.length;
  },
};
