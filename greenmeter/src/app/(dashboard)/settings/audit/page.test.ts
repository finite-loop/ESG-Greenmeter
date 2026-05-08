import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the audit page data-fetching logic and filter building
describe('Audit Log Page', () => {
  describe('buildAuditQueryString', () => {
    it('builds empty query for default filters', async () => {
      const { buildAuditQueryString } = await import('./audit-utils');
      const qs = buildAuditQueryString({});
      expect(qs).toBe('?page=1&pageSize=20');
    });

    it('includes entityType filter when provided', async () => {
      const { buildAuditQueryString } = await import('./audit-utils');
      const qs = buildAuditQueryString({ entityType: 'kpi_value' });
      expect(qs).toContain('entityType=kpi_value');
    });

    it('includes action filter when provided', async () => {
      const { buildAuditQueryString } = await import('./audit-utils');
      const qs = buildAuditQueryString({ action: 'CREATE' });
      expect(qs).toContain('action=CREATE');
    });

    it('includes userId filter when provided', async () => {
      const { buildAuditQueryString } = await import('./audit-utils');
      const qs = buildAuditQueryString({ userId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(qs).toContain('userId=550e8400-e29b-41d4-a716-446655440000');
    });

    it('includes date range filters when provided', async () => {
      const { buildAuditQueryString } = await import('./audit-utils');
      const qs = buildAuditQueryString({ dateFrom: '2025-01-01', dateTo: '2025-12-31' });
      expect(qs).toContain('dateFrom=2025-01-01');
      expect(qs).toContain('dateTo=2025-12-31');
    });

    it('includes page and pageSize params', async () => {
      const { buildAuditQueryString } = await import('./audit-utils');
      const qs = buildAuditQueryString({ page: 3, pageSize: 50 });
      expect(qs).toContain('page=3');
      expect(qs).toContain('pageSize=50');
    });

    it('omits undefined/empty filter values', async () => {
      const { buildAuditQueryString } = await import('./audit-utils');
      const qs = buildAuditQueryString({ entityType: '', action: undefined });
      expect(qs).not.toContain('entityType');
      expect(qs).not.toContain('action');
    });
  });

  describe('formatAuditTimestamp', () => {
    it('formats ISO date to readable string', async () => {
      const { formatAuditTimestamp } = await import('./audit-utils');
      const result = formatAuditTimestamp('2025-06-15T14:30:00.000Z');
      expect(result).toContain('2025');
      // Time is locale-dependent, just verify format includes hours and minutes
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('returns fallback for empty string', async () => {
      const { formatAuditTimestamp } = await import('./audit-utils');
      expect(formatAuditTimestamp('')).toBe('—');
    });

    it('returns fallback for invalid date string', async () => {
      const { formatAuditTimestamp } = await import('./audit-utils');
      expect(formatAuditTimestamp('not-a-date')).toBe('—');
    });
  });

  describe('computeJsonDiff', () => {
    it('returns empty array when both values are null', async () => {
      const { computeJsonDiff } = await import('./audit-utils');
      const diff = computeJsonDiff(null, null);
      expect(diff).toEqual([]);
    });

    it('marks all keys as added when oldValue is null', async () => {
      const { computeJsonDiff } = await import('./audit-utils');
      const diff = computeJsonDiff(null, { name: 'Test', value: 42 });
      expect(diff).toEqual([
        { key: 'name', oldVal: undefined, newVal: 'Test', type: 'added' },
        { key: 'value', oldVal: undefined, newVal: 42, type: 'added' },
      ]);
    });

    it('marks all keys as removed when newValue is null', async () => {
      const { computeJsonDiff } = await import('./audit-utils');
      const diff = computeJsonDiff({ name: 'Test', value: 42 }, null);
      expect(diff).toEqual([
        { key: 'name', oldVal: 'Test', newVal: undefined, type: 'removed' },
        { key: 'value', oldVal: 42, newVal: undefined, type: 'removed' },
      ]);
    });

    it('identifies changed keys', async () => {
      const { computeJsonDiff } = await import('./audit-utils');
      const diff = computeJsonDiff({ name: 'Old', value: 1 }, { name: 'New', value: 1 });
      expect(diff).toContainEqual({ key: 'name', oldVal: 'Old', newVal: 'New', type: 'changed' });
    });

    it('identifies unchanged keys', async () => {
      const { computeJsonDiff } = await import('./audit-utils');
      const diff = computeJsonDiff({ name: 'Same', value: 1 }, { name: 'Same', value: 2 });
      expect(diff).toContainEqual({ key: 'name', oldVal: 'Same', newVal: 'Same', type: 'unchanged' });
    });

    it('returns empty array for non-object values (arrays)', async () => {
      const { computeJsonDiff } = await import('./audit-utils');
      const diff = computeJsonDiff([1, 2, 3] as unknown as null, [4, 5] as unknown as null);
      expect(diff).toEqual([]);
    });

    it('returns empty array for primitive values', async () => {
      const { computeJsonDiff } = await import('./audit-utils');
      const diff = computeJsonDiff('hello' as unknown as null, 'world' as unknown as null);
      expect(diff).toEqual([]);
    });

    it('treats non-object oldValue as null and diffs against newValue object', async () => {
      const { computeJsonDiff } = await import('./audit-utils');
      const diff = computeJsonDiff([1, 2] as unknown as null, { name: 'Test' });
      expect(diff).toEqual([
        { key: 'name', oldVal: undefined, newVal: 'Test', type: 'added' },
      ]);
    });
  });

  describe('ENTITY_TYPES', () => {
    it('exports a non-empty list of entity types', async () => {
      const { ENTITY_TYPES } = await import('./audit-utils');
      expect(ENTITY_TYPES.length).toBeGreaterThan(0);
      expect(ENTITY_TYPES).toContain('kpi_value');
      expect(ENTITY_TYPES).toContain('user');
    });
  });

  describe('ACTION_TYPES', () => {
    it('exports all valid action types', async () => {
      const { ACTION_TYPES } = await import('./audit-utils');
      expect(ACTION_TYPES).toContain('CREATE');
      expect(ACTION_TYPES).toContain('UPDATE');
      expect(ACTION_TYPES).toContain('DELETE');
      expect(ACTION_TYPES).toContain('VERIFY');
      expect(ACTION_TYPES).toContain('IMPORT');
    });
  });
});
