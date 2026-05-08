import { describe, it, expect } from 'vitest';
import { kpiValueCreateSchema, kpiValueUpdateSchema, kpiValueVerifySchema, kpiBatchVerifySchema, kpiBatchMarkNotApplicableSchema } from './kpi';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

describe('kpi schemas', () => {
  describe('kpiValueCreateSchema', () => {
    it('accepts valid input', () => {
      const result = kpiValueCreateSchema.safeParse({
        paramId: validUUID,
        nodeId: validUUID,
        periodId: validUUID,
        value: '42.5',
        sourceType: 'manual',
      });
      expect(result.success).toBe(true);
    });

    it('requires paramId, nodeId, periodId, sourceType', () => {
      const result = kpiValueCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects invalid sourceType', () => {
      const result = kpiValueCreateSchema.safeParse({
        paramId: validUUID,
        nodeId: validUUID,
        periodId: validUUID,
        sourceType: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid sourceTypes', () => {
      for (const sourceType of ['manual', 'import', 'api', 'extraction']) {
        const result = kpiValueCreateSchema.safeParse({
          paramId: validUUID,
          nodeId: validUUID,
          periodId: validUUID,
          sourceType,
        });
        expect(result.success).toBe(true);
      }
    });

    it('defaults notApplicable to false', () => {
      const result = kpiValueCreateSchema.parse({
        paramId: validUUID,
        nodeId: validUUID,
        periodId: validUUID,
        sourceType: 'manual',
      });
      expect(result.notApplicable).toBe(false);
    });
  });

  describe('kpiValueUpdateSchema', () => {
    it('accepts partial updates', () => {
      const result = kpiValueUpdateSchema.safeParse({ value: '100' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object (all fields optional)', () => {
      const result = kpiValueUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('kpiValueVerifySchema', () => {
    it('accepts valid verify input', () => {
      const result = kpiValueVerifySchema.safeParse({
        valueId: validUUID,
        verified: true,
      });
      expect(result.success).toBe(true);
    });

    it('requires both fields', () => {
      const result = kpiValueVerifySchema.safeParse({ valueId: validUUID });
      expect(result.success).toBe(false);
    });
  });

  describe('kpiBatchVerifySchema', () => {
    it('accepts array of valid UUIDs', () => {
      const result = kpiBatchVerifySchema.safeParse({
        valueIds: [validUUID, '660e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty array', () => {
      const result = kpiBatchVerifySchema.safeParse({ valueIds: [] });
      expect(result.success).toBe(false);
    });

    it('rejects when valueIds is missing', () => {
      const result = kpiBatchVerifySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-UUID strings', () => {
      const result = kpiBatchVerifySchema.safeParse({ valueIds: ['not-uuid'] });
      expect(result.success).toBe(false);
    });

    it('accepts single value', () => {
      const result = kpiBatchVerifySchema.safeParse({ valueIds: [validUUID] });
      expect(result.success).toBe(true);
    });
  });

  describe('kpiBatchMarkNotApplicableSchema', () => {
    it('accepts array of valid UUIDs', () => {
      const result = kpiBatchMarkNotApplicableSchema.safeParse({
        valueIds: [validUUID],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty array', () => {
      const result = kpiBatchMarkNotApplicableSchema.safeParse({ valueIds: [] });
      expect(result.success).toBe(false);
    });
  });
});
