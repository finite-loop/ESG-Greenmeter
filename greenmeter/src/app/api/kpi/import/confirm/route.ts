import { withApiHandler } from '@/middleware';
import { excelImportService } from '@/services/excelImportService';
import { importConfirmSchema } from '@/schemas/kpiImport';
import { recordAudit } from '@/middleware/audit';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * POST /api/kpi/import/confirm — Confirm and execute the import.
 *
 * Accepts JSON body with selected rows from the preview.
 * Each imported value is individually audit-logged.
 */
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

    const parsed = importConfirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid import confirmation payload',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { nodeId, periodId, filename, rows } = parsed.data;

    const result = await excelImportService.confirm(
      ctx.tenantId,
      ctx.userId,
      nodeId,
      periodId,
      filename,
      rows
    );

    // AC #6: Per-value audit logging — each imported value logged individually
    for (const r of result.results) {
      if (r.status !== 'success' || !r.valueId) continue;
      const matchingRow = rows.find((row) => row.rowIndex === r.rowIndex);
      try {
        await recordAudit(ctx, {
          entityType: 'kpi_value',
          entityId: r.valueId,
          newValue: {
            paramId: matchingRow?.paramId,
            value: matchingRow?.value,
            unit: matchingRow?.unit,
            sourceType: 'import',
            sourceRef: filename,
          },
        });
      } catch (auditErr: unknown) {
        logger.error('Per-value audit failed', {
          valueId: r.valueId,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        });
      }
    }

    return {
      data: result,
      _audit: {
        entityType: 'kpi_import',
        entityId: filename,
        newValue: {
          filename,
          nodeId,
          periodId,
          totalRows: rows.length,
          imported: result.imported,
          failed: result.failed,
          valueIds: result.results
            .filter((r) => r.status === 'success')
            .map((r) => r.valueId),
        },
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
