import { z } from 'zod';

export const SECTORS = [
  'Energy',
  'IT & Technology',
  'Manufacturing',
  'Financial Services',
  'Healthcare',
  'Consumer Goods',
  'Materials',
  'Industrials',
  'Utilities',
  'Real Estate',
  'Telecommunications',
  'Transportation',
] as const;

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;

export const FRAMEWORKS = ['BRSR', 'ESRS', 'GRI', 'IFRS_S2', 'SASB', 'TCFD'] as const;

export const NODE_TYPES = ['company', 'subsidiary', 'facility', 'department'] as const;

export const companyProfileSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  sector: z.enum(SECTORS, { message: 'Please select a sector' }),
  country: z.string().min(2, 'Country is required'),
  currency: z.enum(CURRENCIES, { message: 'Please select a currency' }),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;

export const frameworkSelectionSchema = z.object({
  frameworks: z
    .array(z.enum(FRAMEWORKS))
    .min(1, 'Select at least one framework'),
});

export type FrameworkSelection = z.infer<typeof frameworkSelectionSchema>;

export const orgNodeSchema = z.object({
  tempId: z.string(),
  parentTempId: z.string().nullable(),
  name: z.string().min(1, 'Node name is required'),
  nodeType: z.enum(NODE_TYPES),
  currency: z.enum(CURRENCIES).optional(),
});

export type OrgNodeInput = z.infer<typeof orgNodeSchema>;

export const orgHierarchySchema = z.object({
  nodes: z
    .array(orgNodeSchema)
    .min(1, 'At least one organisation node is required')
    .refine(
      (nodes) => nodes.filter((n) => n.nodeType === 'company').length === 1,
      'Exactly one company (root) node is required'
    ),
});

export type OrgHierarchy = z.infer<typeof orgHierarchySchema>;

export const fiscalYearSchema = z.object({
  startMonth: z.number().int().min(1).max(12),
});

export type FiscalYearSetup = z.infer<typeof fiscalYearSchema>;
