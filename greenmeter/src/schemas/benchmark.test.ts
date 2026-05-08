import { describe, it, expect } from 'vitest';
import { benchmarkRequestSchema, benchmarkListRequestSchema } from './benchmark';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('benchmarkRequestSchema', () => {
  it('accepts valid request with all fields', () => {
    const result = benchmarkRequestSchema.safeParse({
      canonicalId: VALID_UUID,
      fiscalYear: '2023-24',
      periodId: VALID_UUID,
      sector: 'Energy',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid request with required fields only', () => {
    const result = benchmarkRequestSchema.safeParse({
      canonicalId: VALID_UUID,
      fiscalYear: '2023-24',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing canonicalId', () => {
    const result = benchmarkRequestSchema.safeParse({
      fiscalYear: '2023-24',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fiscalYear', () => {
    const result = benchmarkRequestSchema.safeParse({
      canonicalId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for canonicalId', () => {
    const result = benchmarkRequestSchema.safeParse({
      canonicalId: 'not-a-uuid',
      fiscalYear: '2023-24',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty fiscalYear', () => {
    const result = benchmarkRequestSchema.safeParse({
      canonicalId: VALID_UUID,
      fiscalYear: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for periodId', () => {
    const result = benchmarkRequestSchema.safeParse({
      canonicalId: VALID_UUID,
      fiscalYear: '2023-24',
      periodId: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty sector string', () => {
    const result = benchmarkRequestSchema.safeParse({
      canonicalId: VALID_UUID,
      fiscalYear: '2023-24',
      sector: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects fiscalYear exceeding max length', () => {
    const result = benchmarkRequestSchema.safeParse({
      canonicalId: VALID_UUID,
      fiscalYear: 'a'.repeat(21),
    });
    expect(result.success).toBe(false);
  });
});

describe('benchmarkListRequestSchema', () => {
  it('accepts valid request with fiscalYear only', () => {
    const result = benchmarkListRequestSchema.safeParse({
      fiscalYear: '2023-24',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid request with sector filter', () => {
    const result = benchmarkListRequestSchema.safeParse({
      fiscalYear: '2023-24',
      sector: 'Energy',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fiscalYear', () => {
    const result = benchmarkListRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty fiscalYear', () => {
    const result = benchmarkListRequestSchema.safeParse({ fiscalYear: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty sector string', () => {
    const result = benchmarkListRequestSchema.safeParse({
      fiscalYear: '2023-24',
      sector: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects fiscalYear exceeding max length', () => {
    const result = benchmarkListRequestSchema.safeParse({
      fiscalYear: 'a'.repeat(21),
    });
    expect(result.success).toBe(false);
  });
});
