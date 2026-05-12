import { withApiHandler } from '@/middleware';
import { reportGenerateByFrameworkSchema } from '@/schemas/reports';
import { reportRepository } from '@/db/repositories/reportRepository';
import { getReportTemplate } from '@/config/frameworks';
import { submitJob } from '@/jobs';
import { AppError, ErrorCode } from '@/lib/errors';
import type { ReportGenerationJobData } from '@/jobs/reportGeneration';

/**
 * POST /api/reports/generate
 *
 * Accepts { framework, periodId, nodeId?, format? }.
 * Validates framework and period, creates a generated_reports record,
 * enqueues a report-generation job, and returns the jobId + reportId.
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

    const parsed = reportGenerateByFrameworkSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid report generation parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { framework, periodId, nodeId: requestedNodeId, format } = parsed.data;

    // Validate framework has a template
    const template = getReportTemplate(framework);
    if (!template) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `No report template available for framework: ${framework}`,
        400
      );
    }

    // Validate period belongs to this tenant
    const period = await reportRepository.findPeriodById(periodId, ctx.tenantId);
    if (!period) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Reporting period not found',
        404
      );
    }

    // Resolve node: use provided nodeId or fall back to root company node
    let nodeId = requestedNodeId;
    if (nodeId) {
      // Validate that the provided nodeId belongs to this tenant
      const node = await reportRepository.findNodeById(nodeId, ctx.tenantId);
      if (!node) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          'Organization node not found',
          404
        );
      }
    } else {
      const rootNode = await reportRepository.findRootNode(ctx.tenantId);
      if (!rootNode) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          'No root organization node found. Complete onboarding first.',
          404
        );
      }
      nodeId = rootNode.nodeId;
    }

    // Find or use a default template record for this framework
    let templateRecord = await reportRepository.findTemplateByStandard(framework, ctx.tenantId);

    // If no template record exists in the DB, create a tenant-scoped one from the static template config
    if (!templateRecord) {
      const created = await reportRepository.createReportTemplate({
        tenantId: ctx.tenantId,
        name: template.name,
        standard: framework,
        version: template.version,
      });
      templateRecord = {
        templateId: created.templateId,
        name: created.name,
        standard: created.standard,
        version: created.version,
        structure: null,
      };
    }

    // Create the generated_reports record
    const reportName = `${template.name} — ${period.fiscalYear}`;
    const report = await reportRepository.createGeneratedReport({
      tenantId: ctx.tenantId,
      templateId: templateRecord.templateId,
      periodId,
      name: reportName,
      format,
      generatedBy: ctx.userId,
      metadata: { framework },
    });

    // Enqueue the report-generation job (non-fatal if queue is unavailable)
    let jobId: string | null = null;
    try {
      jobId = await submitJob<ReportGenerationJobData>('report-generation', {
        tenantId: ctx.tenantId,
        reportId: report.reportId,
        framework,
        periodId,
        nodeId,
      });
    } catch {
      // pg-boss may not be running — report record is already created
    }

    return {
      data: {
        jobId: jobId ?? undefined,
        reportId: report.reportId,
        reportName,
        framework,
        periodId,
        status: 'pending',
      },
      _audit: {
        entityType: 'generated_report',
        entityId: report.reportId,
        newValue: {
          reportId: report.reportId,
          framework,
          periodId,
          format,
        },
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
