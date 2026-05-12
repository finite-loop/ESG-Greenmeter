import { z } from 'zod';
import { paginationSchema } from './common';

export const auditActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'VERIFY',
  'IMPORT',
]);

export const auditFilterSchema = paginationSchema.extend({
  entityType: z.string().optional(),
  userId: z.string().guid().optional(),
  action: auditActionSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type AuditFilter = z.infer<typeof auditFilterSchema>;
