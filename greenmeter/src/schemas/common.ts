import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const filterSchema = z.object({
  standard: z.enum(['BRSR', 'ESRS', 'GRI', 'IFRS_S2']).optional(),
  pillar: z.enum(['E', 'S', 'G']).optional(),
  fiscalYear: z.string().optional(),
  search: z.string().optional(),
});

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (data) => !data.from || !data.to || data.from <= data.to,
  { message: 'Start date must be before end date' }
);

export type Pagination = z.infer<typeof paginationSchema>;
export type Sort = z.infer<typeof sortSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
