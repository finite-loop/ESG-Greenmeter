import { z } from 'zod';
import { uuidSchema } from './common';

export const rollupQuerySchema = z.object({
  nodeId: uuidSchema,
  periodId: uuidSchema,
});

export type RollupQuery = z.infer<typeof rollupQuerySchema>;
