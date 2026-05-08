import { withApiHandler } from '@/middleware';
import { documentService } from '@/services/documentService';
import { documentUploadSchema, documentListFilterSchema, MAX_DOCUMENT_SIZE } from '@/schemas/document';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = documentListFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await documentService.list(parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

export const POST = withApiHandler(
  async (req, ctx) => {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'No PDF file provided. Use form field "file".',
        400
      );
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `File size exceeds ${MAX_DOCUMENT_SIZE / (1024 * 1024)} MB limit`,
        400
      );
    }

    // Parse metadata from form fields
    const metadataRaw = {
      peerId: formData.get('peerId') as string | null,
      standard: formData.get('standard') as string | null,
      fiscalYear: formData.get('fiscalYear') as string | null,
    };

    const parsed = documentUploadSchema.safeParse(metadataRaw);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid upload metadata',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const doc = await documentService.upload(
      ctx.tenantId,
      ctx.userId,
      parsed.data,
      {
        name: file.name,
        type: file.type,
        size: file.size,
        buffer,
      }
    );

    return {
      data: doc,
      _audit: {
        entityType: 'document',
        entityId: doc.docId,
        newValue: {
          docId: doc.docId,
          filename: doc.filename,
          standard: doc.standard,
          peerId: doc.peerId,
          fiscalYear: doc.fiscalYear,
        },
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
