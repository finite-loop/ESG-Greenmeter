import { describe, it, expect } from 'vitest';
import { companyProfileSchema, frameworkSelectionSchema, orgHierarchySchema, fiscalYearSchema } from './onboarding';

describe('companyProfileSchema', () => {
  it('accepts valid company profile', () => {
    const result = companyProfileSchema.parse({
      companyName: 'Acme Corp',
      sector: 'Energy',
      country: 'India',
      currency: 'INR',
    });
    expect(result.companyName).toBe('Acme Corp');
    expect(result.sector).toBe('Energy');
    expect(result.country).toBe('India');
    expect(result.currency).toBe('INR');
  });

  it('rejects empty company name', () => {
    const result = companyProfileSchema.safeParse({
      companyName: '',
      sector: 'Energy',
      country: 'India',
      currency: 'INR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects too-short company name', () => {
    const result = companyProfileSchema.safeParse({
      companyName: 'A',
      sector: 'Energy',
      country: 'India',
      currency: 'INR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid sector', () => {
    const result = companyProfileSchema.safeParse({
      companyName: 'Acme Corp',
      sector: 'Unknown Sector',
      country: 'India',
      currency: 'INR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid currency', () => {
    const result = companyProfileSchema.safeParse({
      companyName: 'Acme Corp',
      sector: 'Energy',
      country: 'India',
      currency: 'JPY',
    });
    expect(result.success).toBe(false);
  });

  it('requires all fields', () => {
    const result = companyProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('frameworkSelectionSchema', () => {
  it('accepts valid single framework', () => {
    const result = frameworkSelectionSchema.parse({ frameworks: ['BRSR'] });
    expect(result.frameworks).toEqual(['BRSR']);
  });

  it('accepts multiple frameworks', () => {
    const result = frameworkSelectionSchema.parse({
      frameworks: ['BRSR', 'ESRS', 'GRI', 'IFRS_S2'],
    });
    expect(result.frameworks).toHaveLength(4);
  });

  it('rejects empty frameworks array', () => {
    const result = frameworkSelectionSchema.safeParse({ frameworks: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid framework value', () => {
    const result = frameworkSelectionSchema.safeParse({ frameworks: ['INVALID'] });
    expect(result.success).toBe(false);
  });

  it('rejects missing frameworks field', () => {
    const result = frameworkSelectionSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('orgHierarchySchema', () => {
  it('accepts valid hierarchy with one company node', () => {
    const result = orgHierarchySchema.parse({
      nodes: [
        { tempId: 't1', parentTempId: null, name: 'Acme Corp', nodeType: 'company' },
        { tempId: 't2', parentTempId: 't1', name: 'Plant A', nodeType: 'facility' },
      ],
    });
    expect(result.nodes).toHaveLength(2);
  });

  it('rejects empty nodes array', () => {
    const result = orgHierarchySchema.safeParse({ nodes: [] });
    expect(result.success).toBe(false);
  });

  it('rejects hierarchy without a company node', () => {
    const result = orgHierarchySchema.safeParse({
      nodes: [
        { tempId: 't1', parentTempId: null, name: 'Dept A', nodeType: 'department' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects hierarchy with multiple company nodes', () => {
    const result = orgHierarchySchema.safeParse({
      nodes: [
        { tempId: 't1', parentTempId: null, name: 'Corp A', nodeType: 'company' },
        { tempId: 't2', parentTempId: null, name: 'Corp B', nodeType: 'company' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts node with optional currency', () => {
    const result = orgHierarchySchema.parse({
      nodes: [
        { tempId: 't1', parentTempId: null, name: 'Acme', nodeType: 'company', currency: 'USD' },
      ],
    });
    expect(result.nodes[0].currency).toBe('USD');
  });

  it('rejects invalid node type', () => {
    const result = orgHierarchySchema.safeParse({
      nodes: [
        { tempId: 't1', parentTempId: null, name: 'Acme', nodeType: 'invalid' },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('fiscalYearSchema', () => {
  it('accepts valid start month', () => {
    const result = fiscalYearSchema.parse({ startMonth: 4 });
    expect(result.startMonth).toBe(4);
  });

  it('accepts January (month 1)', () => {
    const result = fiscalYearSchema.parse({ startMonth: 1 });
    expect(result.startMonth).toBe(1);
  });

  it('accepts December (month 12)', () => {
    const result = fiscalYearSchema.parse({ startMonth: 12 });
    expect(result.startMonth).toBe(12);
  });

  it('rejects month 0', () => {
    const result = fiscalYearSchema.safeParse({ startMonth: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects month 13', () => {
    const result = fiscalYearSchema.safeParse({ startMonth: 13 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer', () => {
    const result = fiscalYearSchema.safeParse({ startMonth: 4.5 });
    expect(result.success).toBe(false);
  });
});
