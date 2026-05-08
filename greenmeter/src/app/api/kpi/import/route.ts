import { withApiHandler } from '@/middleware';
import { excelImportService } from '@/services/excelImportService';
import { importPreviewMetadataSchema, MAX_IMPORT_FILE_SIZE } from '@/schemas/kpiImport';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * POST /api/kpi/import — Upload Excel and return preview of matched/unmatched rows.
 *
 * Accepts multipart/form-data with:
 *   - file: .xlsx file (max 10MB)
 *   - nodeId: UUID of the org node
 *   - periodId: UUID of the reporting period
 *
 * Returns preview rows with match status. Does NOT insert data.
 */
export const POST = withApiHandler(
  async (req, ctx) => {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'No Excel file provided. Use form field "file".',
        400
      );
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `File size exceeds ${MAX_IMPORT_FILE_SIZE / (1024 * 1024)} MB limit`,
        400
      );
    }

    // Parse metadata
    const metadataRaw = {
      nodeId: formData.get('nodeId') as string | null,
      periodId: formData.get('periodId') as string | null,
    };

    const parsed = importPreviewMetadataSchema.safeParse(metadataRaw);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid import metadata',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await excelImportService.preview(
      ctx.tenantId,
      parsed.data.nodeId,
      parsed.data.periodId,
      {
        name: file.name,
        type: file.type,
        size: file.size,
        buffer,
      }
    );

    return { data: preview };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
