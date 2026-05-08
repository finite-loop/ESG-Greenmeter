import { describe, it, expect } from 'vitest';
import {
  importPreviewMetadataSchema,
  importConfirmSchema,
  importConfirmRowSchema,
} from './kpiImport';

describe('importPreviewMetadataSchema', () => {
  it('accepts valid nodeId and periodId', () => {
    const result = importPreviewMetadataSchema.safeParse({
      nodeId: '550e8400-e29b-41d4-a716-446655440000',
      periodId: '660e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing nodeId', () => {
    const result = importPreviewMetadataSchema.safeParse({
      periodId: '660e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing periodId', () => {
    const result = importPreviewMetadataSchema.safeParse({
      nodeId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID format', () => {
    const result = importPreviewMetadataSchema.safeParse({
      nodeId: 'not-a-uuid',
      periodId: 'also-not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('importConfirmRowSchema', () => {
  it('accepts valid row with value', () => {
    const result = importConfirmRowSchema.safeParse({
      rowIndex: 2,
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      value: '1234.5',
      unit: 'MWh',
    });
    expect(result.success).toBe(true);
  });

  it('accepts row with valueText instead of value', () => {
    const result = importConfirmRowSchema.safeParse({
      rowIndex: 3,
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      valueText: 'Yes',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing paramId', () => {
    const result = importConfirmRowSchema.safeParse({
      rowIndex: 2,
      value: '100',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rowIndex', () => {
    const result = importConfirmRowSchema.safeParse({
      rowIndex: 2.5,
      paramId: '550e8400-e29b-41d4-a716-446655440000',
      value: '100',
    });
    expect(result.success).toBe(false);
  });
});

describe('importConfirmSchema', () => {
  const validRow = {
    rowIndex: 2,
    paramId: '550e8400-e29b-41d4-a716-446655440000',
    value: '100',
  };

  it('accepts valid confirm request', () => {
    const result = importConfirmSchema.safeParse({
      nodeId: '550e8400-e29b-41d4-a716-446655440000',
      periodId: '660e8400-e29b-41d4-a716-446655440001',
      filename: 'test.xlsx',
      rows: [validRow],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty rows array', () => {
    const result = importConfirmSchema.safeParse({
      nodeId: '550e8400-e29b-41d4-a716-446655440000',
      periodId: '660e8400-e29b-41d4-a716-446655440001',
      filename: 'test.xlsx',
      rows: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty filename', () => {
    const result = importConfirmSchema.safeParse({
      nodeId: '550e8400-e29b-41d4-a716-446655440000',
      periodId: '660e8400-e29b-41d4-a716-446655440001',
      filename: '',
      rows: [validRow],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = importConfirmSchema.safeParse({
      rows: [validRow],
    });
    expect(result.success).toBe(false);
  });
});
