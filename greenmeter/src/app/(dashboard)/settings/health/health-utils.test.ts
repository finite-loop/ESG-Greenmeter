import { describe, it, expect } from 'vitest';

describe('Health Page Utilities', () => {
  describe('statusBadgeVariant', () => {
    it('returns success for healthy status', async () => {
      const { statusBadgeVariant } = await import('./health-utils');
      expect(statusBadgeVariant('healthy')).toBe('success');
    });

    it('returns warning for degraded status', async () => {
      const { statusBadgeVariant } = await import('./health-utils');
      expect(statusBadgeVariant('degraded')).toBe('warning');
    });

    it('returns error for unhealthy status', async () => {
      const { statusBadgeVariant } = await import('./health-utils');
      expect(statusBadgeVariant('unhealthy')).toBe('error');
    });
  });

  describe('formatMs', () => {
    it('returns dash for null', async () => {
      const { formatMs } = await import('./health-utils');
      expect(formatMs(null)).toBe('-');
    });

    it('returns dash for undefined', async () => {
      const { formatMs } = await import('./health-utils');
      expect(formatMs(undefined)).toBe('-');
    });

    it('formats milliseconds under 1000', async () => {
      const { formatMs } = await import('./health-utils');
      expect(formatMs(42)).toBe('42ms');
      expect(formatMs(999)).toBe('999ms');
    });

    it('formats milliseconds as seconds when >= 1000', async () => {
      const { formatMs } = await import('./health-utils');
      expect(formatMs(1000)).toBe('1.0s');
      expect(formatMs(1500)).toBe('1.5s');
      expect(formatMs(12345)).toBe('12.3s');
    });

    it('formats zero correctly', async () => {
      const { formatMs } = await import('./health-utils');
      expect(formatMs(0)).toBe('0ms');
    });
  });

  describe('truncateJobId', () => {
    it('truncates long IDs with ellipsis', async () => {
      const { truncateJobId } = await import('./health-utils');
      expect(truncateJobId('12345678-abcd-efgh-ijkl-mnopqrstuvwx')).toBe('12345678...');
    });

    it('does not truncate short IDs', async () => {
      const { truncateJobId } = await import('./health-utils');
      expect(truncateJobId('12345678')).toBe('12345678');
    });

    it('handles very short IDs', async () => {
      const { truncateJobId } = await import('./health-utils');
      expect(truncateJobId('abc')).toBe('abc');
    });
  });

});
