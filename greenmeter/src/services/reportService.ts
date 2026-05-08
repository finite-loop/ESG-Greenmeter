import { reportRepository } from '@/db/repositories/reportRepository';
import type { ReportParameterRow, CoverageSummary } from '@/db/repositories/reportRepository';
import { getReportTemplate } from '@/config/frameworks';
import type { ReportTemplate, ReportDisclosure, Framework } from '@/config/frameworks';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types for the structured rendered report
// ---------------------------------------------------------------------------

/** Display status for a single parameter's value in the report */
export type ValueStatus = 'reported' | 'not_reported' | 'not_applicable';

/** A single rendered parameter line item within a disclosure */
export interface RenderedParameter {
  paramId: string;
  code: string;
  name: string;
  unit: string;
  dataType: string;
  value: string | null;
  valueText: string | null;
  displayValue: string;
  status: ValueStatus;
  verified: boolean;
}

/** A rendered disclosure with populated parameters */
export interface RenderedDisclosure {
  id: string;
  name: string;
  description?: string;
  parameters: RenderedParameter[];
  /** Count of parameters with values */
  reported: number;
  /** Total parameters in this disclosure */
  total: number;
}

/** A rendered section with populated disclosures */
export interface RenderedSection {
  id: string;
  name: string;
  description?: string;
  pillar?: string;
  disclosures: RenderedDisclosure[];
  /** Count of parameters with values across all disclosures */
  reported: number;
  /** Total parameters across all disclosures */
  total: number;
}

/** The complete rendered report object */
export interface RenderedReport {
  framework: string;
  templateName: string;
  templateVersion: string;
  tenantId: string;
  periodId: string;
  fiscalYear: string;
  generatedAt: string;
  sections: RenderedSection[];
  /** Overall coverage stats */
  coverage: {
    reported: number;
    notReported: number;
    notApplicable: number;
    total: number;
    percentComplete: number;
  };
}

/** Coverage API response structure */
export interface CoverageResponse {
  framework: string;
  periodId: string;
  totalParams: number;
  hasValue: number;
  verified: number;
  notApplicable: number;
  percentComplete: number;
  warningThreshold: number;
  belowThreshold: boolean;
  sections: Array<{
    standardSection: string;
    totalParams: number;
    hasValue: number;
    verified: number;
    notApplicable: number;
    percentComplete: number;
  }>;
}

// ---------------------------------------------------------------------------
// Report Service
// ---------------------------------------------------------------------------

/**
 * Determines the display value and status for a parameter row.
 */
function resolveParameterDisplay(row: ReportParameterRow): {
  displayValue: string;
  status: ValueStatus;
} {
  // No value exists at all (LEFT JOIN yielded null valueId)
  if (row.valueId === null) {
    return { displayValue: 'Not Reported', status: 'not_reported' };
  }

  // Value exists but marked as not applicable
  if (row.notApplicable) {
    return { displayValue: 'Not Applicable', status: 'not_applicable' };
  }

  // Value exists — display it
  if (row.value !== null) {
    return { displayValue: row.value, status: 'reported' };
  }
  if (row.valueText !== null) {
    return { displayValue: row.valueText, status: 'reported' };
  }

  // Value record exists but both value and valueText are null
  return { displayValue: 'Not Reported', status: 'not_reported' };
}

/**
 * Matches a parameter row to a disclosure based on standardSection and optional filters.
 */
function matchesDisclosure(
  row: ReportParameterRow,
  disclosure: ReportDisclosure
): boolean {
  if (row.standardSection !== disclosure.standardSection) {
    return false;
  }
  if (disclosure.indicatorType && row.indicatorType !== disclosure.indicatorType) {
    return false;
  }
  if (disclosure.category && row.category !== disclosure.category) {
    return false;
  }
  return true;
}

export const reportService = {
  /**
   * Renders a structured report by filling a framework template with KPI values
   * for a given tenant, period, and node.
   *
   * @param framework - Framework identifier ('BRSR', 'ESRS', 'GRI', 'IFRS_S2')
   * @param tenantId - Tenant UUID (from session)
   * @param periodId - Reporting period UUID
   * @param nodeId - Organization node UUID (typically the root company node)
   * @returns A fully populated RenderedReport
   */
  async renderReport(
    framework: string,
    tenantId: string,
    periodId: string,
    nodeId: string
  ): Promise<RenderedReport> {
    // Validate framework
    const template = getReportTemplate(framework);
    if (!template) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Unknown framework: ${framework}`,
        400
      );
    }

    // Validate period belongs to tenant
    const period = await reportRepository.findPeriodById(periodId, tenantId);
    if (!period) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Reporting period not found for this tenant',
        404
      );
    }

    // Fetch all parameters for this framework + tenant, joined with values
    const parameterRows = await reportRepository.findParametersForReport(
      tenantId,
      framework,
      periodId,
      nodeId
    );

    logger.info('Report rendering started', {
      framework,
      periodId,
      parameterCount: parameterRows.length,
    });

    // Build the rendered report by matching parameters to template disclosures
    let totalReported = 0;
    let totalNotReported = 0;
    let totalNotApplicable = 0;

    const renderedSections: RenderedSection[] = template.sections.map((section) => {
      let sectionReported = 0;
      let sectionTotal = 0;

      const renderedDisclosures: RenderedDisclosure[] = section.disclosures.map(
        (disclosure) => {
          // Find all parameter rows that match this disclosure
          const matchingRows = parameterRows.filter((row) =>
            matchesDisclosure(row, disclosure)
          );

          const renderedParams: RenderedParameter[] = matchingRows.map((row) => {
            const { displayValue, status } = resolveParameterDisplay(row);

            if (status === 'reported') totalReported++;
            else if (status === 'not_applicable') totalNotApplicable++;
            else totalNotReported++;

            return {
              paramId: row.paramId,
              code: row.code,
              name: row.name,
              unit: row.unit,
              dataType: row.dataType,
              value: row.value,
              valueText: row.valueText,
              displayValue,
              status,
              verified: row.verified ?? false,
            };
          });

          const disclosureReported = renderedParams.filter(
            (p) => p.status === 'reported'
          ).length;

          sectionReported += disclosureReported;
          sectionTotal += renderedParams.length;

          return {
            id: disclosure.id,
            name: disclosure.name,
            description: disclosure.description,
            parameters: renderedParams,
            reported: disclosureReported,
            total: renderedParams.length,
          };
        }
      );

      return {
        id: section.id,
        name: section.name,
        description: section.description,
        pillar: section.pillar,
        disclosures: renderedDisclosures,
        reported: sectionReported,
        total: sectionTotal,
      };
    });

    const grandTotal = totalReported + totalNotReported + totalNotApplicable;
    const percentComplete =
      grandTotal > 0
        ? Math.round((totalReported / grandTotal) * 100)
        : 0;

    const renderedReport: RenderedReport = {
      framework,
      templateName: template.name,
      templateVersion: template.version,
      tenantId,
      periodId,
      fiscalYear: period.fiscalYear,
      generatedAt: new Date().toISOString(),
      sections: renderedSections,
      coverage: {
        reported: totalReported,
        notReported: totalNotReported,
        notApplicable: totalNotApplicable,
        total: grandTotal,
        percentComplete,
      },
    };

    // Warn about parameters that didn't match any template disclosure
    const matchedParamIds = new Set(
      renderedSections.flatMap((s) =>
        s.disclosures.flatMap((d) => d.parameters.map((p) => p.paramId))
      )
    );
    const unmatchedRows = parameterRows.filter(
      (r) => !matchedParamIds.has(r.paramId)
    );
    if (unmatchedRows.length > 0) {
      logger.warn('Parameters not matched to any template disclosure', {
        framework,
        unmatchedCount: unmatchedRows.length,
        unmatchedSections: [
          ...new Set(unmatchedRows.map((r) => r.standardSection)),
        ],
      });
    }

    logger.info('Report rendering complete', {
      framework,
      coverage: renderedReport.coverage,
    });

    return renderedReport;
  },

  /**
   * Computes coverage summary for a given framework, tenant, and period.
   * Includes per-section breakdown and warning threshold from tenant config.
   *
   * @param framework - Framework identifier ('BRSR', 'ESRS', 'GRI', 'IFRS_S2')
   * @param tenantId - Tenant UUID (from session)
   * @param periodId - Reporting period UUID
   * @returns Coverage summary with threshold info
   */
  async getCoverage(
    framework: string,
    tenantId: string,
    periodId: string
  ): Promise<CoverageResponse> {
    // Validate framework
    const template = getReportTemplate(framework);
    if (!template) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Unknown framework: ${framework}`,
        400
      );
    }

    // Validate period belongs to tenant
    const period = await reportRepository.findPeriodById(periodId, tenantId);
    if (!period) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Reporting period not found for this tenant',
        404
      );
    }

    // Fetch coverage data and warning threshold in parallel
    const [summary, warningThreshold] = await Promise.all([
      reportRepository.getCoverageSummary(tenantId, framework, periodId),
      reportRepository.getCoverageWarningThreshold(tenantId),
    ]);

    logger.info('Coverage computed', {
      framework,
      periodId,
      totalParams: summary.totalParams,
      percentComplete: summary.percentComplete,
      warningThreshold,
    });

    return {
      framework,
      periodId,
      totalParams: summary.totalParams,
      hasValue: summary.hasValue,
      verified: summary.verified,
      notApplicable: summary.notApplicable,
      percentComplete: summary.percentComplete,
      warningThreshold,
      belowThreshold: summary.percentComplete < warningThreshold,
      sections: summary.sections.map((s) => ({
        standardSection: s.standardSection,
        totalParams: s.totalParams,
        hasValue: s.hasValue,
        verified: s.verified,
        notApplicable: s.notApplicable,
        percentComplete:
          s.totalParams > 0
            ? Math.round(((s.hasValue + s.notApplicable) / s.totalParams) * 100)
            : 0,
      })),
    };
  },
};
