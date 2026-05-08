import { describe, it, expect } from 'vitest';
import { documentUploadSchema, documentListFilterSchema, MAX_DOCUMENT_SIZE } from './document';

describe('documentUploadSchema', () => {
  it('accepts valid upload metadata', () => {
    const result = documentUploadSchema.safeParse({
      peerId: '550e8400-e29b-41d4-a716-446655440000',
      standard: 'BRSR',
      fiscalYear: '2024-25',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing peerId', () => {
    const result = documentUploadSchema.safeParse({
      standard: 'BRSR',
      fiscalYear: '2024-25',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid standard', () => {
    const result = documentUploadSchema.safeParse({
      peerId: '550e8400-e29b-41d4-a716-446655440000',
      standard: 'INVALID',
      fiscalYear: '2024-25',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty fiscal year', () => {
    const result = documentUploadSchema.safeParse({
      peerId: '550e8400-e29b-41d4-a716-446655440000',
      standard: 'ESRS',
      fiscalYear: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid standards', () => {
    for (const std of ['BRSR', 'ESRS', 'GRI']) {
      const result = documentUploadSchema.safeParse({
        peerId: '550e8400-e29b-41d4-a716-446655440000',
        standard: std,
        fiscalYear: '2024',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('documentListFilterSchema', () => {
  it('applies default pagination', () => {
    const result = documentListFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('accepts status filter', () => {
    const result = documentListFilterSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(true);
  });

  it('accepts standard filter', () => {
    const result = documentListFilterSchema.safeParse({ standard: 'BRSR' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = documentListFilterSchema.safeParse({ status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('accepts peerId filter', () => {
    const result = documentListFilterSchema.safeParse({
      peerId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('MAX_DOCUMENT_SIZE', () => {
  it('is 50 MB', () => {
    expect(MAX_DOCUMENT_SIZE).toBe(50 * 1024 * 1024);
  });
});
