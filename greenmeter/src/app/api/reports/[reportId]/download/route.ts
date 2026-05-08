import { withApiHandler } from '@/middleware';
import { extractUuidParam } from '@/lib/params';
import { reportRepository } from '@/db/repositories/reportRepository';
import * as blobStorage from '@/lib/blobStorage';
import { AppError, ErrorCode } from '@/lib/errors';

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * GET /api/reports/[reportId]/download
 *
 * Returns a time-limited signed URL for downloading a generated report PDF.
 * The signed URL expires after 1 hour.
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const reportId = extractUuidParam(req, 3, 'report ID');

    const report = await reportRepository.findGeneratedReport(reportId, ctx.tenantId);
    if (!report) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Report not found',
        404
      );
    }

    if (report.status !== 'complete') {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Report is not ready for download (status: ${report.status})`,
        400
      );
    }

    // Extract blobPath from metadata, falling back to convention
    const metadata = report.metadata != null && typeof report.metadata === 'object' && !Array.isArray(report.metadata)
      ? (report.metadata as Record<string, unknown>)
      : null;
    const blobPath = (typeof metadata?.blobPath === 'string' ? metadata.blobPath : null)
      ?? `reports/${reportId}.pdf`;

    const downloadUrl = await blobStorage.getSignedUrl(
      ctx.tenantId,
      blobPath,
      SIGNED_URL_EXPIRY_SECONDS
    );

    // Sanitize report name for use as a filename
    const safeName = report.name.replace(/[<>:"/\\|?*]/g, '_');

    return {
      data: {
        downloadUrl,
        reportId,
        fileName: `${safeName}.pdf`,
        expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
