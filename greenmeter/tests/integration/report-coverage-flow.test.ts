import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TENANT_A,
  NODE_ROOT,
  PERIOD_FY24,
  PARAM_GHG,
  PARAM_WATER,
  PARAM_WASTE,
  PARAM_WORKFORCE,
  makeReportParameterRow,
} from './helpers/test-fixtures';

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockFindPeriodById = vi.fn();
const mockFindParametersForReport = vi.fn();
const mockGetCoverageSummary = vi.fn();
const mockGetCoverageWarningThreshold = vi.fn();

vi.mock('@/db/repositories/reportRepository', () => ({
  reportRepository: {
    findPeriodById: (...args: unknown[]) => mockFindPeriodById(...args),
    findParametersForReport: (...args: unknown[]) => mockFindParametersForReport(...args),
    getCoverageSummary: (...args: unknown[]) => mockGetCoverageSummary(...args),
    getCoverageWarningThreshold: (...args: unknown[]) => mockGetCoverageWarningThreshold(...args),
  },
}));

vi.mock('@/config/frameworks', () => ({
  getReportTemplate: (framework: string) => {
    if (framework === 'BRSR') {
      return {
        framework: 'BRSR',
        name: 'BRSR Core Report',
        version: '1.0',
        sections: [
          {
            id: 'env',
            name: 'Environmental',
            pillar: 'E',
            disclosures: [
              {
                id: 'env-climate',
                name: 'Climate Disclosures',
                standardSection: 'Principle 6',
                indicatorType: 'essential',
              },
              {
                id: 'env-water',
                name: 'Water Disclosures',
                standardSection: 'Principle 6',
                indicatorType: 'leadership',
              },
            ],
          },
          {
            id: 'soc',
            name: 'Social',
            pillar: 'S',
            disclosures: [
              {
                id: 'soc-workforce',
                name: 'Workforce Disclosures',
                standardSection: 'Principle 3',
              },
            ],
          },
        ],
      };
    }
    return undefined;
  },
}));

// Import AFTER mocks
import { reportService } from '@/services/reportService';
import { AppError } from '@/lib/errors';

// ─── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Integration: Report Coverage & Rendering', () => {
  // ── Coverage Computation ───────────────────────────────────

  describe('Coverage formula: (hasValue + notApplicable) / totalParams * 100', () => {
    it('computes 100% coverage when all params have values', async () => {
      mockFindPeriodById.mockResolvedValue({ periodId: PERIOD_FY24, fiscalYear: '2024' });
      mockGetCoverageSummary.mockResolvedValue({
        totalParams: 10,
        hasValue: 10,
        verified: 8,
        notApplicable: 0,
        percentComplete: 100,
        sections: [
          { standardSection: 'Principle 6', totalParams: 10, hasValue: 10, verified: 8, notApplicable: 0 },
        ],
      });
      mockGetCoverageWarningThreshold.mockResolvedValue(80);

      const result = await reportService.getCoverage('BRSR', TENANT_A, PERIOD_FY24);

      expect(result.percentComplete).toBe(100);
      expect(result.belowThreshold).toBe(false);
    });

    it('computes 0% coverage when no params have values', async () => {
      mockFindPeriodById.mockResolvedValue({ periodId: PERIOD_FY24, fiscalYear: '2024' });
      mockGetCoverageSummary.mockResolvedValue({
        totalParams: 10,
        hasValue: 0,
        verified: 0,
        notApplicable: 0,
        percentComplete: 0,
        sections: [
          { standardSection: 'Principle 6', totalParams: 10, hasValue: 0, verified: 0, notApplicable: 0 },
        ],
      });
      mockGetCoverageWarningThreshold.mockResolvedValue(80);

      const result = await reportService.getCoverage('BRSR', TENANT_A, PERIOD_FY24);

      expect(result.percentComplete).toBe(0);
      expect(result.belowThreshold).toBe(true);
    });

    it('belowThreshold is true when coverage < 80% (default)', async () => {
      mockFindPeriodById.mockResolvedValue({ periodId: PERIOD_FY24, fiscalYear: '2024' });
      mockGetCoverageSummary.mockResolvedValue({
        totalParams: 10,
        hasValue: 7,
        verified: 5,
        notApplicable: 0,
        percentComplete: 70,
        sections: [],
      });
      mockGetCoverageWarningThreshold.mockResolvedValue(80);

      const result = await reportService.getCoverage('BRSR', TENANT_A, PERIOD_FY24);

      expect(result.belowThreshold).toBe(true);
      expect(result.warningThreshold).toBe(80);
    });

    it('uses custom threshold from tenant_config', async () => {
      mockFindPeriodById.mockResolvedValue({ periodId: PERIOD_FY24, fiscalYear: '2024' });
      mockGetCoverageSummary.mockResolvedValue({
        totalParams: 10,
        hasValue: 7,
        verified: 5,
        notApplicable: 0,
        percentComplete: 70,
        sections: [],
      });
      // Custom threshold: 60 instead of default 80
      mockGetCoverageWarningThreshold.mockResolvedValue(60);

      const result = await reportService.getCoverage('BRSR', TENANT_A, PERIOD_FY24);

      expect(result.belowThreshold).toBe(false); // 70 >= 60
      expect(result.warningThreshold).toBe(60);
    });

    it('returns per-section breakdown with computed percentComplete', async () => {
      mockFindPeriodById.mockResolvedValue({ periodId: PERIOD_FY24, fiscalYear: '2024' });
      mockGetCoverageSummary.mockResolvedValue({
        totalParams: 20,
        hasValue: 15,
        verified: 10,
        notApplicable: 2,
        percentComplete: 85,
        sections: [
          { standardSection: 'Principle 6', totalParams: 10, hasValue: 8, verified: 5, notApplicable: 1 },
          { standardSection: 'Principle 3', totalParams: 10, hasValue: 7, verified: 5, notApplicable: 1 },
        ],
      });
      mockGetCoverageWarningThreshold.mockResolvedValue(80);

      const result = await reportService.getCoverage('BRSR', TENANT_A, PERIOD_FY24);

      expect(result.sections).toHaveLength(2);
      // Principle 6: (8+1)/10 * 100 = 90%
      expect(result.sections[0].percentComplete).toBe(90);
      // Principle 3: (7+1)/10 * 100 = 80%
      expect(result.sections[1].percentComplete).toBe(80);
    });
  });

  // ── Report Rendering ───────────────────────────────────────

  describe('Report rendering', () => {
    it('matches params to template disclosures by standardSection and indicatorType', async () => {
      mockFindPeriodById.mockResolvedValue({ periodId: PERIOD_FY24, fiscalYear: '2024' });
      mockFindParametersForReport.mockResolvedValue([
        makeReportParameterRow({
          paramId: PARAM_GHG,
          standardSection: 'Principle 6',
          indicatorType: 'essential',
          value: '100',
          valueId: 'val-1',
        }),
        makeReportParameterRow({
          paramId: PARAM_WATER,
          standardSection: 'Principle 6',
          indicatorType: 'leadership',
          value: '200',
          valueId: 'val-2',
        }),
        makeReportParameterRow({
          paramId: PARAM_WORKFORCE,
          standardSection: 'Principle 3',
          indicatorType: null,
          value: null,
          valueId: null,
        }),
      ]);

      const result = await reportService.renderReport('BRSR', TENANT_A, PERIOD_FY24, NODE_ROOT);

      // Env section with 2 disclosures
      const envSection = result.sections.find(s => s.id === 'env')!;
      expect(envSection).toBeDefined();

      // Climate disclosure should have GHG param (essential indicator)
      const climate = envSection.disclosures.find(d => d.id === 'env-climate')!;
      expect(climate.parameters).toHaveLength(1);
      expect(climate.parameters[0].paramId).toBe(PARAM_GHG);
      expect(climate.parameters[0].status).toBe('reported');

      // Water disclosure should have WATER param (leadership indicator)
      const water = envSection.disclosures.find(d => d.id === 'env-water')!;
      expect(water.parameters).toHaveLength(1);
      expect(water.parameters[0].paramId).toBe(PARAM_WATER);

      // Social section
      const socSection = result.sections.find(s => s.id === 'soc')!;
      const workforce = socSection.disclosures.find(d => d.id === 'soc-workforce')!;
      expect(workforce.parameters).toHaveLength(1);
      expect(workforce.parameters[0].status).toBe('not_reported');
    });

    it('maps status correctly: reported / not_reported / not_applicable', async () => {
      mockFindPeriodById.mockResolvedValue({ periodId: PERIOD_FY24, fiscalYear: '2024' });
      mockFindParametersForReport.mockResolvedValue([
        // Reported: has value
        makeReportParameterRow({ paramId: PARAM_GHG, value: '100', valueId: 'v1', standardSection: 'Principle 6', indicatorType: 'essential' }),
        // Not reported: no value
        makeReportParameterRow({ paramId: PARAM_WATER, value: null, valueId: null, standardSection: 'Principle 6', indicatorType: 'leadership' }),
        // Not applicable
        makeReportParameterRow({ paramId: PARAM_WORKFORCE, value: null, valueId: 'v3', notApplicable: true, standardSection: 'Principle 3' }),
      ]);

      const result = await reportService.renderReport('BRSR', TENANT_A, PERIOD_FY24, NODE_ROOT);

      expect(result.coverage.reported).toBe(1);
      expect(result.coverage.notReported).toBe(1);
      expect(result.coverage.notApplicable).toBe(1);
      expect(result.coverage.total).toBe(3);
      expect(result.coverage.percentComplete).toBe(33); // 1/3 ≈ 33%
    });
  });

  // ── Error Cases ────────────────────────────────────────────

  describe('Error handling', () => {
    it('throws VALIDATION_ERROR for unknown framework', async () => {
      await expect(
        reportService.getCoverage('UNKNOWN_FRAMEWORK', TENANT_A, PERIOD_FY24)
      ).rejects.toThrow(AppError);

      try {
        await reportService.getCoverage('UNKNOWN_FRAMEWORK', TENANT_A, PERIOD_FY24);
      } catch (err) {
        expect((err as AppError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('throws NOT_FOUND for invalid periodId', async () => {
      mockFindPeriodById.mockResolvedValue(null);

      await expect(
        reportService.getCoverage('BRSR', TENANT_A, 'nonexistent-period')
      ).rejects.toThrow(AppError);

      try {
        await reportService.getCoverage('BRSR', TENANT_A, 'nonexistent-period');
      } catch (err) {
        expect((err as AppError).code).toBe('NOT_FOUND');
      }
    });

    it('throws VALIDATION_ERROR for unknown framework on renderReport', async () => {
      await expect(
        reportService.renderReport('INVALID', TENANT_A, PERIOD_FY24, NODE_ROOT)
      ).rejects.toThrow(AppError);
    });

    it('throws NOT_FOUND for invalid periodId on renderReport', async () => {
      mockFindPeriodById.mockResolvedValue(null);

      await expect(
        reportService.renderReport('BRSR', TENANT_A, 'bad-period', NODE_ROOT)
      ).rejects.toThrow(AppError);
    });
  });
});
