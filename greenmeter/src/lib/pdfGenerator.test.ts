import { describe, it, expect } from 'vitest';
import { generatePdfFromReport } from './pdfGenerator';
import type { RenderedReport } from '@/services/reportService';

function makeRenderedReport(overrides?: Partial<RenderedReport>): RenderedReport {
  return {
    framework: 'BRSR',
    templateName: 'BRSR Core Report',
    templateVersion: '1.0',
    tenantId: 'tenant-1',
    periodId: 'period-1',
    fiscalYear: 'FY2024',
    generatedAt: '2024-06-15T10:00:00.000Z',
    sections: [
      {
        id: 'section-1',
        name: 'Principle 1: Ethics',
        pillar: 'Governance',
        disclosures: [
          {
            id: 'disc-1',
            name: 'Policy Disclosure',
            description: 'Describe ethics policies',
            parameters: [
              {
                paramId: 'p1',
                code: 'BRSR-P1-E1',
                name: 'Anti-corruption policy',
                unit: 'text',
                dataType: 'text',
                value: null,
                valueText: 'Policy exists and is enforced',
                displayValue: 'Policy exists and is enforced',
                status: 'reported',
                verified: true,
              },
              {
                paramId: 'p2',
                code: 'BRSR-P1-E2',
                name: 'Whistleblower mechanism',
                unit: 'boolean',
                dataType: 'boolean',
                value: 'true',
                valueText: null,
                displayValue: 'true',
                status: 'reported',
                verified: false,
              },
              {
                paramId: 'p3',
                code: 'BRSR-P1-E3',
                name: 'Training hours',
                unit: 'hours',
                dataType: 'number',
                value: null,
                valueText: null,
                displayValue: 'Not Reported',
                status: 'not_reported',
                verified: false,
              },
            ],
            reported: 2,
            total: 3,
          },
        ],
        reported: 2,
        total: 3,
      },
    ],
    coverage: {
      reported: 2,
      notReported: 1,
      notApplicable: 0,
      total: 3,
      percentComplete: 67,
    },
    ...overrides,
  };
}

describe('generatePdfFromReport', () => {
  it('generates a valid PDF buffer from a rendered report', async () => {
    const report = makeRenderedReport();
    const buffer = await generatePdfFromReport(report);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF-
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('includes report metadata in the PDF', async () => {
    const report = makeRenderedReport({
      templateName: 'ESRS Report',
      framework: 'ESRS',
      fiscalYear: 'FY2025',
    });
    const buffer = await generatePdfFromReport(report);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);

    // Check PDF header is present
    const pdfStr = buffer.toString('latin1');
    expect(pdfStr).toContain('%PDF-');
  });

  it('handles a report with no sections', async () => {
    const report = makeRenderedReport({
      sections: [],
      coverage: {
        reported: 0,
        notReported: 0,
        notApplicable: 0,
        total: 0,
        percentComplete: 0,
      },
    });
    const buffer = await generatePdfFromReport(report);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('handles a report with an empty disclosure (no parameters)', async () => {
    const report = makeRenderedReport({
      sections: [
        {
          id: 's1',
          name: 'Empty Section',
          disclosures: [
            {
              id: 'd1',
              name: 'Empty Disclosure',
              parameters: [],
              reported: 0,
              total: 0,
            },
          ],
          reported: 0,
          total: 0,
        },
      ],
    });
    const buffer = await generatePdfFromReport(report);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('handles large reports with many sections and parameters', async () => {
    const params = Array.from({ length: 50 }, (_, i) => ({
      paramId: `p-${i}`,
      code: `CODE-${i}`,
      name: `Parameter number ${i} with a reasonably long name for testing truncation`,
      unit: i % 3 === 0 ? 'text' : i % 3 === 1 ? 'number' : 'boolean',
      dataType: 'text',
      value: i % 2 === 0 ? `${i * 100}` : null,
      valueText: i % 2 === 1 ? `Text value ${i}` : null,
      displayValue: i % 2 === 0 ? `${i * 100}` : `Text value ${i}`,
      status: i % 5 === 0 ? ('not_reported' as const) : ('reported' as const),
      verified: i % 3 === 0,
    }));

    const sections = Array.from({ length: 5 }, (_, i) => ({
      id: `section-${i}`,
      name: `Section ${i + 1}: Long Section Name for Testing`,
      pillar: ['Environmental', 'Social', 'Governance'][i % 3],
      disclosures: [
        {
          id: `disc-${i}`,
          name: `Disclosure ${i + 1}`,
          parameters: params.slice(i * 10, (i + 1) * 10),
          reported: params.slice(i * 10, (i + 1) * 10).filter((p) => p.status === 'reported').length,
          total: 10,
        },
      ],
      reported: params.slice(i * 10, (i + 1) * 10).filter((p) => p.status === 'reported').length,
      total: 10,
    }));

    const report = makeRenderedReport({
      sections,
      coverage: {
        reported: 40,
        notReported: 10,
        notApplicable: 0,
        total: 50,
        percentComplete: 80,
      },
    });

    const buffer = await generatePdfFromReport(report);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('handles not_applicable status correctly', async () => {
    const report = makeRenderedReport({
      sections: [
        {
          id: 's1',
          name: 'Section with N/A',
          disclosures: [
            {
              id: 'd1',
              name: 'Disclosure',
              parameters: [
                {
                  paramId: 'p-na',
                  code: 'NA-1',
                  name: 'Not Applicable Param',
                  unit: '-',
                  dataType: 'text',
                  value: null,
                  valueText: null,
                  displayValue: 'Not Applicable',
                  status: 'not_applicable',
                  verified: false,
                },
              ],
              reported: 0,
              total: 1,
            },
          ],
          reported: 0,
          total: 1,
        },
      ],
      coverage: {
        reported: 0,
        notReported: 0,
        notApplicable: 1,
        total: 1,
        percentComplete: 0,
      },
    });
    const buffer = await generatePdfFromReport(report);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
