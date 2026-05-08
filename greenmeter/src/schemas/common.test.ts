import { describe, it, expect } from 'vitest';
import { uuidSchema, paginationSchema, sortSchema, filterSchema, dateRangeSchema } from './common';

describe('common schemas', () => {
  describe('uuidSchema', () => {
    it('accepts valid UUID', () => {
      const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = uuidSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('applies defaults for empty input', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('accepts valid page and pageSize', () => {
      const result = paginationSchema.parse({ page: '3', pageSize: '50' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(50);
    });

    it('rejects page less than 1', () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects pageSize greater than 100', () => {
      const result = paginationSchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it('coerces string numbers', () => {
      const result = paginationSchema.parse({ page: '2', pageSize: '10' });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('sortSchema', () => {
    it('applies default sortOrder', () => {
      const result = sortSchema.parse({});
      expect(result.sortOrder).toBe('asc');
    });

    it('accepts valid sortBy and sortOrder', () => {
      const result = sortSchema.parse({ sortBy: 'name', sortOrder: 'desc' });
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('desc');
    });

    it('rejects invalid sortOrder', () => {
      const result = sortSchema.safeParse({ sortOrder: 'random' });
      expect(result.success).toBe(false);
    });
  });

  describe('filterSchema', () => {
    it('accepts empty object', () => {
      const result = filterSchema.parse({});
      expect(result).toEqual({});
    });

    it('accepts valid standard', () => {
      const result = filterSchema.parse({ standard: 'BRSR' });
      expect(result.standard).toBe('BRSR');
    });

    it('rejects invalid standard', () => {
      const result = filterSchema.safeParse({ standard: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('accepts valid pillar', () => {
      const result = filterSchema.parse({ pillar: 'E' });
      expect(result.pillar).toBe('E');
    });
  });

  describe('dateRangeSchema', () => {
    it('accepts empty object', () => {
      const result = dateRangeSchema.parse({});
      expect(result).toEqual({});
    });

    it('accepts valid date range', () => {
      const result = dateRangeSchema.parse({
        from: '2024-01-01',
        to: '2024-12-31',
      });
      expect(result.from).toBeInstanceOf(Date);
      expect(result.to).toBeInstanceOf(Date);
    });

    it('rejects from after to', () => {
      const result = dateRangeSchema.safeParse({
        from: '2024-12-31',
        to: '2024-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('accepts from equal to to', () => {
      const result = dateRangeSchema.safeParse({
        from: '2024-06-15',
        to: '2024-06-15',
      });
      expect(result.success).toBe(true);
    });
  });
});
