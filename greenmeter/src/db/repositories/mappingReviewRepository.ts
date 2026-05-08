import { db } from '@/db';
import { extractedMetrics, peerKpiValues, rawExtractions, documents } from '@/db/schema/extraction';
import { metricAliases } from '@/db/schema/mapping';
import { kpiParameters } from '@/db/schema/kpi';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';

export interface FlaggedMetricRow {
  metricId: string;
  extractionId: string;
  standard: string;
  section: string | null;
  metricName: string;
  metricValue: string | null;
  parsedValue: string | null;
  unit: string | null;
  paramId: string | null;
  mappingConfidence: string | null;
  mappingMethod: string | null;
  mappingStatus: string | null;
  suggestedParamName: string | null;
  suggestedParamCode: string | null;
}

export interface MappingUpdateFields {
  paramId?: string | null;
  mappingStatus: string;
  mappingMethod: string;
  mappedBy: string;
  mappedAt: Date;
  mappingConfidence: string;
}

export interface ExtractionSummary {
  extractionId: string;
  standard: string;
  companyName: string | null;
  metricCount: number | null;
  mappedCount: number | null;
  status: string | null;
  extractedAt: Date | null;
}

export const mappingReviewRepository = {
  /**
   * Finds metrics for a given extraction for review.
   * Includes unmapped, unmatched, auto_mapped (which covers auto_mapped_review
   * since the DB stores both under 'auto_mapped'), and manual_mapped.
   */
  async findFlaggedMetrics(extractionId: string): Promise<FlaggedMetricRow[]> {
    const rows = await db
      .select({
        metricId: extractedMetrics.metricId,
        extractionId: extractedMetrics.extractionId,
        standard: extractedMetrics.standard,
        section: extractedMetrics.section,
        metricName: extractedMetrics.metricName,
        metricValue: extractedMetrics.metricValue,
        parsedValue: extractedMetrics.parsedValue,
        unit: extractedMetrics.unit,
        paramId: extractedMetrics.paramId,
        mappingConfidence: extractedMetrics.mappingConfidence,
        mappingMethod: extractedMetrics.mappingMethod,
        mappingStatus: extractedMetrics.mappingStatus,
        suggestedParamName: kpiParameters.name,
        suggestedParamCode: kpiParameters.code,
      })
      .from(extractedMetrics)
      .leftJoin(kpiParameters, eq(extractedMetrics.paramId, kpiParameters.paramId))
      .where(
        and(
          eq(extractedMetrics.extractionId, extractionId),
          inArray(extractedMetrics.mappingStatus, [
            'unmapped',
            'unmatched',
            'auto_mapped',
            'manual_mapped',
          ])
        )
      )
      .orderBy(extractedMetrics.metricName);

    return rows as FlaggedMetricRow[];
  },

  /**
   * Updates a single extracted metric's mapping fields.
   */
  async updateMetricMapping(
    metricId: string,
    fields: MappingUpdateFields,
    tx?: unknown
  ): Promise<void> {
    const conn = (tx ?? db) as typeof db;
    const setFields: Record<string, unknown> = {
      mappingStatus: fields.mappingStatus,
      mappingMethod: fields.mappingMethod,
      mappedBy: fields.mappedBy,
      mappedAt: fields.mappedAt,
      mappingConfidence: fields.mappingConfidence,
    };
    if (fields.paramId !== undefined) {
      setFields.paramId = fields.paramId;
    }
    await conn
      .update(extractedMetrics)
      .set(setFields)
      .where(eq(extractedMetrics.metricId, metricId));
  },

  /**
   * Finds a single extracted metric by ID.
   */
  async findMetricById(metricId: string): Promise<{
    metricId: string;
    extractionId: string;
    tenantId: string;
    standard: string;
    metricName: string;
    metricValue: string | null;
    parsedValue: string | null;
    unit: string | null;
    paramId: string | null;
    mappingStatus: string | null;
  } | null> {
    const rows = await db
      .select({
        metricId: extractedMetrics.metricId,
        extractionId: extractedMetrics.extractionId,
        tenantId: extractedMetrics.tenantId,
        standard: extractedMetrics.standard,
        metricName: extractedMetrics.metricName,
        metricValue: extractedMetrics.metricValue,
        parsedValue: extractedMetrics.parsedValue,
        unit: extractedMetrics.unit,
        paramId: extractedMetrics.paramId,
        mappingStatus: extractedMetrics.mappingStatus,
      })
      .from(extractedMetrics)
      .where(eq(extractedMetrics.metricId, metricId))
      .limit(1);

    return rows[0] ?? null;
  },

  /**
   * Inserts a metric alias. ON CONFLICT (paramId, aliasText) DO NOTHING.
   * Returns true if a row was inserted, false if conflict (already existed).
   */
  async insertAlias(
    paramId: string,
    aliasText: string,
    standard: string | null,
    tx?: unknown
  ): Promise<boolean> {
    const conn = (tx ?? db) as typeof db;
    const rows = await conn
      .insert(metricAliases)
      .values({
        paramId,
        aliasText,
        standard,
      })
      .onConflictDoNothing({
        target: [metricAliases.paramId, metricAliases.aliasText],
      })
      .returning({ aliasId: metricAliases.aliasId });

    return rows.length > 0;
  },

  /**
   * Creates a peer_kpi_values entry for a confirmed/reassigned mapping.
   */
  async upsertPeerKpiValue(
    data: {
      tenantId: string;
      peerId: string;
      paramId: string;
      canonicalId: string | null;
      fiscalYear: string | null;
      value: string | null;
      unit: string | null;
      sourceExtractionId: string;
      sourceMetricId: string;
      confidence: string;
    },
    tx?: unknown
  ): Promise<void> {
    const conn = (tx ?? db) as typeof db;
    await conn
      .insert(peerKpiValues)
      .values({
        tenantId: data.tenantId,
        peerId: data.peerId,
        paramId: data.paramId,
        canonicalId: data.canonicalId,
        fiscalYear: data.fiscalYear,
        value: data.value,
        unit: data.unit,
        sourceExtractionId: data.sourceExtractionId,
        sourceMetricId: data.sourceMetricId,
        confidence: data.confidence,
        verified: false,
      })
      .onConflictDoNothing();
  },

  /**
   * Deletes peer_kpi_values rows sourced from a specific metric.
   * Used when reassigning or rejecting a previously-mapped metric.
   */
  async deletePeerKpiValueByMetric(
    sourceMetricId: string,
    tx?: unknown
  ): Promise<void> {
    const conn = (tx ?? db) as typeof db;
    await conn
      .delete(peerKpiValues)
      .where(eq(peerKpiValues.sourceMetricId, sourceMetricId));
  },

  /**
   * Finds the extraction record to get peerId, fiscalYear, etc.
   */
  async findExtraction(extractionId: string): Promise<{
    extractionId: string;
    tenantId: string;
    docId: string | null;
    standard: string;
    fiscalYear: string | null;
  } | null> {
    const rows = await db
      .select({
        extractionId: rawExtractions.extractionId,
        tenantId: rawExtractions.tenantId,
        docId: rawExtractions.docId,
        standard: rawExtractions.standard,
        fiscalYear: rawExtractions.fiscalYear,
      })
      .from(rawExtractions)
      .where(eq(rawExtractions.extractionId, extractionId))
      .limit(1);

    return rows[0] ?? null;
  },

  /**
   * Gets peerId from the document associated with the extraction.
   */
  async findPeerIdByDocId(docId: string): Promise<string | null> {
    const rows = await db
      .select({ peerId: documents.peerId })
      .from(documents)
      .where(eq(documents.docId, docId))
      .limit(1);

    return rows[0]?.peerId ?? null;
  },

  /**
   * Finds canonical_id for a given param_id.
   */
  async findCanonicalId(paramId: string): Promise<string | null> {
    const rows = await db
      .select({ canonicalId: kpiParameters.canonicalId })
      .from(kpiParameters)
      .where(eq(kpiParameters.paramId, paramId))
      .limit(1);

    return rows[0]?.canonicalId ?? null;
  },

  /**
   * Updates mapped_count on the raw_extractions record.
   */
  async updateExtractionMappedCount(
    extractionId: string,
    tx?: unknown
  ): Promise<void> {
    const conn = (tx ?? db) as typeof db;
    const countResult = await conn
      .select({ count: sql<number>`count(*)::int` })
      .from(extractedMetrics)
      .where(
        and(
          eq(extractedMetrics.extractionId, extractionId),
          inArray(extractedMetrics.mappingStatus, ['auto_mapped', 'manual_mapped'])
        )
      );

    const mappedCount = countResult[0]?.count ?? 0;

    await conn
      .update(rawExtractions)
      .set({ mappedCount })
      .where(eq(rawExtractions.extractionId, extractionId));
  },

  /**
   * Finds the most recent extraction for a given document.
   */
  async findExtractionByDocId(docId: string): Promise<ExtractionSummary | null> {
    const rows = await db
      .select({
        extractionId: rawExtractions.extractionId,
        standard: rawExtractions.standard,
        companyName: rawExtractions.companyName,
        metricCount: rawExtractions.metricCount,
        mappedCount: rawExtractions.mappedCount,
        status: rawExtractions.status,
        extractedAt: rawExtractions.extractedAt,
      })
      .from(rawExtractions)
      .where(eq(rawExtractions.docId, docId))
      .orderBy(desc(rawExtractions.extractedAt))
      .limit(1);

    return rows[0] ?? null;
  },

  /**
   * Returns the db instance for transaction usage.
   */
  get db() {
    return db;
  },
};
