import { z } from 'zod';
import { paginationSchema } from './common';

export const roleEnum = z.enum(['admin', 'analyst', 'department', 'viewer']);

export const userInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: roleEnum.default('viewer'),
  departmentId: z.string().uuid().optional(),
}).refine(
  (data) => data.role !== 'department' || !!data.departmentId,
  { message: 'departmentId is required when role is department', path: ['departmentId'] }
);

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: roleEnum.optional(),
  departmentId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});

export const userListFilterSchema = paginationSchema.extend({
  search: z.string().max(255).optional(),
  role: roleEnum.optional(),
  status: z.enum(['active', 'invited', 'deactivated']).optional(),
});

export type UserInvite = z.infer<typeof userInviteSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserListFilter = z.infer<typeof userListFilterSchema>;
