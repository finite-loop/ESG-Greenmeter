import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

// Mock supplierRepository
const mockFindAllByTenant = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockFindAssessmentsBySupplier = vi.fn();
const mockFindAssessment = vi.fn();
const mockUpsertAssessment = vi.fn();
const mockFindByPortalToken = vi.fn();
const mockSetPortalToken = vi.fn();
const mockFindAssessmentsWithScope3ByTenant = vi.fn();

vi.mock('@/db/repositories/supplierRepository', () => ({
  supplierRepository: {
    findAllByTenant: (...args: unknown[]) => mockFindAllByTenant(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    findAssessmentsBySupplier: (...args: unknown[]) => mockFindAssessmentsBySupplier(...args),
    findAssessment: (...args: unknown[]) => mockFindAssessment(...args),
    upsertAssessment: (...args: unknown[]) => mockUpsertAssessment(...args),
    findByPortalToken: (...args: unknown[]) => mockFindByPortalToken(...args),
    setPortalToken: (...args: unknown[]) => mockSetPortalToken(...args),
    findAssessmentsWithScope3ByTenant: (...args: unknown[]) => mockFindAssessmentsWithScope3ByTenant(...args),
  },
}));

import { supplierService } from './supplierService';

const TENANT_ID = 'tenant-123';

const baseSupplier = {
  supplierId: 'sup-1',
  tenantId: TENANT_ID,
  name: 'Tata Steel Ltd',
  category: 'tier1',
  sector: 'Steel',
  country: 'India',
  contactEmail: 'contact@tatasteel.com',
  contactName: 'John Doe',
  riskLevel: 'low',
  riskScore: 75,
  active: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const baseAssessment = {
  assessmentId: 'assess-1',
  tenantId: TENANT_ID,
  supplierId: 'sup-1',
  fiscalYear: 'FY2025-26',
  overallScore: '75.00',
  environmentalScore: '80',
  socialScore: '70',
  governanceScore: '74',
  scope3Contribution: '28400',
  surveyStatus: 'submitted',
  surveyData: null,
  assessedAt: new Date('2026-03-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-03-01'),
};

describe('supplierService.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns suppliers with pagination metadata', async () => {
    mockFindAllByTenant.mockResolvedValue({
      data: [baseSupplier],
      total: 1,
    });

    const result = await supplierService.list({
      page: 1,
      pageSize: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Tata Steel Ltd');
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('returns empty list when no suppliers match filters', async () => {
    mockFindAllByTenant.mockResolvedValue({ data: [], total: 0 });

    const result = await supplierService.list({
      search: 'nonexistent',
      page: 1,
      pageSize: 20,
    });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('passes filters to repository', async () => {
    mockFindAllByTenant.mockResolvedValue({ data: [], total: 0 });

    await supplierService.list({
      search: 'Tata',
      sector: 'Steel',
      category: 'tier1',
      riskLevel: 'low',
      page: 2,
      pageSize: 10,
    });

    expect(mockFindAllByTenant).toHaveBeenCalledWith({
      search: 'Tata',
      sector: 'Steel',
      category: 'tier1',
      riskLevel: 'low',
      page: 2,
      pageSize: 10,
    });
  });
});

describe('supplierService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns supplier with assessments and scorecard', async () => {
    mockFindById.mockResolvedValue(baseSupplier);
    mockFindAssessmentsBySupplier.mockResolvedValue([baseAssessment]);

    const result = await supplierService.getById('sup-1');

    expect(result.supplierId).toBe('sup-1');
    expect(result.assessments).toHaveLength(1);
    expect(result.scorecard).not.toBeNull();
    expect(result.scorecard?.overallScore).toBe(75);
    expect(result.scorecard?.overallRagStatus).toBe('green');
  });

  it('returns null scorecard when no assessments exist', async () => {
    mockFindById.mockResolvedValue(baseSupplier);
    mockFindAssessmentsBySupplier.mockResolvedValue([]);

    const result = await supplierService.getById('sup-1');

    expect(result.scorecard).toBeNull();
    expect(result.assessments).toHaveLength(0);
  });

  it('throws NOT_FOUND when supplier does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(supplierService.getById('sup-missing')).rejects.toThrow(AppError);

    try {
      await supplierService.getById('sup-missing');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });

  it('computes scorecard with correct RAG statuses', async () => {
    const lowScoreAssessment = {
      ...baseAssessment,
      overallScore: '35',
      environmentalScore: '30',
      socialScore: '40',
      governanceScore: '35',
    };
    mockFindById.mockResolvedValue(baseSupplier);
    mockFindAssessmentsBySupplier.mockResolvedValue([lowScoreAssessment]);

    const result = await supplierService.getById('sup-1');

    expect(result.scorecard?.overallRagStatus).toBe('red');
    expect(result.scorecard?.criteria[0].ragStatus).toBe('red'); // env 30 < 40
    expect(result.scorecard?.criteria[1].ragStatus).toBe('amber'); // social 40 >= 40 but < 60
    expect(result.scorecard?.criteria[2].ragStatus).toBe('red'); // gov 35 < 40
  });

  it('handles null scores in assessment gracefully', async () => {
    const partialAssessment = {
      ...baseAssessment,
      overallScore: null,
      environmentalScore: '80',
      socialScore: null,
      governanceScore: null,
    };
    mockFindById.mockResolvedValue(baseSupplier);
    mockFindAssessmentsBySupplier.mockResolvedValue([partialAssessment]);

    const result = await supplierService.getById('sup-1');

    expect(result.scorecard?.overallRagStatus).toBe('red'); // null overall
    expect(result.scorecard?.criteria[0].score).toBe(80);
    expect(result.scorecard?.criteria[0].ragStatus).toBe('green');
    expect(result.scorecard?.criteria[1].score).toBeNull();
    expect(result.scorecard?.criteria[1].ragStatus).toBe('red');
  });
});

describe('supplierService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates supplier with all fields', async () => {
    mockCreate.mockResolvedValue(baseSupplier);

    const result = await supplierService.create(TENANT_ID, {
      name: 'Tata Steel Ltd',
      category: 'tier1',
      sector: 'Steel',
      country: 'India',
      contactEmail: 'contact@tatasteel.com',
      contactName: 'John Doe',
    });

    expect(result.name).toBe('Tata Steel Ltd');
    expect(mockCreate).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      name: 'Tata Steel Ltd',
      category: 'tier1',
      sector: 'Steel',
      country: 'India',
      contactEmail: 'contact@tatasteel.com',
      contactName: 'John Doe',
    });
  });

  it('creates supplier with only required name field', async () => {
    const minimalSupplier = { ...baseSupplier, sector: null, country: null };
    mockCreate.mockResolvedValue(minimalSupplier);

    const result = await supplierService.create(TENANT_ID, {
      name: 'New Supplier',
    });

    expect(result.name).toBe('Tata Steel Ltd');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, name: 'New Supplier' })
    );
  });
});

describe('supplierService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates supplier and returns old+new values', async () => {
    mockFindById.mockResolvedValue(baseSupplier);
    const updated = { ...baseSupplier, name: 'Tata Steel International' };
    mockUpdate.mockResolvedValue(updated);

    const result = await supplierService.update('sup-1', TENANT_ID, {
      name: 'Tata Steel International',
    });

    expect(result.oldValue.name).toBe('Tata Steel Ltd');
    expect(result.newValue.name).toBe('Tata Steel International');
  });

  it('throws NOT_FOUND when supplier does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      supplierService.update('sup-missing', TENANT_ID, { name: 'X' })
    ).rejects.toThrow(AppError);

    try {
      await supplierService.update('sup-missing', TENANT_ID, { name: 'X' });
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.status).toBe(404);
    }
  });

  it('throws PROCESSING_ERROR when update returns null', async () => {
    mockFindById.mockResolvedValue(baseSupplier);
    mockUpdate.mockResolvedValue(null);

    await expect(
      supplierService.update('sup-1', TENANT_ID, { name: 'X' })
    ).rejects.toThrow(AppError);

    try {
      await supplierService.update('sup-1', TENANT_ID, { name: 'X' });
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('PROCESSING_ERROR');
      expect(appErr.status).toBe(500);
    }
  });

  it('only passes provided fields to repository update', async () => {
    mockFindById.mockResolvedValue(baseSupplier);
    mockUpdate.mockResolvedValue({ ...baseSupplier, sector: 'Mining' });

    await supplierService.update('sup-1', TENANT_ID, { sector: 'Mining' });

    expect(mockUpdate).toHaveBeenCalledWith('sup-1', { sector: 'Mining' });
  });
});

describe('supplierService.upsertAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates assessment and computes risk score in single write', async () => {
    mockFindById.mockResolvedValue(baseSupplier);

    const createdAssessment = { ...baseAssessment };
    mockUpsertAssessment.mockResolvedValue(createdAssessment);
    mockUpdate.mockResolvedValue({ ...baseSupplier, riskLevel: 'low' });

    const result = await supplierService.upsertAssessment('sup-1', TENANT_ID, {
      fiscalYear: 'FY2025-26',
      environmentalScore: 80,
      socialScore: 70,
      governanceScore: 74,
    });

    expect(result.assessment).toBeDefined();
    // Only one upsert call (overallScore computed before write)
    expect(mockUpsertAssessment).toHaveBeenCalledTimes(1);
    expect(mockUpsertAssessment).toHaveBeenCalledWith(
      expect.objectContaining({ overallScore: expect.any(String) })
    );
    expect(mockUpdate).toHaveBeenCalled(); // risk level updated
  });

  it('throws NOT_FOUND when supplier does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      supplierService.upsertAssessment('sup-missing', TENANT_ID, {
        fiscalYear: 'FY2025-26',
      })
    ).rejects.toThrow(AppError);
  });

  it('returns supplier without risk update when no scores provided', async () => {
    mockFindById.mockResolvedValue(baseSupplier);
    const noScoreAssessment = {
      ...baseAssessment,
      overallScore: null,
      environmentalScore: null,
      socialScore: null,
      governanceScore: null,
    };
    mockUpsertAssessment.mockResolvedValue(noScoreAssessment);

    const result = await supplierService.upsertAssessment('sup-1', TENANT_ID, {
      fiscalYear: 'FY2025-26',
    });

    expect(result.assessment).toBeDefined();
    expect(result.supplier).toBe(baseSupplier);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('supplierService.generatePortalToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a token and saves it to the supplier', async () => {
    mockFindById.mockResolvedValue(baseSupplier);
    mockSetPortalToken.mockResolvedValue({ ...baseSupplier, portalToken: 'abc123' });

    const token = await supplierService.generatePortalToken('sup-1');

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(mockSetPortalToken).toHaveBeenCalledWith('sup-1', token);
  });

  it('throws NOT_FOUND when supplier does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      supplierService.generatePortalToken('sup-missing')
    ).rejects.toThrow(AppError);
  });
});

describe('supplierService.validatePortalToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns supplier info for valid token', async () => {
    mockFindByPortalToken.mockResolvedValue(baseSupplier);

    const result = await supplierService.validatePortalToken('valid-token');

    expect(result).not.toBeNull();
    expect(result?.supplierId).toBe('sup-1');
    expect(result?.supplierName).toBe('Tata Steel Ltd');
    expect(result?.tenantId).toBe(TENANT_ID);
  });

  it('returns null for invalid token', async () => {
    mockFindByPortalToken.mockResolvedValue(null);

    const result = await supplierService.validatePortalToken('bad-token');

    expect(result).toBeNull();
  });
});

describe('supplierService.submitPortalAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates assessment from portal submission with scope3 data', async () => {
    mockFindByPortalToken.mockResolvedValue(baseSupplier);
    mockUpsertAssessment.mockResolvedValue({
      ...baseAssessment,
      surveyStatus: 'submitted',
      scope3Contribution: '1500',
    });
    mockUpdate.mockResolvedValue({ ...baseSupplier, riskLevel: 'low' });

    const result = await supplierService.submitPortalAssessment({
      token: 'valid-token',
      fiscalYear: 'FY2025-26',
      scope3Contribution: 1500,
      environmentalScore: 80,
      socialScore: 70,
      governanceScore: 74,
    });

    expect(result.assessmentId).toBeDefined();
    expect(mockUpsertAssessment).toHaveBeenCalledTimes(1);
    expect(mockUpsertAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        supplierId: 'sup-1',
        scope3Contribution: '1500',
        surveyStatus: 'submitted',
      })
    );
  });

  it('throws NOT_FOUND for invalid portal token', async () => {
    mockFindByPortalToken.mockResolvedValue(null);

    await expect(
      supplierService.submitPortalAssessment({
        token: 'bad-token',
        fiscalYear: 'FY2025-26',
        scope3Contribution: 1500,
      })
    ).rejects.toThrow(AppError);
  });

  it('creates assessment without ESG scores when only scope3 provided', async () => {
    mockFindByPortalToken.mockResolvedValue(baseSupplier);
    mockUpsertAssessment.mockResolvedValue({
      ...baseAssessment,
      surveyStatus: 'submitted',
      scope3Contribution: '5000',
      overallScore: null,
    });

    const result = await supplierService.submitPortalAssessment({
      token: 'valid-token',
      fiscalYear: 'FY2025-26',
      scope3Contribution: 5000,
    });

    expect(result).toBeDefined();
    // No risk level update when no ESG scores
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('supplierService.getScope3Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates scope3 contributions from multiple suppliers', async () => {
    mockFindAssessmentsWithScope3ByTenant.mockResolvedValue([
      { supplierId: 'sup-1', supplierName: 'Tata Steel', scope3Contribution: '28400', fiscalYear: 'FY2025-26' },
      { supplierId: 'sup-2', supplierName: 'Reliance', scope3Contribution: '15000', fiscalYear: 'FY2025-26' },
      { supplierId: 'sup-1', supplierName: 'Tata Steel', scope3Contribution: '25000', fiscalYear: 'FY2024-25' },
    ]);

    const result = await supplierService.getScope3Summary();

    expect(result.totalScope3Cat1).toBe(28400 + 15000);
    expect(result.supplierBreakdown).toHaveLength(2);
    // Sorted by contribution descending
    expect(result.supplierBreakdown[0].supplierName).toBe('Tata Steel');
    expect(result.supplierBreakdown[0].scope3Contribution).toBe(28400);
    expect(result.supplierBreakdown[1].supplierName).toBe('Reliance');
    expect(result.supplierBreakdown[1].scope3Contribution).toBe(15000);
    // Percentages should sum to ~100
    const totalPct = result.supplierBreakdown.reduce((s, b) => s + b.percentage, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it('returns zero total when no scope3 data exists', async () => {
    mockFindAssessmentsWithScope3ByTenant.mockResolvedValue([]);

    const result = await supplierService.getScope3Summary();

    expect(result.totalScope3Cat1).toBe(0);
    expect(result.supplierBreakdown).toHaveLength(0);
  });

  it('takes only latest fiscal year per supplier', async () => {
    mockFindAssessmentsWithScope3ByTenant.mockResolvedValue([
      { supplierId: 'sup-1', supplierName: 'Tata', scope3Contribution: '30000', fiscalYear: 'FY2025-26' },
      { supplierId: 'sup-1', supplierName: 'Tata', scope3Contribution: '20000', fiscalYear: 'FY2024-25' },
    ]);

    const result = await supplierService.getScope3Summary();

    expect(result.supplierBreakdown).toHaveLength(1);
    expect(result.supplierBreakdown[0].scope3Contribution).toBe(30000);
  });
});
