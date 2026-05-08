import { supplierRepository } from '@/db/repositories/supplierRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { randomBytes } from 'crypto';
import type {
  CreateSupplier,
  UpdateSupplier,
  UpsertAssessment,
  SupplierListFilter,
  PortalSubmission,
} from '@/schemas/suppliers';
import type {
  SupplierRow,
  AssessmentRow,
} from '@/db/repositories/supplierRepository';

/** Predefined assessment criteria for the scorecard */
const ASSESSMENT_CRITERIA = [
  { key: 'environmental', label: 'Environmental Compliance', weight: 0.35 },
  { key: 'social', label: 'Labor Practices & Social', weight: 0.35 },
  { key: 'governance', label: 'Governance & Ethics', weight: 0.30 },
] as const;

/** RAG thresholds for individual scores */
const RAG_THRESHOLDS = { green: 60, amber: 40 } as const;

type RagStatus = 'green' | 'amber' | 'red';

export interface ScorecardCriterion {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  ragStatus: RagStatus;
}

export interface Scorecard {
  overallScore: number | null;
  overallRagStatus: RagStatus;
  criteria: ScorecardCriterion[];
}

export interface SupplierDetail extends SupplierRow {
  assessments: AssessmentRow[];
  scorecard: Scorecard | null;
}

function computeRagStatus(score: number | null): RagStatus {
  if (score === null) return 'red';
  if (score >= RAG_THRESHOLDS.green) return 'green';
  if (score >= RAG_THRESHOLDS.amber) return 'amber';
  return 'red';
}

function safeParseFloat(raw: string | null): number | null {
  if (raw === null) return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

function computeRiskScore(assessment: AssessmentRow): number | null {
  const scores: { value: number; weight: number }[] = [];

  for (const criterion of ASSESSMENT_CRITERIA) {
    const raw =
      criterion.key === 'environmental'
        ? assessment.environmentalScore
        : criterion.key === 'social'
          ? assessment.socialScore
          : assessment.governanceScore;

    const value = safeParseFloat(raw);
    if (value !== null) {
      scores.push({ value, weight: criterion.weight });
    }
  }

  if (scores.length === 0) return null;

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);

  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

function computeRiskLevel(overallScore: number | null): string | null {
  if (overallScore === null) return null;
  if (overallScore >= 70) return 'low';
  if (overallScore >= 50) return 'medium';
  if (overallScore >= 30) return 'high';
  return 'critical';
}

function buildScorecard(assessment: AssessmentRow | undefined): Scorecard | null {
  if (!assessment) return null;

  const criteria: ScorecardCriterion[] = ASSESSMENT_CRITERIA.map((c) => {
    const raw =
      c.key === 'environmental'
        ? assessment.environmentalScore
        : c.key === 'social'
          ? assessment.socialScore
          : assessment.governanceScore;

    const score = safeParseFloat(raw);

    return {
      key: c.key,
      label: c.label,
      weight: c.weight,
      score,
      ragStatus: computeRagStatus(score),
    };
  });

  const overallScore = safeParseFloat(assessment.overallScore);

  return {
    overallScore,
    overallRagStatus: computeRagStatus(overallScore),
    criteria,
  };
}

export const supplierService = {
  async list(
    filters: SupplierListFilter
  ): Promise<{
    data: SupplierRow[];
    meta: { page: number; pageSize: number; total: number };
  }> {
    const result = await supplierRepository.findAllByTenant(filters);

    return {
      data: result.data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },

  async getById(supplierId: string): Promise<SupplierDetail> {
    const supplier = await supplierRepository.findById(supplierId);

    if (!supplier) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Supplier not found: ${supplierId}`,
        404
      );
    }

    const assessments =
      await supplierRepository.findAssessmentsBySupplier(supplierId);

    const latestAssessment = assessments[0];
    const scorecard = buildScorecard(latestAssessment);

    return {
      ...supplier,
      assessments,
      scorecard,
    };
  },

  async create(tenantId: string, input: CreateSupplier): Promise<SupplierRow> {
    return supplierRepository.create({
      tenantId,
      name: input.name,
      category: input.category,
      sector: input.sector,
      country: input.country,
      contactEmail: input.contactEmail,
      contactName: input.contactName,
    });
  },

  async update(
    supplierId: string,
    tenantId: string,
    input: UpdateSupplier
  ): Promise<{ oldValue: SupplierRow; newValue: SupplierRow }> {
    const existing = await supplierRepository.findById(supplierId);

    if (!existing) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Supplier not found: ${supplierId}`,
        404
      );
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.category !== undefined) updates.category = input.category;
    if (input.sector !== undefined) updates.sector = input.sector;
    if (input.country !== undefined) updates.country = input.country;
    if (input.contactEmail !== undefined)
      updates.contactEmail = input.contactEmail;
    if (input.contactName !== undefined)
      updates.contactName = input.contactName;
    if (input.riskLevel !== undefined) updates.riskLevel = input.riskLevel;
    if (input.active !== undefined) updates.active = input.active;

    const updated = await supplierRepository.update(supplierId, updates);

    if (!updated) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'Failed to update supplier',
        500
      );
    }

    return { oldValue: existing, newValue: updated };
  },

  async upsertAssessment(
    supplierId: string,
    tenantId: string,
    input: UpsertAssessment
  ): Promise<{
    assessment: AssessmentRow;
    supplier: SupplierRow;
  }> {
    const supplier = await supplierRepository.findById(supplierId);

    if (!supplier) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Supplier not found: ${supplierId}`,
        404
      );
    }

    const envScore = input.environmentalScore !== undefined
      ? String(input.environmentalScore)
      : undefined;
    const socScore = input.socialScore !== undefined
      ? String(input.socialScore)
      : undefined;
    const govScore = input.governanceScore !== undefined
      ? String(input.governanceScore)
      : undefined;

    // Pre-compute overall score from input scores to avoid a second DB write
    const scoreInputs: { value: number; weight: number }[] = [];
    for (const c of ASSESSMENT_CRITERIA) {
      const val = c.key === 'environmental'
        ? input.environmentalScore
        : c.key === 'social'
          ? input.socialScore
          : input.governanceScore;
      if (val !== undefined) {
        scoreInputs.push({ value: val, weight: c.weight });
      }
    }

    let overallScore: number | null = null;
    if (scoreInputs.length > 0) {
      const totalWeight = scoreInputs.reduce((sum, s) => sum + s.weight, 0);
      const weightedSum = scoreInputs.reduce((sum, s) => sum + s.value * s.weight, 0);
      overallScore = Math.round((weightedSum / totalWeight) * 100) / 100;
    }

    const assessmentData = {
      tenantId,
      supplierId,
      fiscalYear: input.fiscalYear,
      environmentalScore: envScore,
      socialScore: socScore,
      governanceScore: govScore,
      overallScore: overallScore !== null ? String(overallScore) : undefined,
      scope3Contribution:
        input.scope3Contribution !== undefined
          ? String(input.scope3Contribution)
          : undefined,
      surveyStatus: input.surveyStatus,
      surveyData: input.surveyData,
      assessedAt: new Date(),
    };

    const assessment =
      await supplierRepository.upsertAssessment(assessmentData);

    // Update supplier risk level based on overall score
    if (overallScore !== null) {
      const riskLevel = computeRiskLevel(overallScore);
      const updatedSupplier = await supplierRepository.update(supplierId, {
        riskLevel,
      });

      return {
        assessment,
        supplier: updatedSupplier ?? supplier,
      };
    }

    return { assessment, supplier };
  },

  async generatePortalToken(supplierId: string): Promise<string> {
    const supplier = await supplierRepository.findById(supplierId);
    if (!supplier) {
      throw new AppError(ErrorCode.NOT_FOUND, `Supplier not found: ${supplierId}`, 404);
    }

    const token = randomBytes(32).toString('hex');
    await supplierRepository.setPortalToken(supplierId, token);
    return token;
  },

  async validatePortalToken(
    token: string
  ): Promise<{ supplierId: string; tenantId: string; supplierName: string } | null> {
    const supplier = await supplierRepository.findByPortalToken(token);
    if (!supplier) return null;
    return {
      supplierId: supplier.supplierId,
      tenantId: supplier.tenantId,
      supplierName: supplier.name,
    };
  },

  async submitPortalAssessment(
    input: PortalSubmission
  ): Promise<AssessmentRow> {
    const supplier = await supplierRepository.findByPortalToken(input.token);
    if (!supplier) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Invalid or expired portal token', 404);
    }

    const scoreInputs: { value: number; weight: number }[] = [];
    for (const c of ASSESSMENT_CRITERIA) {
      const val =
        c.key === 'environmental'
          ? input.environmentalScore
          : c.key === 'social'
            ? input.socialScore
            : input.governanceScore;
      if (val !== undefined) {
        scoreInputs.push({ value: val, weight: c.weight });
      }
    }

    let overallScore: number | null = null;
    if (scoreInputs.length > 0) {
      const totalWeight = scoreInputs.reduce((sum, s) => sum + s.weight, 0);
      const weightedSum = scoreInputs.reduce((sum, s) => sum + s.value * s.weight, 0);
      overallScore = Math.round((weightedSum / totalWeight) * 100) / 100;
    }

    const assessmentData = {
      tenantId: supplier.tenantId,
      supplierId: supplier.supplierId,
      fiscalYear: input.fiscalYear,
      environmentalScore: input.environmentalScore !== undefined ? String(input.environmentalScore) : undefined,
      socialScore: input.socialScore !== undefined ? String(input.socialScore) : undefined,
      governanceScore: input.governanceScore !== undefined ? String(input.governanceScore) : undefined,
      overallScore: overallScore !== null ? String(overallScore) : undefined,
      scope3Contribution: String(input.scope3Contribution),
      surveyStatus: 'submitted',
      surveyData: input.surveyData,
      assessedAt: new Date(),
    };

    const assessment = await supplierRepository.upsertAssessment(assessmentData);

    if (overallScore !== null) {
      const riskLevel = computeRiskLevel(overallScore);
      await supplierRepository.update(supplier.supplierId, { riskLevel });
    }

    return assessment;
  },

  async getScope3Summary(): Promise<{
    totalScope3Cat1: number;
    supplierBreakdown: {
      supplierId: string;
      supplierName: string;
      scope3Contribution: number;
      fiscalYear: string;
      percentage: number;
    }[];
  }> {
    const rows = await supplierRepository.findAssessmentsWithScope3ByTenant();

    // Group by supplier — take most recent fiscal year per supplier
    const latestBySupplier = new Map<
      string,
      { supplierId: string; supplierName: string; scope3Contribution: number; fiscalYear: string }
    >();

    for (const row of rows) {
      if (!latestBySupplier.has(row.supplierId)) {
        const contribution = parseFloat(row.scope3Contribution ?? '0');
        if (!Number.isNaN(contribution) && contribution > 0) {
          latestBySupplier.set(row.supplierId, {
            supplierId: row.supplierId,
            supplierName: row.supplierName,
            scope3Contribution: contribution,
            fiscalYear: row.fiscalYear,
          });
        }
      }
    }

    const entries = Array.from(latestBySupplier.values());
    const totalScope3Cat1 = entries.reduce((sum, e) => sum + e.scope3Contribution, 0);

    const supplierBreakdown = entries.map((e) => ({
      ...e,
      percentage: totalScope3Cat1 > 0
        ? Math.round((e.scope3Contribution / totalScope3Cat1) * 10000) / 100
        : 0,
    }));

    // Sort by contribution descending
    supplierBreakdown.sort((a, b) => b.scope3Contribution - a.scope3Contribution);

    return { totalScope3Cat1, supplierBreakdown };
  },
};
