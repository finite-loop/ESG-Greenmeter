import { db } from '@/db';
import { kpiValues, kpiParameters } from '@/db/schema/kpi';
import { reportTemplates, generatedReports } from '@/db/schema/reports';
import { reportingPeriods, orgNodes } from '@/db/schema/tenants';
import { tenantConfig } from '@/db/schema/config';
import { eq, and, asc, sql } from 'drizzle-orm';

/** Row returned when querying parameters joined with their values for report rendering. */
export interface ReportParameterRow {
  paramId: string;
  code: string;
  name: string;
  pillar: string;
  unit: string;
  dataType: string;
  category: string | null;
  standardSection: string;
  indicatorType: string | null;
  disclosure: string | null;
  valueId: string | null;
  value: string | null;
  valueText: string | null;
  verified: boolean | null;
  notApplicable: boolean | null;
}

/** Per-section coverage breakdown row. */
export interface CoverageSectionRow {
  standardSection: string;
  totalParams: number;
  hasValue: number;
  verified: number;
  notApplicable: number;
}

/** Full coverage summary with overall totals and per-section breakdown. */
export interface CoverageSummary {
  totalParams: number;
  hasValue: number;
  verified: number;
  notApplicable: number;
  percentComplete: number;
  sections: CoverageSectionRow[];
}

/** Row for a generated report record. */
export interface GeneratedReportRow {
  reportId: string;
  tenantId: string;
  templateId: string;
  periodId: string;
  name: string;
  status: string | null;
  format: string | null;
  blobUrl: string | null;
  metadata: unknown;
  generatedBy: string | null;
  generatedAt: Date | null;
  createdAt: Date;
}

export const reportRepository = {
  /**
   * Fetches all parameters for a given framework (standard) and tenant,
   * LEFT JOINed with kpi_values for the specified period and node.
   * Returns parameters in priority order, grouped by standardSection.
   */
  async findParametersForReport(
    tenantId: string,
    standard: string,
    periodId: string,
    nodeId: string
  ): Promise<ReportParameterRow[]> {
    const rows = await db
      .select({
        paramId: kpiParameters.paramId,
        code: kpiParameters.code,
        name: kpiParameters.name,
        pillar: kpiParameters.pillar,
        unit: kpiParameters.unit,
        dataType: kpiParameters.dataType,
        category: kpiParameters.category,
        standardSection: kpiParameters.standardSection,
        indicatorType: kpiParameters.indicatorType,
        disclosure: kpiParameters.disclosure,
        valueId: kpiValues.valueId,
        value: kpiValues.value,
        valueText: kpiValues.valueText,
        verified: kpiValues.verified,
        notApplicable: kpiValues.notApplicable,
      })
      .from(kpiParameters)
      .leftJoin(
        kpiValues,
        and(
          eq(kpiValues.paramId, kpiParameters.paramId),
          eq(kpiValues.periodId, periodId),
          eq(kpiValues.nodeId, nodeId)
        )
      )
      .where(
        and(
          eq(kpiParameters.tenantId, tenantId),
          eq(kpiParameters.standard, standard)
        )
      )
      .orderBy(
        asc(kpiParameters.standardSection),
        asc(kpiParameters.priorityOrder),
        asc(kpiParameters.code)
      );

    return rows as ReportParameterRow[];
  },

  /**
   * Finds a reporting period by ID and tenant.
   */
  async findPeriodById(
    periodId: string,
    tenantId: string
  ): Promise<{ periodId: string; fiscalYear: string; startDate: Date; endDate: Date; status: string | null } | null> {
    const rows = await db
      .select({
        periodId: reportingPeriods.periodId,
        fiscalYear: reportingPeriods.fiscalYear,
        startDate: reportingPeriods.startDate,
        endDate: reportingPeriods.endDate,
        status: reportingPeriods.status,
      })
      .from(reportingPeriods)
      .where(
        and(
          eq(reportingPeriods.periodId, periodId),
          eq(reportingPeriods.tenantId, tenantId)
        )
      )
      .limit(1);

    return (rows[0] as { periodId: string; fiscalYear: string; startDate: Date; endDate: Date; status: string | null } | undefined) ?? null;
  },

  /**
   * Finds a report template by standard. Prefers tenant-specific templates over platform defaults.
   */
  async findTemplateByStandard(
    standard: string,
    tenantId: string
  ): Promise<{ templateId: string; name: string; standard: string; version: string | null; structure: unknown } | null> {
    // Try tenant-specific first, then platform default (tenantId IS NULL)
    const rows = await db
      .select({
        templateId: reportTemplates.templateId,
        name: reportTemplates.name,
        standard: reportTemplates.standard,
        version: reportTemplates.version,
        structure: reportTemplates.structure,
      })
      .from(reportTemplates)
      .where(
        and(
          eq(reportTemplates.standard, standard),
          eq(reportTemplates.active, true),
          sql`(${reportTemplates.tenantId} = ${tenantId} OR ${reportTemplates.tenantId} IS NULL)`
        )
      )
      .orderBy(sql`CASE WHEN ${reportTemplates.tenantId} = ${tenantId} THEN 0 ELSE 1 END`)
      .limit(1);

    return (rows[0] as { templateId: string; name: string; standard: string; version: string | null; structure: unknown } | undefined) ?? null;
  },

  /**
   * Creates a report template record (platform-level or tenant-specific).
   */
  async createReportTemplate(input: {
    tenantId: string | null;
    name: string;
    standard: string;
    version: string;
  }): Promise<{ templateId: string; name: string; standard: string; version: string }> {
    const rows = await db
      .insert(reportTemplates)
      .values({
        tenantId: input.tenantId,
        name: input.name,
        standard: input.standard,
        version: input.version,
        active: true,
      })
      .returning({
        templateId: reportTemplates.templateId,
        name: reportTemplates.name,
        standard: reportTemplates.standard,
        version: reportTemplates.version,
      });

    return rows[0] as { templateId: string; name: string; standard: string; version: string };
  },

  /**
   * Creates a generated report record.
   */
  async createGeneratedReport(input: {
    tenantId: string;
    templateId: string;
    periodId: string;
    name: string;
    format: string;
    generatedBy: string;
    metadata?: Record<string, unknown>;
  }): Promise<GeneratedReportRow> {
    const rows = await db
      .insert(generatedReports)
      .values({
        tenantId: input.tenantId,
        templateId: input.templateId,
        periodId: input.periodId,
        name: input.name,
        format: input.format,
        generatedBy: input.generatedBy,
        metadata: input.metadata ?? null,
        status: 'pending',
      })
      .returning();

    return rows[0] as GeneratedReportRow;
  },

  /**
   * Updates a generated report's status and optionally the blob URL/metadata.
   */
  async updateGeneratedReport(
    reportId: string,
    tenantId: string,
    update: {
      status?: string;
      blobUrl?: string;
      metadata?: Record<string, unknown>;
      generatedAt?: Date;
    }
  ): Promise<GeneratedReportRow | null> {
    const setData: Record<string, unknown> = {};
    if (update.status !== undefined) setData.status = update.status;
    if (update.blobUrl !== undefined) setData.blobUrl = update.blobUrl;
    if (update.metadata !== undefined) setData.metadata = update.metadata;
    if (update.generatedAt !== undefined) setData.generatedAt = update.generatedAt;

    if (Object.keys(setData).length === 0) {
      return null;
    }

    const rows = await db
      .update(generatedReports)
      .set(setData)
      .where(
        and(
          eq(generatedReports.reportId, reportId),
          eq(generatedReports.tenantId, tenantId)
        )
      )
      .returning();

    return (rows[0] as GeneratedReportRow | undefined) ?? null;
  },

  /**
   * Finds an org node by ID and tenant, used to validate node ownership.
   */
  async findNodeById(
    nodeId: string,
    tenantId: string
  ): Promise<{ nodeId: string; name: string } | null> {
    const rows = await db
      .select({
        nodeId: orgNodes.nodeId,
        name: orgNodes.name,
      })
      .from(orgNodes)
      .where(
        and(
          eq(orgNodes.nodeId, nodeId),
          eq(orgNodes.tenantId, tenantId)
        )
      )
      .limit(1);

    return (rows[0] as { nodeId: string; name: string } | undefined) ?? null;
  },

  /**
   * Finds the root org node (nodeType = 'company', level = 0) for a tenant.
   */
  async findRootNode(tenantId: string): Promise<{ nodeId: string; name: string } | null> {
    const rows = await db
      .select({
        nodeId: orgNodes.nodeId,
        name: orgNodes.name,
      })
      .from(orgNodes)
      .where(
        and(
          eq(orgNodes.tenantId, tenantId),
          eq(orgNodes.nodeType, 'company'),
          eq(orgNodes.level, 0)
        )
      )
      .limit(1);

    return (rows[0] as { nodeId: string; name: string } | undefined) ?? null;
  },

  /**
   * Computes coverage summary for a given framework, tenant, period, and node.
   * Counts total parameters, parameters with values, verified, and not-applicable.
   * Returns overall totals and per-section breakdown.
   */
  async getCoverageSummary(
    tenantId: string,
    standard: string,
    periodId: string
  ): Promise<CoverageSummary> {
    const rows = await db
      .select({
        standardSection: kpiParameters.standardSection,
        totalParams: sql<number>`count(DISTINCT ${kpiParameters.paramId})::int`,
        hasValue: sql<number>`count(DISTINCT CASE WHEN ${kpiValues.valueId} IS NOT NULL AND (${kpiValues.value} IS NOT NULL OR ${kpiValues.valueText} IS NOT NULL) AND ${kpiValues.notApplicable} = false THEN ${kpiParameters.paramId} END)::int`,
        verified: sql<number>`count(DISTINCT CASE WHEN ${kpiValues.verified} = true THEN ${kpiParameters.paramId} END)::int`,
        notApplicable: sql<number>`count(DISTINCT CASE WHEN ${kpiValues.notApplicable} = true THEN ${kpiParameters.paramId} END)::int`,
      })
      .from(kpiParameters)
      .leftJoin(
        kpiValues,
        and(
          eq(kpiValues.paramId, kpiParameters.paramId),
          eq(kpiValues.tenantId, tenantId),
          eq(kpiValues.periodId, periodId)
        )
      )
      .where(
        and(
          sql`(${kpiParameters.tenantId} = ${tenantId} OR ${kpiParameters.tenantId} IS NULL)`,
          eq(kpiParameters.standard, standard)
        )
      )
      .groupBy(kpiParameters.standardSection)
      .orderBy(asc(kpiParameters.standardSection));

    const sections = rows as CoverageSectionRow[];

    // Compute overall totals
    const totalParams = sections.reduce((sum, s) => sum + s.totalParams, 0);
    const hasValue = sections.reduce((sum, s) => sum + s.hasValue, 0);
    const verified = sections.reduce((sum, s) => sum + s.verified, 0);
    const notApplicable = sections.reduce((sum, s) => sum + s.notApplicable, 0);
    const percentComplete =
      totalParams > 0
        ? Math.round(((hasValue + notApplicable) / totalParams) * 100)
        : 0;

    return {
      totalParams,
      hasValue,
      verified,
      notApplicable,
      percentComplete,
      sections,
    };
  },

  /**
   * Retrieves the coverage warning threshold from tenant_config.
   * Returns the configured threshold or the default (80).
   */
  async getCoverageWarningThreshold(tenantId: string): Promise<number> {
    const rows = await db
      .select({ value: tenantConfig.value })
      .from(tenantConfig)
      .where(
        and(
          eq(tenantConfig.tenantId, tenantId),
          eq(tenantConfig.key, 'coverage_warning_threshold')
        )
      )
      .limit(1);

    if (rows[0]?.value != null) {
      const raw = rows[0].value;
      const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed;
      }
    }
    return 80; // default threshold
  },

  /**
   * Finds a single generated report by ID and tenant.
   */
  async findGeneratedReport(
    reportId: string,
    tenantId: string
  ): Promise<GeneratedReportRow | null> {
    const rows = await db
      .select()
      .from(generatedReports)
      .where(
        and(
          eq(generatedReports.reportId, reportId),
          eq(generatedReports.tenantId, tenantId)
        )
      )
      .limit(1);

    return (rows[0] as GeneratedReportRow | undefined) ?? null;
  },

  /**
   * Lists generated reports for a tenant with optional filters.
   */
  async listGeneratedReports(
    tenantId: string,
    filters?: { standard?: string; periodId?: string; status?: string }
  ): Promise<GeneratedReportRow[]> {
    const conditions = [eq(generatedReports.tenantId, tenantId)];

    if (filters?.periodId) {
      conditions.push(eq(generatedReports.periodId, filters.periodId));
    }
    if (filters?.status) {
      conditions.push(eq(generatedReports.status, filters.status));
    }
    if (filters?.standard) {
      conditions.push(
        sql`${generatedReports.templateId} IN (
          SELECT ${reportTemplates.templateId} FROM ${reportTemplates}
          WHERE ${reportTemplates.standard} = ${filters.standard}
        )`
      );
    }

    const rows = await db
      .select()
      .from(generatedReports)
      .where(and(...conditions))
      .orderBy(sql`${generatedReports.createdAt} DESC`);

    return rows as GeneratedReportRow[];
  },
};
