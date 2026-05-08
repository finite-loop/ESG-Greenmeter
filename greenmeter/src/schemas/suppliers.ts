import { z } from 'zod';
import { paginationSchema } from './common';

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  category: z.enum(['tier1', 'tier2', 'tier3']).optional(),
  sector: z.string().max(255).optional(),
  country: z.string().max(255).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactName: z.string().max(255).optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.enum(['tier1', 'tier2', 'tier3']).nullable().optional(),
  sector: z.string().max(255).nullable().optional(),
  country: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().max(255).nullable().optional(),
  contactName: z.string().max(255).nullable().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
  active: z.boolean().optional(),
});

export const upsertAssessmentSchema = z.object({
  fiscalYear: z.string().min(1, 'Fiscal year is required').max(20),
  environmentalScore: z.number().min(0).max(100).optional(),
  socialScore: z.number().min(0).max(100).optional(),
  governanceScore: z.number().min(0).max(100).optional(),
  scope3Contribution: z.number().min(0).optional(),
  surveyStatus: z.enum(['pending', 'sent', 'submitted', 'verified']).optional(),
  surveyData: z.record(z.string(), z.unknown()).optional(),
});

export const supplierListFilterSchema = paginationSchema.extend({
  search: z.string().max(255).optional(),
  sector: z.string().optional(),
  category: z.enum(['tier1', 'tier2', 'tier3']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  active: z.coerce.boolean().optional(),
});

export const portalSubmissionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  fiscalYear: z.string().min(1, 'Fiscal year is required').max(20),
  scope3Contribution: z.number().min(0, 'Scope 3 contribution must be non-negative'),
  environmentalScore: z.number().min(0).max(100).optional(),
  socialScore: z.number().min(0).max(100).optional(),
  governanceScore: z.number().min(0).max(100).optional(),
  surveyData: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSupplier = z.infer<typeof createSupplierSchema>;
export type UpdateSupplier = z.infer<typeof updateSupplierSchema>;
export type UpsertAssessment = z.infer<typeof upsertAssessmentSchema>;
export type SupplierListFilter = z.infer<typeof supplierListFilterSchema>;
export type PortalSubmission = z.infer<typeof portalSubmissionSchema>;
