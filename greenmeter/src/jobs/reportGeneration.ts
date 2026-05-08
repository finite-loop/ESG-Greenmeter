import type { Job } from 'pg-boss';
import type { JobResult } from '@/lib/pgBoss';
import { reportProgress } from '@/lib/pgBoss';
import { reportService } from '@/services/reportService';
import { reportRepository } from '@/db/repositories/reportRepository';
import { generatePdfFromReport } from '@/lib/pdfGenerator';
import * as blobStorage from '@/lib/blobStorage';
import { logger } from '@/lib/logger';

export interface ReportGenerationJobData {
  tenantId: string;
  reportId: string;
  framework: string;
  periodId: string;
  nodeId: string;
}

export interface ReportGenerationJobResult {
  reportId: string;
  blobPath: string;
  fileSize: number;
  coverage: {
    reported: number;
    total: number;
    percentComplete: number;
  };
}

export async function handleReportGeneration(
  jobs: Job<ReportGenerationJobData>[]
): Promise<JobResult<ReportGenerationJobResult>[]> {
  const results: JobResult<ReportGenerationJobResult>[] = [];

  for (const job of jobs) {
    // Accumulated metadata — preserves fields across stages and on failure
    const progressMetadata: Record<string, unknown> = {};

    try {
      const { tenantId, reportId, framework, periodId, nodeId } = job.data;

      // Helper to update progress stage in both pg-boss and the report record
      async function updateStage(
        stage: string,
        progress: number,
        message: string
      ): Promise<void> {
        progressMetadata.progressStage = stage;
        progressMetadata.progressPercent = progress;
        progressMetadata.progressMessage = message;

        await reportProgress('report-generation', job.id, {
          stage,
          progress,
          message,
        });

        await reportRepository.updateGeneratedReport(reportId, tenantId, {
          metadata: { ...progressMetadata },
        });
      }

      // Stage 1: Initializing
      await reportRepository.updateGeneratedReport(reportId, tenantId, {
        status: 'generating',
      });
      await updateStage('initializing', 0, 'Starting report generation');

      // Stage 2: Rendering template with data
      await updateStage('rendering', 20, 'Populating template with KPI data');

      const renderedReport = await reportService.renderReport(
        framework,
        tenantId,
        periodId,
        nodeId
      );

      // Stage 3: Generating PDF
      await updateStage('generating_pdf', 50, 'Generating PDF document');

      const pdfBuffer = await generatePdfFromReport(renderedReport);
      const fileSize = pdfBuffer.length;

      logger.info('PDF generated', {
        reportId,
        framework,
        fileSize,
      });

      // Stage 4: Uploading to Blob Storage
      await updateStage('uploading', 75, 'Uploading PDF to storage');

      const blobPath = `reports/${reportId}.pdf`;
      const blobUrl = await blobStorage.upload(
        tenantId,
        blobPath,
        pdfBuffer,
        'application/pdf'
      );

      // Stage 5: Finalizing
      await updateStage('finalizing', 90, 'Saving report metadata');

      await reportRepository.updateGeneratedReport(reportId, tenantId, {
        status: 'complete',
        blobUrl,
        metadata: {
          ...progressMetadata,
          coverage: renderedReport.coverage,
          sectionCount: renderedReport.sections.length,
          renderedAt: renderedReport.generatedAt,
          blobPath,
          fileSize,
          progressStage: 'complete',
          progressPercent: 100,
          progressMessage: 'Report generation complete',
        },
        generatedAt: new Date(),
      });

      // Notify pg-boss of completion stage
      await reportProgress('report-generation', job.id, {
        stage: 'complete',
        progress: 100,
        message: 'Report generation complete',
      });

      logger.info('Report generation job completed', {
        reportId,
        framework,
        fileSize,
        blobPath,
        coverage: renderedReport.coverage,
      });

      results.push({
        success: true,
        result: {
          reportId,
          blobPath,
          fileSize,
          coverage: {
            reported: renderedReport.coverage.reported,
            total: renderedReport.coverage.total,
            percentComplete: renderedReport.coverage.percentComplete,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Report generation job failed', {
        jobId: job.id,
        error: message,
      });

      // Try to mark the report as failed, merging with accumulated metadata
      try {
        const { reportId, tenantId } = job.data;
        if (reportId && tenantId) {
          await reportRepository.updateGeneratedReport(reportId, tenantId, {
            status: 'failed',
            metadata: {
              ...progressMetadata,
              error: 'Report generation failed. Check system logs for details.',
              progressStage: 'failed',
            },
          });
        }
      } catch (updateErr: unknown) {
        logger.error('Failed to update report status to failed', {
          error: updateErr instanceof Error ? updateErr.message : String(updateErr),
        });
      }

      results.push({ success: false, error: message });
    }
  }

  return results;
}
