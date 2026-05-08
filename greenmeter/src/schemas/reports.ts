import { z } from 'zod';
import { uuidSchema } from './common';

export const frameworkEnum = z.enum(['BRSR', 'ESRS', 'GRI', 'IFRS_S2']);

export const reportGenerateSchema = z.object({
  templateId: uuidSchema,
  periodId: uuidSchema,
  name: z.string().min(1).max(200),
  format: z.enum(['pdf', 'xbrl', 'excel']).default('pdf'),
});

/**
 * Schema for POST /api/reports/generate.
 * Accepts a framework and periodId; the service resolves the template and node.
 */
export const reportGenerateByFrameworkSchema = z.object({
  framework: frameworkEnum,
  periodId: uuidSchema,
  nodeId: uuidSchema.optional(),
  format: z.enum(['pdf', 'xbrl', 'excel']).default('pdf'),
});

export const reportFilterSchema = z.object({
  standard: z.enum(['BRSR', 'ESRS', 'GRI', 'IFRS_S2']).optional(),
  periodId: uuidSchema.optional(),
  status: z.enum(['pending', 'generating', 'complete', 'failed']).optional(),
});

/**
 * Schema for GET /api/reports/coverage query params.
 * Both framework and periodId are required.
 */
export const coverageFilterSchema = z.object({
  framework: frameworkEnum,
  periodId: uuidSchema,
});

export type ReportGenerate = z.infer<typeof reportGenerateSchema>;
export type ReportGenerateByFramework = z.infer<typeof reportGenerateByFrameworkSchema>;
export type ReportFilter = z.infer<typeof reportFilterSchema>;
export type CoverageFilter = z.infer<typeof coverageFilterSchema>;
