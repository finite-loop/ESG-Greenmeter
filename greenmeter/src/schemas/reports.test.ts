import { describe, it, expect } from 'vitest';
import { reportGenerateSchema, reportGenerateByFrameworkSchema, reportFilterSchema, coverageFilterSchema } from './reports';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

describe('reports schemas', () => {
  describe('reportGenerateSchema', () => {
    it('accepts valid input', () => {
      const result = reportGenerateSchema.safeParse({
        templateId: validUUID,
        periodId: validUUID,
        name: 'Q1 2024 BRSR Report',
      });
      expect(result.success).toBe(true);
    });

    it('defaults format to pdf', () => {
      const result = reportGenerateSchema.parse({
        templateId: validUUID,
        periodId: validUUID,
        name: 'Test Report',
      });
      expect(result.format).toBe('pdf');
    });

    it('accepts all valid formats', () => {
      for (const format of ['pdf', 'xbrl', 'excel']) {
        const result = reportGenerateSchema.safeParse({
          templateId: validUUID,
          periodId: validUUID,
          name: 'Test',
          format,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects empty name', () => {
      const result = reportGenerateSchema.safeParse({
        templateId: validUUID,
        periodId: validUUID,
        name: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reportGenerateByFrameworkSchema', () => {
    it('accepts valid framework and periodId', () => {
      const result = reportGenerateByFrameworkSchema.safeParse({
        framework: 'BRSR',
        periodId: validUUID,
      });
      expect(result.success).toBe(true);
    });

    it('defaults format to pdf', () => {
      const result = reportGenerateByFrameworkSchema.parse({
        framework: 'ESRS',
        periodId: validUUID,
      });
      expect(result.format).toBe('pdf');
    });

    it('accepts all four frameworks', () => {
      for (const framework of ['BRSR', 'ESRS', 'GRI', 'IFRS_S2']) {
        const result = reportGenerateByFrameworkSchema.safeParse({
          framework,
          periodId: validUUID,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects unknown framework', () => {
      const result = reportGenerateByFrameworkSchema.safeParse({
        framework: 'UNKNOWN',
        periodId: validUUID,
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing periodId', () => {
      const result = reportGenerateByFrameworkSchema.safeParse({
        framework: 'BRSR',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional nodeId', () => {
      const result = reportGenerateByFrameworkSchema.safeParse({
        framework: 'BRSR',
        periodId: validUUID,
        nodeId: validUUID,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('reportFilterSchema', () => {
    it('accepts empty filter', () => {
      const result = reportFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid status filter', () => {
      const result = reportFilterSchema.safeParse({ status: 'complete' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = reportFilterSchema.safeParse({ status: 'unknown' });
      expect(result.success).toBe(false);
    });
  });

  describe('coverageFilterSchema', () => {
    it('accepts valid framework and periodId', () => {
      const result = coverageFilterSchema.safeParse({
        framework: 'BRSR',
        periodId: validUUID,
      });
      expect(result.success).toBe(true);
    });

    it('accepts all four frameworks', () => {
      for (const framework of ['BRSR', 'ESRS', 'GRI', 'IFRS_S2']) {
        const result = coverageFilterSchema.safeParse({
          framework,
          periodId: validUUID,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects unknown framework', () => {
      const result = coverageFilterSchema.safeParse({
        framework: 'UNKNOWN',
        periodId: validUUID,
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing framework', () => {
      const result = coverageFilterSchema.safeParse({
        periodId: validUUID,
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing periodId', () => {
      const result = coverageFilterSchema.safeParse({
        framework: 'BRSR',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid periodId (not UUID)', () => {
      const result = coverageFilterSchema.safeParse({
        framework: 'BRSR',
        periodId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});
