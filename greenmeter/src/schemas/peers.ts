import { z } from 'zod';
import { paginationSchema } from './common';

export const createPeerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  sector: z.string().max(255).optional(),
  country: z.string().max(255).optional(),
  marketCap: z.enum(['large_cap', 'mid_cap', 'small_cap']).optional(),
  exchange: z.string().max(255).optional(),
});

export const updatePeerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sector: z.string().max(255).nullable().optional(),
  country: z.string().max(255).nullable().optional(),
  marketCap: z.enum(['large_cap', 'mid_cap', 'small_cap']).nullable().optional(),
  exchange: z.string().max(255).nullable().optional(),
  active: z.boolean().optional(),
});

export const peerValuesFilterSchema = paginationSchema.extend({
  fiscalYear: z.string().optional(),
  paramId: z.string().guid().optional(),
});

export const peerListFilterSchema = paginationSchema.extend({
  search: z.string().max(255).optional(),
  sector: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export const peerSuggestionsFilterSchema = z.object({
  matchLevel: z.coerce.number().refine((v) => [4, 6, 8].includes(v), {
    message: 'matchLevel must be 4, 6, or 8',
  }).default(4),
});

export const peerSyncSchema = z.object({
  sourceTenantIds: z.array(z.string().guid()).min(1).max(20),
});

export type CreatePeer = z.infer<typeof createPeerSchema>;
export type UpdatePeer = z.infer<typeof updatePeerSchema>;
export type PeerValuesFilter = z.infer<typeof peerValuesFilterSchema>;
export type PeerListFilter = z.infer<typeof peerListFilterSchema>;
export type PeerSuggestionsFilter = z.infer<typeof peerSuggestionsFilterSchema>;
export type PeerSync = z.infer<typeof peerSyncSchema>;
