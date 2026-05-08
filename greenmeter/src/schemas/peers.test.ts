import { describe, it, expect } from 'vitest';
import {
  createPeerSchema,
  updatePeerSchema,
  peerListFilterSchema,
  peerValuesFilterSchema,
} from './peers';

describe('createPeerSchema', () => {
  it('accepts valid peer with all fields', () => {
    const result = createPeerSchema.safeParse({
      name: 'Tata Steel',
      sector: 'Materials',
      country: 'India',
      marketCap: 'large_cap',
      exchange: 'BSE',
    });
    expect(result.success).toBe(true);
  });

  it('accepts peer with only name', () => {
    const result = createPeerSchema.safeParse({ name: 'Simple Corp' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createPeerSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createPeerSchema.safeParse({ sector: 'Technology' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid marketCap', () => {
    const result = createPeerSchema.safeParse({
      name: 'Test',
      marketCap: 'mega_cap',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid marketCap values', () => {
    for (const cap of ['large_cap', 'mid_cap', 'small_cap']) {
      const result = createPeerSchema.safeParse({ name: 'Test', marketCap: cap });
      expect(result.success).toBe(true);
    }
  });
});

describe('updatePeerSchema', () => {
  it('accepts partial updates', () => {
    const result = updatePeerSchema.safeParse({ sector: 'Industrials' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updatePeerSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts null values for nullable fields', () => {
    const result = updatePeerSchema.safeParse({
      sector: null,
      country: null,
      marketCap: null,
      exchange: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts active boolean', () => {
    const result = updatePeerSchema.safeParse({ active: false });
    expect(result.success).toBe(true);
  });

  it('rejects invalid marketCap', () => {
    const result = updatePeerSchema.safeParse({ marketCap: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('peerListFilterSchema', () => {
  it('applies default pagination', () => {
    const result = peerListFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('accepts search parameter', () => {
    const result = peerListFilterSchema.safeParse({ search: 'Tata' });
    expect(result.success).toBe(true);
  });

  it('accepts sector filter', () => {
    const result = peerListFilterSchema.safeParse({ sector: 'Technology' });
    expect(result.success).toBe(true);
  });

  it('coerces page to number', () => {
    const result = peerListFilterSchema.safeParse({ page: '3' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });
});

describe('peerValuesFilterSchema', () => {
  it('applies default pagination', () => {
    const result = peerValuesFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('accepts fiscalYear filter', () => {
    const result = peerValuesFilterSchema.safeParse({ fiscalYear: 'FY2024' });
    expect(result.success).toBe(true);
  });

  it('accepts valid paramId', () => {
    const result = peerValuesFilterSchema.safeParse({
      paramId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid paramId', () => {
    const result = peerValuesFilterSchema.safeParse({ paramId: 'not-uuid' });
    expect(result.success).toBe(false);
  });
});
