import { describe, it, expect } from 'vitest';
import { extractionTriggerSchema, mappingDecisionSchema, batchMappingSchema, mappingReviewDecisionSchema } from './extraction';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

describe('extraction schemas', () => {
  describe('extractionTriggerSchema', () => {
    it('accepts valid trigger', () => {
      const result = extractionTriggerSchema.safeParse({
        docId: validUUID,
        standard: 'BRSR',
      });
      expect(result.success).toBe(true);
    });

    it('requires docId and standard', () => {
      const result = extractionTriggerSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts optional peerId', () => {
      const result = extractionTriggerSchema.safeParse({
        docId: validUUID,
        standard: 'ESRS',
        peerId: validUUID,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid standard', () => {
      const result = extractionTriggerSchema.safeParse({
        docId: validUUID,
        standard: 'IFRS_S2',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('mappingDecisionSchema', () => {
    it('accepts valid mapping decision', () => {
      const result = mappingDecisionSchema.safeParse({
        metricId: validUUID,
        paramId: validUUID,
        mappingStatus: 'manual_mapped',
      });
      expect(result.success).toBe(true);
    });

    it('accepts rejected without paramId', () => {
      const result = mappingDecisionSchema.safeParse({
        metricId: validUUID,
        mappingStatus: 'rejected',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('batchMappingSchema', () => {
    it('accepts array of decisions', () => {
      const result = batchMappingSchema.safeParse({
        decisions: [
          { metricId: validUUID, paramId: validUUID, mappingStatus: 'auto_mapped' },
          { metricId: validUUID, mappingStatus: 'unmatched' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty decisions array', () => {
      const result = batchMappingSchema.safeParse({ decisions: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('mappingReviewDecisionSchema', () => {
    it('validates confirm action', () => {
      const result = mappingReviewDecisionSchema.safeParse({
        metricId: validUUID,
        action: 'confirm',
      });
      expect(result.success).toBe(true);
    });

    it('validates reject action', () => {
      const result = mappingReviewDecisionSchema.safeParse({
        metricId: validUUID,
        action: 'reject',
      });
      expect(result.success).toBe(true);
    });

    it('validates reassign action with paramId', () => {
      const result = mappingReviewDecisionSchema.safeParse({
        metricId: validUUID,
        action: 'reassign',
        paramId: validUUID,
      });
      expect(result.success).toBe(true);
    });

    it('rejects reassign action without paramId', () => {
      const result = mappingReviewDecisionSchema.safeParse({
        metricId: validUUID,
        action: 'reassign',
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown actions', () => {
      const result = mappingReviewDecisionSchema.safeParse({
        metricId: validUUID,
        action: 'unknown',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid metricId format', () => {
      const result = mappingReviewDecisionSchema.safeParse({
        metricId: 'not-a-uuid',
        action: 'confirm',
      });
      expect(result.success).toBe(false);
    });

    it('allows optional paramId on confirm and reject', () => {
      const confirmResult = mappingReviewDecisionSchema.safeParse({
        metricId: validUUID,
        action: 'confirm',
        paramId: validUUID,
      });
      expect(confirmResult.success).toBe(true);

      const rejectResult = mappingReviewDecisionSchema.safeParse({
        metricId: validUUID,
        action: 'reject',
      });
      expect(rejectResult.success).toBe(true);
    });
  });
});
