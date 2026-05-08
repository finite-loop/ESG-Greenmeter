import { describe, it, expect } from 'vitest';
import { parameterListFilterSchema, parameterOverrideSchema } from './parameters';

describe('parameters schemas', () => {
  describe('parameterListFilterSchema', () => {
    it('accepts empty filter (defaults applied)', () => {
      const result = parameterListFilterSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('accepts standard filter', () => {
      const result = parameterListFilterSchema.safeParse({ standard: 'BRSR' });
      expect(result.success).toBe(true);
    });

    it('accepts pillar filter', () => {
      const result = parameterListFilterSchema.safeParse({ pillar: 'E' });
      expect(result.success).toBe(true);
    });

    it('accepts category filter', () => {
      const result = parameterListFilterSchema.safeParse({ category: 'Climate' });
      expect(result.success).toBe(true);
    });

    it('accepts search filter', () => {
      const result = parameterListFilterSchema.safeParse({ search: 'emissions' });
      expect(result.success).toBe(true);
    });

    it('accepts all filters combined', () => {
      const result = parameterListFilterSchema.safeParse({
        standard: 'GRI',
        pillar: 'S',
        category: 'Diversity',
        search: 'women',
        page: '2',
        pageSize: '10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.standard).toBe('GRI');
        expect(result.data.pillar).toBe('S');
        expect(result.data.category).toBe('Diversity');
        expect(result.data.search).toBe('women');
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(10);
      }
    });

    it('rejects invalid standard', () => {
      const result = parameterListFilterSchema.safeParse({ standard: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid pillar', () => {
      const result = parameterListFilterSchema.safeParse({ pillar: 'X' });
      expect(result.success).toBe(false);
    });

    it('coerces page and pageSize to numbers', () => {
      const result = parameterListFilterSchema.parse({ page: '3', pageSize: '10' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
    });

    it('rejects pageSize over 100', () => {
      const result = parameterListFilterSchema.safeParse({ pageSize: '200' });
      expect(result.success).toBe(false);
    });

    it('rejects search over 255 characters', () => {
      const result = parameterListFilterSchema.safeParse({ search: 'a'.repeat(256) });
      expect(result.success).toBe(false);
    });
  });

  describe('parameterOverrideSchema', () => {
    it('accepts partial override with name', () => {
      const result = parameterOverrideSchema.safeParse({ name: 'Custom Name' });
      expect(result.success).toBe(true);
    });

    it('rejects empty object (requires at least one field)', () => {
      const result = parameterOverrideSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts all override fields', () => {
      const result = parameterOverrideSchema.safeParse({
        name: 'Custom Name',
        description: 'Custom desc',
        unit: 'tCO2e',
        category: 'Custom Cat',
        direction: 'higher_is_better',
        rollupMethod: 'AVG',
        howToMeasure: 'Custom measure',
        howToCompute: 'Custom compute',
        howToReport: 'Custom report',
        depts: ['Operations', 'Finance'],
        status: 'inactive',
      });
      expect(result.success).toBe(true);
    });

    it('accepts nullable fields', () => {
      const result = parameterOverrideSchema.safeParse({
        category: null,
        howToMeasure: null,
        howToCompute: null,
        howToReport: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid direction', () => {
      const result = parameterOverrideSchema.safeParse({ direction: 'neutral' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid rollupMethod', () => {
      const result = parameterOverrideSchema.safeParse({ rollupMethod: 'MIN' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid status', () => {
      const result = parameterOverrideSchema.safeParse({ status: 'deleted' });
      expect(result.success).toBe(false);
    });

    it('rejects name over 255 characters', () => {
      const result = parameterOverrideSchema.safeParse({ name: 'a'.repeat(256) });
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = parameterOverrideSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });
  });
});
