import { describe, it, expect } from 'vitest';
import { auditFilterSchema } from './audit';

describe('auditFilterSchema', () => {
  it('applies default pagination when no params provided', () => {
    const result = auditFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('parses valid complete filters', () => {
    const result = auditFilterSchema.parse({
      entityType: 'kpi_value',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'CREATE',
      dateFrom: '2024-01-01T00:00:00Z',
      dateTo: '2024-12-31T23:59:59Z',
      page: '2',
      pageSize: '50',
    });

    expect(result.entityType).toBe('kpi_value');
    expect(result.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.action).toBe('CREATE');
    expect(result.dateFrom).toBeInstanceOf(Date);
    expect(result.dateTo).toBeInstanceOf(Date);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
  });

  it('accepts all valid action values', () => {
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'VERIFY', 'IMPORT'] as const;
    for (const action of actions) {
      const result = auditFilterSchema.parse({ action });
      expect(result.action).toBe(action);
    }
  });

  it('rejects invalid action value', () => {
    const result = auditFilterSchema.safeParse({ action: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for userId', () => {
    const result = auditFilterSchema.safeParse({ userId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('coerces string page numbers to integers', () => {
    const result = auditFilterSchema.parse({ page: '3', pageSize: '25' });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(25);
  });

  it('rejects pageSize over 100', () => {
    const result = auditFilterSchema.safeParse({ pageSize: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects page less than 1', () => {
    const result = auditFilterSchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('allows optional fields to be omitted', () => {
    const result = auditFilterSchema.parse({ page: '1', pageSize: '10' });
    expect(result.entityType).toBeUndefined();
    expect(result.userId).toBeUndefined();
    expect(result.action).toBeUndefined();
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
  });
});
