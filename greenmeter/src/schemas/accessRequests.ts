import { z } from 'zod';
import { paginationSchema } from './common';

export const registerRequestSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email address'),
  company: z.string().min(1, 'Company name is required').max(200),
  industry: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export const accessRequestListFilterSchema = paginationSchema.extend({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().max(255).optional(),
});

export const accessRequestReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  tenantId: z.string().uuid().optional(),
  role: z.enum(['admin', 'analyst', 'department', 'viewer']).optional(),
  reviewNote: z.string().max(500).optional(),
}).refine(
  (data) => data.action !== 'approve' || !!data.tenantId,
  { message: 'tenantId is required when approving', path: ['tenantId'] }
).refine(
  (data) => data.action !== 'approve' || !!data.role,
  { message: 'role is required when approving', path: ['role'] }
);

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type AccessRequestListFilter = z.infer<typeof accessRequestListFilterSchema>;
export type AccessRequestReview = z.infer<typeof accessRequestReviewSchema>;
