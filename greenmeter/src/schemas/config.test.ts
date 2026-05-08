import { describe, it, expect } from 'vitest';
import { thresholdSchema, weightSchema } from './config';

describe('config schemas', () => {
  describe('thresholdSchema', () => {
    it('accepts valid threshold', () => {
      const result = thresholdSchema.safeParse({
        redMax: '30',
        amberMax: '60',
        pillar: 'E',
      });
      expect(result.success).toBe(true);
    });

    it('rejects redMax > amberMax', () => {
      const result = thresholdSchema.safeParse({
        redMax: '70',
        amberMax: '60',
      });
      expect(result.success).toBe(false);
    });

    it('accepts redMax == amberMax', () => {
      const result = thresholdSchema.safeParse({
        redMax: '50',
        amberMax: '50',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-numeric redMax', () => {
      const result = thresholdSchema.safeParse({
        redMax: 'abc',
        amberMax: '60',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('weightSchema', () => {
    it('accepts valid weight (percentage)', () => {
      const result = weightSchema.safeParse({
        pillar: 'E',
        category: 'Emissions',
        weight: '40',
      });
      expect(result.success).toBe(true);
    });

    it('accepts weight of 0', () => {
      const result = weightSchema.safeParse({
        pillar: 'E',
        category: 'Emissions',
        weight: '0',
      });
      expect(result.success).toBe(true);
    });

    it('accepts weight of 100', () => {
      const result = weightSchema.safeParse({
        pillar: 'E',
        category: 'Emissions',
        weight: '100',
      });
      expect(result.success).toBe(true);
    });

    it('rejects weight > 100', () => {
      const result = weightSchema.safeParse({
        pillar: 'S',
        category: 'Workforce',
        weight: '101',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weight < 0', () => {
      const result = weightSchema.safeParse({
        pillar: 'G',
        category: 'Ethics',
        weight: '-1',
      });
      expect(result.success).toBe(false);
    });

    it('requires all fields', () => {
      const result = weightSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects invalid pillar', () => {
      const result = weightSchema.safeParse({
        pillar: 'X',
        category: 'Test',
        weight: '50',
      });
      expect(result.success).toBe(false);
    });
  });
});
