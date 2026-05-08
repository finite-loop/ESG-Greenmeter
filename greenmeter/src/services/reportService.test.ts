import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportService } from './reportService';
import type { RenderedReport, ValueStatus } from './reportService';

// Mock the repository and logger
vi.mock('@/db/repositories/reportRepository', () => ({
  reportRepository: {
    findPeriodById: vi.fn(),
    findParametersForReport: vi.fn(),
    findRootNode: vi.fn(),
    getCoverageSummary: vi.fn(),
    getCoverageWarningThreshold: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { reportRepository } from '@/db/repositories/reportRepository';

const mockPeriod = {
  periodId: 'period-1',
  fiscalYear: 'FY2024',
  startDate: new Date('2023-04-01'),
  endDate: new Date('2024-03-31'),
  status: 'open',
};

const tenantId = 'tenant-001';
const periodId = 'period-1';
const nodeId = 'node-root';

/**
 * Helper to build a fake parameter row.
 */
function makeParam(overrides: Record<string, unknown> = {}) {
  return {
    paramId: 'param-1',
    code: 'BRSR-E-SCOPE_1',
    name: 'Scope 1 GHG Emissions',
    pillar: 'E',
    unit: 'tCO2e',
    dataType: 'number',
    category: 'Environment',
    standardSection: 'P6 – Environment',
    indicatorType: 'essential',
    disclosure: null,
    valueId: null,
    value: null,
    valueText: null,
    verified: null,
    notApplicable: null,
    ...overrides,
  };
}

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renderReport', () => {
    it('throws for unknown framework', async () => {
      await expect(
        reportService.renderReport('INVALID', tenantId, periodId, nodeId)
      ).rejects.toThrow('Unknown framework');
    });

    it('throws if period not found', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(null);

      await expect(
        reportService.renderReport('BRSR', tenantId, periodId, nodeId)
      ).rejects.toThrow('Reporting period not found');
    });

    it('renders a BRSR report with populated sections', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.findParametersForReport).mockResolvedValue([
        makeParam({
          paramId: 'p1',
          code: 'BRSR-E-SCOPE1',
          name: 'Scope 1 GHG',
          standardSection: 'P6 – Environment',
          indicatorType: 'essential',
          valueId: 'v1',
          value: '1250.5',
          verified: true,
          notApplicable: false,
        }),
        makeParam({
          paramId: 'p2',
          code: 'BRSR-E-SCOPE2',
          name: 'Scope 2 GHG',
          standardSection: 'P6 – Environment',
          indicatorType: 'essential',
          valueId: null,
          value: null,
          verified: null,
          notApplicable: null,
        }),
        makeParam({
          paramId: 'p3',
          code: 'BRSR-E-SCOPE3',
          name: 'Scope 3 GHG',
          standardSection: 'P6 – Environment',
          indicatorType: 'leadership',
          valueId: 'v3',
          value: null,
          valueText: null,
          verified: false,
          notApplicable: true,
        }),
      ]);

      const report = await reportService.renderReport('BRSR', tenantId, periodId, nodeId);

      expect(report.framework).toBe('BRSR');
      expect(report.fiscalYear).toBe('FY2024');
      expect(report.templateName).toBe('BRSR Core Report');

      // Find the P6 section
      const p6 = report.sections.find((s) => s.id === 'brsr-p6');
      expect(p6).toBeDefined();

      // P6 Essential should have 2 params (p1 reported, p2 not reported)
      const p6Essential = p6!.disclosures.find((d) => d.id === 'brsr-p6-essential');
      expect(p6Essential).toBeDefined();
      expect(p6Essential!.parameters).toHaveLength(2);
      expect(p6Essential!.reported).toBe(1);
      expect(p6Essential!.total).toBe(2);

      // Check reported param
      const reportedParam = p6Essential!.parameters.find((p) => p.paramId === 'p1');
      expect(reportedParam!.displayValue).toBe('1250.5');
      expect(reportedParam!.status).toBe('reported');
      expect(reportedParam!.verified).toBe(true);

      // Check not reported param
      const missingParam = p6Essential!.parameters.find((p) => p.paramId === 'p2');
      expect(missingParam!.displayValue).toBe('Not Reported');
      expect(missingParam!.status).toBe('not_reported');

      // P6 Leadership should have 1 param (p3 not applicable)
      const p6Leadership = p6!.disclosures.find((d) => d.id === 'brsr-p6-leadership');
      expect(p6Leadership).toBeDefined();
      expect(p6Leadership!.parameters).toHaveLength(1);

      const naParam = p6Leadership!.parameters[0];
      expect(naParam.displayValue).toBe('Not Applicable');
      expect(naParam.status).toBe('not_applicable');
    });

    it('handles a report with no parameters (empty framework)', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.findParametersForReport).mockResolvedValue([]);

      const report = await reportService.renderReport('BRSR', tenantId, periodId, nodeId);

      expect(report.coverage.total).toBe(0);
      expect(report.coverage.percentComplete).toBe(0);
      expect(report.sections.length).toBeGreaterThan(0); // sections from template exist, just empty
    });

    it('calculates coverage percentages correctly', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.findParametersForReport).mockResolvedValue([
        // 3 reported, 1 not reported, 1 N/A = 5 total, 60% complete
        makeParam({ paramId: 'p1', standardSection: 'A – General', indicatorType: 'essential', valueId: 'v1', value: '100' }),
        makeParam({ paramId: 'p2', standardSection: 'A – General', indicatorType: 'essential', valueId: 'v2', value: '200' }),
        makeParam({ paramId: 'p3', standardSection: 'A – General', indicatorType: 'essential', valueId: 'v3', value: '300' }),
        makeParam({ paramId: 'p4', standardSection: 'A – General', indicatorType: 'essential', valueId: null }),
        makeParam({ paramId: 'p5', standardSection: 'A – General', indicatorType: 'essential', valueId: 'v5', notApplicable: true }),
      ]);

      const report = await reportService.renderReport('BRSR', tenantId, periodId, nodeId);

      expect(report.coverage.reported).toBe(3);
      expect(report.coverage.notReported).toBe(1);
      expect(report.coverage.notApplicable).toBe(1);
      expect(report.coverage.total).toBe(5);
      expect(report.coverage.percentComplete).toBe(60);
    });

    it('renders ESRS framework correctly', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.findParametersForReport).mockResolvedValue([
        makeParam({
          paramId: 'e1',
          code: 'ESRS-E-GHG',
          standardSection: 'ESRS E1',
          indicatorType: 'mandatory',
          valueId: 'v1',
          value: '500',
        }),
      ]);

      const report = await reportService.renderReport('ESRS', tenantId, periodId, nodeId);

      expect(report.framework).toBe('ESRS');
      const e1Section = report.sections.find((s) => s.id === 'esrs-e1');
      expect(e1Section).toBeDefined();
      expect(e1Section!.disclosures[0].parameters).toHaveLength(1);
      expect(e1Section!.disclosures[0].parameters[0].displayValue).toBe('500');
    });

    it('renders GRI framework correctly', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.findParametersForReport).mockResolvedValue([
        makeParam({
          paramId: 'g305',
          code: 'GRI-E-SCOPE1',
          standardSection: 'GRI 305',
          indicatorType: 'voluntary',
          valueId: 'v1',
          valueText: 'Emissions report attached',
          value: null,
        }),
      ]);

      const report = await reportService.renderReport('GRI', tenantId, periodId, nodeId);

      expect(report.framework).toBe('GRI');
      const envSection = report.sections.find((s) => s.id === 'gri-environment');
      expect(envSection).toBeDefined();
      const emissionsDisclosure = envSection!.disclosures.find((d) => d.id === 'gri-305-emissions');
      expect(emissionsDisclosure).toBeDefined();
      expect(emissionsDisclosure!.parameters[0].displayValue).toBe('Emissions report attached');
      expect(emissionsDisclosure!.parameters[0].status).toBe('reported');
    });

    it('renders IFRS S2 framework correctly', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.findParametersForReport).mockResolvedValue([
        makeParam({
          paramId: 'ifrs1',
          code: 'IFRS_S2-E-SCOPE1',
          standardSection: 'IFRS S2',
          indicatorType: null,
          category: 'Emissions',
          valueId: 'v1',
          value: '750',
        }),
      ]);

      const report = await reportService.renderReport('IFRS_S2', tenantId, periodId, nodeId);

      expect(report.framework).toBe('IFRS_S2');
      const metricsSection = report.sections.find((s) => s.id === 'ifrs-s2-metrics');
      expect(metricsSection).toBeDefined();
      const ghgDisclosure = metricsSection!.disclosures.find((d) => d.id === 'ifrs-s2-ghg-emissions');
      expect(ghgDisclosure).toBeDefined();
      expect(ghgDisclosure!.parameters[0].displayValue).toBe('750');
    });

    it('displays valueText when value is null but valueText is set', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.findParametersForReport).mockResolvedValue([
        makeParam({
          paramId: 'p1',
          standardSection: 'P1 – Ethics',
          indicatorType: 'essential',
          valueId: 'v1',
          value: null,
          valueText: 'Yes, policy documented',
          verified: false,
          notApplicable: false,
        }),
      ]);

      const report = await reportService.renderReport('BRSR', tenantId, periodId, nodeId);
      const p1 = report.sections.find((s) => s.id === 'brsr-p1');
      const essentialParams = p1!.disclosures[0].parameters;
      expect(essentialParams[0].displayValue).toBe('Yes, policy documented');
      expect(essentialParams[0].status).toBe('reported');
    });

    it('shows Not Reported when value record exists but both value and valueText are null', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.findParametersForReport).mockResolvedValue([
        makeParam({
          paramId: 'p1',
          standardSection: 'P1 – Ethics',
          indicatorType: 'essential',
          valueId: 'v1',
          value: null,
          valueText: null,
          verified: false,
          notApplicable: false,
        }),
      ]);

      const report = await reportService.renderReport('BRSR', tenantId, periodId, nodeId);
      const p1 = report.sections.find((s) => s.id === 'brsr-p1');
      expect(p1!.disclosures[0].parameters[0].status).toBe('not_reported');
      expect(p1!.disclosures[0].parameters[0].displayValue).toBe('Not Reported');
    });
  });

  describe('getCoverage', () => {
    const mockCoverageSummary = {
      totalParams: 100,
      hasValue: 60,
      verified: 40,
      notApplicable: 10,
      percentComplete: 70,
      sections: [
        { standardSection: 'P1 – Ethics', totalParams: 20, hasValue: 15, verified: 10, notApplicable: 2 },
        { standardSection: 'P6 – Environment', totalParams: 80, hasValue: 45, verified: 30, notApplicable: 8 },
      ],
    };

    it('throws when period not found', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(null);

      await expect(
        reportService.getCoverage('BRSR', tenantId, periodId)
      ).rejects.toThrow('Reporting period not found');
    });

    it('throws for unknown framework', async () => {
      await expect(
        reportService.getCoverage('INVALID', tenantId, periodId)
      ).rejects.toThrow('Unknown framework');
    });

    it('returns coverage summary with per-section breakdown', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.getCoverageSummary).mockResolvedValue(mockCoverageSummary);
      vi.mocked(reportRepository.getCoverageWarningThreshold).mockResolvedValue(80);

      const result = await reportService.getCoverage('BRSR', tenantId, periodId);

      expect(result.framework).toBe('BRSR');
      expect(result.periodId).toBe(periodId);
      expect(result.totalParams).toBe(100);
      expect(result.hasValue).toBe(60);
      expect(result.verified).toBe(40);
      expect(result.notApplicable).toBe(10);
      expect(result.percentComplete).toBe(70);
      expect(result.warningThreshold).toBe(80);
      expect(result.belowThreshold).toBe(true);
      expect(result.sections).toHaveLength(2);
    });

    it('computes per-section percentComplete correctly', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.getCoverageSummary).mockResolvedValue({
        totalParams: 10,
        hasValue: 6,
        verified: 3,
        notApplicable: 2,
        percentComplete: 80,
        sections: [
          { standardSection: 'P1 – Ethics', totalParams: 10, hasValue: 6, verified: 3, notApplicable: 2 },
        ],
      });
      vi.mocked(reportRepository.getCoverageWarningThreshold).mockResolvedValue(80);

      const result = await reportService.getCoverage('BRSR', tenantId, periodId);

      // (6 + 2) / 10 * 100 = 80
      expect(result.sections[0].percentComplete).toBe(80);
    });

    it('marks belowThreshold as false when coverage meets threshold', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.getCoverageSummary).mockResolvedValue({
        ...mockCoverageSummary,
        percentComplete: 85,
      });
      vi.mocked(reportRepository.getCoverageWarningThreshold).mockResolvedValue(80);

      const result = await reportService.getCoverage('BRSR', tenantId, periodId);

      expect(result.belowThreshold).toBe(false);
    });

    it('handles zero totalParams gracefully', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.getCoverageSummary).mockResolvedValue({
        totalParams: 0,
        hasValue: 0,
        verified: 0,
        notApplicable: 0,
        percentComplete: 0,
        sections: [],
      });
      vi.mocked(reportRepository.getCoverageWarningThreshold).mockResolvedValue(80);

      const result = await reportService.getCoverage('BRSR', tenantId, periodId);

      expect(result.totalParams).toBe(0);
      expect(result.percentComplete).toBe(0);
      expect(result.sections).toHaveLength(0);
      expect(result.belowThreshold).toBe(true);
    });

    it('passes correct arguments to getCoverageSummary', async () => {
      vi.mocked(reportRepository.findPeriodById).mockResolvedValue(mockPeriod);
      vi.mocked(reportRepository.getCoverageSummary).mockResolvedValue(mockCoverageSummary);
      vi.mocked(reportRepository.getCoverageWarningThreshold).mockResolvedValue(80);

      await reportService.getCoverage('BRSR', tenantId, periodId);

      expect(reportRepository.getCoverageSummary).toHaveBeenCalledWith(
        tenantId,
        'BRSR',
        periodId
      );
    });
  });
});
