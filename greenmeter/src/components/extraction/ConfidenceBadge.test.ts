import { describe, it, expect } from 'vitest';
import { getConfidenceVariant, getConfidenceLabel } from './ConfidenceBadge';

describe('ConfidenceBadge logic', () => {
  describe('getConfidenceVariant', () => {
    it('returns "success" for confidence >= 85', () => {
      expect(getConfidenceVariant(85)).toBe('success');
      expect(getConfidenceVariant(100)).toBe('success');
      expect(getConfidenceVariant(95)).toBe('success');
    });

    it('returns "warning" for confidence 60-84', () => {
      expect(getConfidenceVariant(60)).toBe('warning');
      expect(getConfidenceVariant(70)).toBe('warning');
      expect(getConfidenceVariant(84)).toBe('warning');
    });

    it('returns "error" for confidence < 60', () => {
      expect(getConfidenceVariant(0)).toBe('error');
      expect(getConfidenceVariant(30)).toBe('error');
      expect(getConfidenceVariant(59)).toBe('error');
    });
  });

  describe('getConfidenceLabel', () => {
    it('returns "High" for confidence >= 85', () => {
      expect(getConfidenceLabel(85)).toBe('High');
      expect(getConfidenceLabel(100)).toBe('High');
    });

    it('returns "Medium" for confidence 60-84', () => {
      expect(getConfidenceLabel(60)).toBe('Medium');
      expect(getConfidenceLabel(75)).toBe('Medium');
    });

    it('returns "Low" for confidence < 60', () => {
      expect(getConfidenceLabel(0)).toBe('Low');
      expect(getConfidenceLabel(50)).toBe('Low');
    });
  });
});
