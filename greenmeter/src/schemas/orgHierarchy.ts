import { z } from 'zod';

export const createOrgNodeSchema = z.object({
  parentNodeId: z.string().guid('Invalid parent node ID'),
  name: z.string().trim().min(1, 'Name is required').max(255),
  nodeType: z.enum(['company', 'division', 'department', 'site']),
  code: z.string().max(50).optional(),
  currency: z.string().max(10).optional(),
});

export const updateOrgNodeSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  nodeType: z.enum(['company', 'division', 'department', 'site']).optional(),
  code: z.string().max(50).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  parentNodeId: z.string().guid('Invalid parent node ID').optional(),
});

export type CreateOrgNode = z.infer<typeof createOrgNodeSchema>;
export type UpdateOrgNode = z.infer<typeof updateOrgNodeSchema>;
