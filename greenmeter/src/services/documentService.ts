import { documentRepository } from '@/db/repositories/documentRepository';
import type { DocumentRow, DocumentWithPeer } from '@/db/repositories/documentRepository';
import { peerRepository } from '@/db/repositories/peerRepository';
import { upload, deleteBlob } from '@/lib/blobStorage';
import { submitJob } from '@/jobs';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { MAX_DOCUMENT_SIZE } from '@/schemas/document';
import type { DocumentUpload, DocumentListFilter } from '@/schemas/document';
import { randomUUID } from 'crypto';

/**
 * Sanitizes a user-provided filename for safe use in blob storage paths.
 * Removes path separators, null bytes, and other dangerous characters.
 */
function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[/\\:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\.{2,}/g, '_')
    .trim();
  // Limit length to avoid exceeding Azure blob name segment limits
  const limited = sanitized.slice(0, 255);
  return limited || 'document.pdf';
}

export const documentService = {
  async upload(
    tenantId: string,
    userId: string,
    metadata: DocumentUpload,
    file: { name: string; type: string; size: number; buffer: Buffer }
  ): Promise<DocumentRow> {
    if (file.size > MAX_DOCUMENT_SIZE) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `File size exceeds ${MAX_DOCUMENT_SIZE / (1024 * 1024)} MB limit`,
        400
      );
    }

    if (file.type !== 'application/pdf') {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Only PDF files are accepted',
        400
      );
    }

    // Verify peer exists
    const peer = await peerRepository.findById(metadata.peerId);
    if (!peer) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Peer organisation not found',
        404
      );
    }

    // Pre-generate docId for use in both blob path and DB record
    const docId = randomUUID();
    const safeName = sanitizeFilename(file.name);
    const blobPath = `documents/${docId}/${safeName}`;

    // Upload to Azure Blob Storage
    const blobUrl = await upload(tenantId, blobPath, file.buffer, file.type);

    logger.info('Document uploaded to blob storage', {
      blobPath,
      fileSize: file.size,
      standard: metadata.standard,
    });

    // Create document record in database — clean up blob on failure
    let doc: DocumentRow;
    try {
      doc = await documentRepository.create({
        docId,
        tenantId,
        peerId: metadata.peerId,
        standard: metadata.standard,
        fiscalYear: metadata.fiscalYear,
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        blobPath,
        blobUrl,
        uploadedBy: userId,
      });
    } catch (err) {
      try {
        await deleteBlob(tenantId, blobPath);
      } catch (cleanupErr) {
        logger.error('Failed to clean up orphaned blob after DB insert failure', {
          blobPath,
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        });
      }
      throw err;
    }

    return doc;
  },

  async triggerExtraction(docId: string): Promise<{ jobId: string }> {
    // Atomically claim the document by transitioning pending -> processing.
    // This prevents race conditions where concurrent requests both pass
    // the status check and submit duplicate jobs.
    const claimed = await documentRepository.updateStatusIfCurrent(
      docId,
      'pending',
      'processing'
    );

    if (!claimed) {
      // Either the document doesn't exist or it wasn't in 'pending' status
      const existing = await documentRepository.findById(docId);
      if (!existing) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          'Document not found',
          404
        );
      }
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Document is already in "${existing.status}" status. Only pending documents can be triggered.`,
        400
      );
    }

    // Submit the job — revert status on failure
    let jobId: string | null;
    try {
      jobId = await submitJob('extraction-pipeline', {
        documentId: docId,
        tenantId: claimed.tenantId,
      });
    } catch (err) {
      await documentRepository.updateStatus(docId, 'pending').catch((revertErr) => {
        logger.error('Failed to revert document status after job submission failure', {
          docId,
          error: revertErr instanceof Error ? revertErr.message : String(revertErr),
        });
      });
      throw err;
    }

    if (!jobId) {
      await documentRepository.updateStatus(docId, 'pending').catch((revertErr) => {
        logger.error('Failed to revert document status after null jobId', {
          docId,
          error: revertErr instanceof Error ? revertErr.message : String(revertErr),
        });
      });
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'Failed to enqueue extraction job',
        500
      );
    }

    // Record the jobId on the document
    await documentRepository.updateStatus(docId, 'processing', { jobId });

    logger.info('Extraction job enqueued', {
      docId,
      jobId,
    });

    return { jobId };
  },

  async list(
    filters: DocumentListFilter
  ): Promise<{ data: DocumentWithPeer[]; meta: { page: number; pageSize: number; total: number } }> {
    const result = await documentRepository.findAllByTenant(filters);

    return {
      data: result.data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },

  async getById(docId: string): Promise<DocumentRow> {
    const doc = await documentRepository.findById(docId);
    if (!doc) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Document not found',
        404
      );
    }
    return doc;
  },
};
