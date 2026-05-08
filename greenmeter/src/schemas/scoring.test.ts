import { describe, it, expect } from 'vitest';
import { scoreRequestSchema, scoreRecomputeRequestSchema, scoreListFilterSchema } from './scoring';

describe('scoring schemas', () => {
  describe('scoreRequestSchema', () => {
    it('accepts valid UUIDs', () => {
      const result = scoreRequestSchema.safeParse({
        nodeId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        periodId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing nodeId', () => {
      const result = scoreRequestSchema.safeParse({
        periodId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid UUID format', () => {
      const result = scoreRequestSchema.safeParse({
        nodeId: 'not-a-uuid',
        periodId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('scoreRecomputeRequestSchema', () => {
    it('accepts valid periodId', () => {
      const result = scoreRecomputeRequestSchema.safeParse({
        periodId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing periodId', () => {
      const result = scoreRecomputeRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('scoreListFilterSchema', () => {
    it('accepts empty filter (defaults)', () => {
      const result = scoreListFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it('accepts full filter', () => {
      const result = scoreListFilterSchema.safeParse({
        nodeId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        periodId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        pillar: 'E',
        page: '2',
        pageSize: '10',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid pillar', () => {
      const result = scoreListFilterSchema.safeParse({
        pillar: 'X',
      });
      expect(result.success).toBe(false);
    });
  });
});
