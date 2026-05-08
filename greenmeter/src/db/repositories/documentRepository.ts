import { db } from '@/db';
import { documents } from '@/db/schema/extraction';
import { peerOrganisations } from '@/db/schema/peers';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { DocumentListFilter } from '@/schemas/document';

export interface DocumentInsert {
  docId?: string;
  tenantId: string;
  peerId: string;
  standard: string;
  fiscalYear: string;
  filename: string;
  contentType: string;
  fileSize: number;
  blobPath: string;
  blobUrl?: string;
  uploadedBy: string;
}

export interface DocumentRow {
  docId: string;
  tenantId: string;
  peerId: string | null;
  standard: string;
  fiscalYear: string;
  filename: string;
  contentType: string;
  fileSize: number;
  blobPath: string;
  blobUrl: string | null;
  status: string;
  jobId: string | null;
  errorMessage: string | null;
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt: Date;
}

export interface DocumentWithPeer extends DocumentRow {
  peerName: string | null;
}

export const documentRepository = {
  async create(doc: DocumentInsert): Promise<DocumentRow> {
    const values: Record<string, unknown> = {
      tenantId: doc.tenantId,
      peerId: doc.peerId,
      standard: doc.standard,
      fiscalYear: doc.fiscalYear,
      filename: doc.filename,
      contentType: doc.contentType,
      fileSize: doc.fileSize,
      blobPath: doc.blobPath,
      blobUrl: doc.blobUrl ?? null,
      uploadedBy: doc.uploadedBy,
    };
    if (doc.docId) {
      values.docId = doc.docId;
    }

    const result = await db
      .insert(documents)
      .values(values as typeof documents.$inferInsert)
      .returning();

    return result[0] as DocumentRow;
  },

  async findById(docId: string): Promise<DocumentRow | null> {
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.docId, docId))
      .limit(1);

    return (result[0] as DocumentRow) ?? null;
  },

  async findAllByTenant(
    filters: DocumentListFilter
  ): Promise<{ data: DocumentWithPeer[]; total: number }> {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(documents.status, filters.status));
    }
    if (filters.peerId) {
      conditions.push(eq(documents.peerId, filters.peerId));
    }
    if (filters.standard) {
      conditions.push(eq(documents.standard, filters.standard));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [data, countResult] = await Promise.all([
      db
        .select({
          docId: documents.docId,
          tenantId: documents.tenantId,
          peerId: documents.peerId,
          standard: documents.standard,
          fiscalYear: documents.fiscalYear,
          filename: documents.filename,
          contentType: documents.contentType,
          fileSize: documents.fileSize,
          blobPath: documents.blobPath,
          blobUrl: documents.blobUrl,
          status: documents.status,
          jobId: documents.jobId,
          errorMessage: documents.errorMessage,
          uploadedBy: documents.uploadedBy,
          uploadedAt: documents.uploadedAt,
          updatedAt: documents.updatedAt,
          peerName: peerOrganisations.name,
        })
        .from(documents)
        .leftJoin(peerOrganisations, eq(documents.peerId, peerOrganisations.peerId))
        .where(where)
        .orderBy(desc(documents.uploadedAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(where),
    ]);

    return {
      data: data as DocumentWithPeer[],
      total: countResult[0]?.count ?? 0,
    };
  },

  async updateStatus(
    docId: string,
    status: string,
    updates?: { jobId?: string; errorMessage?: string }
  ): Promise<DocumentRow | null> {
    const result = await db
      .update(documents)
      .set({
        status,
        jobId: updates?.jobId ?? undefined,
        errorMessage: updates?.errorMessage ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(documents.docId, docId))
      .returning();

    return (result[0] as DocumentRow) ?? null;
  },

  /**
   * Atomically transitions a document from expectedStatus to newStatus.
   * Returns the updated row if the CAS succeeded, or null if the document
   * was not found or was not in the expected status (prevents race conditions).
   */
  async updateStatusIfCurrent(
    docId: string,
    expectedStatus: string,
    newStatus: string,
    updates?: { jobId?: string; errorMessage?: string }
  ): Promise<DocumentRow | null> {
    const result = await db
      .update(documents)
      .set({
        status: newStatus,
        jobId: updates?.jobId ?? undefined,
        errorMessage: updates?.errorMessage ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.docId, docId), eq(documents.status, expectedStatus)))
      .returning();

    return (result[0] as DocumentRow) ?? null;
  },
};
