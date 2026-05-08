import { db } from '@/db';
import { suppliers, supplierAssessments } from '@/db/schema/supply-chain';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';
import type { SupplierListFilter } from '@/schemas/suppliers';

export interface SupplierInsert {
  tenantId: string;
  name: string;
  category?: string;
  sector?: string;
  country?: string;
  contactEmail?: string;
  contactName?: string;
}

export interface SupplierRow {
  supplierId: string;
  tenantId: string;
  name: string;
  category: string | null;
  sector: string | null;
  country: string | null;
  contactEmail: string | null;
  contactName: string | null;
  riskLevel: string | null;
  portalToken: string | null;
  riskScore: number | null;
  active: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentInsert {
  tenantId: string;
  supplierId: string;
  fiscalYear: string;
  overallScore?: string;
  environmentalScore?: string;
  socialScore?: string;
  governanceScore?: string;
  scope3Contribution?: string;
  surveyStatus?: string;
  surveyData?: unknown;
  assessedAt?: Date;
}

export interface AssessmentRow {
  assessmentId: string;
  tenantId: string;
  supplierId: string;
  fiscalYear: string;
  overallScore: string | null;
  environmentalScore: string | null;
  socialScore: string | null;
  governanceScore: string | null;
  scope3Contribution: string | null;
  surveyStatus: string | null;
  surveyData: unknown;
  assessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const supplierRepository = {
  async findAllByTenant(
    filters: SupplierListFilter
  ): Promise<{ data: SupplierRow[]; total: number }> {
    const conditions = [];

    if (filters.search) {
      const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
      conditions.push(ilike(suppliers.name, `%${escaped}%`));
    }
    if (filters.sector) {
      conditions.push(eq(suppliers.sector, filters.sector));
    }
    if (filters.category) {
      conditions.push(eq(suppliers.category, filters.category));
    }
    if (filters.riskLevel) {
      conditions.push(eq(suppliers.riskLevel, filters.riskLevel));
    }
    if (filters.active !== undefined) {
      conditions.push(eq(suppliers.active, filters.active));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const latestScoreSql = sql<number>`(
      SELECT sa.overall_score::float
      FROM supplier_assessments sa
      WHERE sa.supplier_id = ${suppliers.supplierId}
      ORDER BY sa.fiscal_year DESC
      LIMIT 1
    )`.as('risk_score');

    const [data, countResult] = await Promise.all([
      db
        .select({
          supplierId: suppliers.supplierId,
          tenantId: suppliers.tenantId,
          name: suppliers.name,
          category: suppliers.category,
          sector: suppliers.sector,
          country: suppliers.country,
          contactEmail: suppliers.contactEmail,
          contactName: suppliers.contactName,
          riskLevel: suppliers.riskLevel,
          portalToken: suppliers.portalToken,
          riskScore: latestScoreSql,
          active: suppliers.active,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
        })
        .from(suppliers)
        .where(where)
        .orderBy(desc(suppliers.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(suppliers)
        .where(where),
    ]);

    return {
      data: data as SupplierRow[],
      total: countResult[0]?.count ?? 0,
    };
  },

  async findById(supplierId: string): Promise<SupplierRow | null> {
    const latestScoreSql = sql<number>`(
      SELECT sa.overall_score::float
      FROM supplier_assessments sa
      WHERE sa.supplier_id = ${suppliers.supplierId}
      ORDER BY sa.fiscal_year DESC
      LIMIT 1
    )`.as('risk_score');

    const result = await db
      .select({
        supplierId: suppliers.supplierId,
        tenantId: suppliers.tenantId,
        name: suppliers.name,
        category: suppliers.category,
        sector: suppliers.sector,
        country: suppliers.country,
        contactEmail: suppliers.contactEmail,
        contactName: suppliers.contactName,
        riskLevel: suppliers.riskLevel,
        portalToken: suppliers.portalToken,
        riskScore: latestScoreSql,
        active: suppliers.active,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .where(eq(suppliers.supplierId, supplierId))
      .limit(1);

    return (result[0] as SupplierRow) ?? null;
  },

  async create(supplier: SupplierInsert): Promise<SupplierRow> {
    const result = await db
      .insert(suppliers)
      .values({
        tenantId: supplier.tenantId,
        name: supplier.name,
        category: supplier.category ?? null,
        sector: supplier.sector ?? null,
        country: supplier.country ?? null,
        contactEmail: supplier.contactEmail ?? null,
        contactName: supplier.contactName ?? null,
      })
      .returning();

    return result[0] as SupplierRow;
  },

  async update(
    supplierId: string,
    updates: Partial<Omit<SupplierInsert, 'tenantId'>> & {
      riskLevel?: string | null;
      active?: boolean;
    }
  ): Promise<SupplierRow | null> {
    const result = await db
      .update(suppliers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.supplierId, supplierId))
      .returning();

    return (result[0] as SupplierRow) ?? null;
  },

  async findAssessmentsBySupplier(
    supplierId: string
  ): Promise<AssessmentRow[]> {
    const result = await db
      .select()
      .from(supplierAssessments)
      .where(eq(supplierAssessments.supplierId, supplierId))
      .orderBy(desc(supplierAssessments.fiscalYear));

    return result as AssessmentRow[];
  },

  async findAssessment(
    supplierId: string,
    fiscalYear: string
  ): Promise<AssessmentRow | null> {
    const result = await db
      .select()
      .from(supplierAssessments)
      .where(
        and(
          eq(supplierAssessments.supplierId, supplierId),
          eq(supplierAssessments.fiscalYear, fiscalYear)
        )
      )
      .limit(1);

    return (result[0] as AssessmentRow) ?? null;
  },

  async findByPortalToken(token: string): Promise<SupplierRow | null> {
    const latestScoreSql = sql<number>`(
      SELECT sa.overall_score::float
      FROM supplier_assessments sa
      WHERE sa.supplier_id = ${suppliers.supplierId}
      ORDER BY sa.fiscal_year DESC
      LIMIT 1
    )`.as('risk_score');

    const result = await db
      .select({
        supplierId: suppliers.supplierId,
        tenantId: suppliers.tenantId,
        name: suppliers.name,
        category: suppliers.category,
        sector: suppliers.sector,
        country: suppliers.country,
        contactEmail: suppliers.contactEmail,
        contactName: suppliers.contactName,
        riskLevel: suppliers.riskLevel,
        portalToken: suppliers.portalToken,
        riskScore: latestScoreSql,
        active: suppliers.active,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .where(and(eq(suppliers.portalToken, token), eq(suppliers.active, true)))
      .limit(1);

    return (result[0] as SupplierRow) ?? null;
  },

  async setPortalToken(supplierId: string, token: string): Promise<SupplierRow | null> {
    const result = await db
      .update(suppliers)
      .set({ portalToken: token, updatedAt: new Date() })
      .where(eq(suppliers.supplierId, supplierId))
      .returning();

    return (result[0] as SupplierRow) ?? null;
  },

  async findAssessmentsWithScope3ByTenant(): Promise<
    { supplierId: string; supplierName: string; scope3Contribution: string | null; fiscalYear: string }[]
  > {
    const result = await db
      .select({
        supplierId: supplierAssessments.supplierId,
        supplierName: suppliers.name,
        scope3Contribution: supplierAssessments.scope3Contribution,
        fiscalYear: supplierAssessments.fiscalYear,
      })
      .from(supplierAssessments)
      .innerJoin(suppliers, eq(supplierAssessments.supplierId, suppliers.supplierId))
      .where(sql`${supplierAssessments.scope3Contribution} IS NOT NULL AND ${supplierAssessments.scope3Contribution}::numeric > 0`)
      .orderBy(desc(supplierAssessments.fiscalYear));

    return result;
  },

  async upsertAssessment(assessment: AssessmentInsert): Promise<AssessmentRow> {
    const existing = await this.findAssessment(
      assessment.supplierId,
      assessment.fiscalYear
    );

    if (existing) {
      const result = await db
        .update(supplierAssessments)
        .set({
          overallScore: assessment.overallScore ?? existing.overallScore,
          environmentalScore:
            assessment.environmentalScore ?? existing.environmentalScore,
          socialScore: assessment.socialScore ?? existing.socialScore,
          governanceScore:
            assessment.governanceScore ?? existing.governanceScore,
          scope3Contribution:
            assessment.scope3Contribution ?? existing.scope3Contribution,
          surveyStatus: assessment.surveyStatus ?? existing.surveyStatus,
          surveyData: assessment.surveyData ?? existing.surveyData,
          assessedAt: assessment.assessedAt ?? existing.assessedAt,
          updatedAt: new Date(),
        })
        .where(eq(supplierAssessments.assessmentId, existing.assessmentId))
        .returning();

      return result[0] as AssessmentRow;
    }

    const result = await db
      .insert(supplierAssessments)
      .values({
        tenantId: assessment.tenantId,
        supplierId: assessment.supplierId,
        fiscalYear: assessment.fiscalYear,
        overallScore: assessment.overallScore ?? null,
        environmentalScore: assessment.environmentalScore ?? null,
        socialScore: assessment.socialScore ?? null,
        governanceScore: assessment.governanceScore ?? null,
        scope3Contribution: assessment.scope3Contribution ?? null,
        surveyStatus: assessment.surveyStatus ?? 'pending',
        surveyData: assessment.surveyData ?? null,
        assessedAt: assessment.assessedAt ?? null,
      })
      .returning();

    return result[0] as AssessmentRow;
  },
};
