import { z } from 'zod';

export const askAiBodySchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(500, 'Question must be at most 500 characters'),
  context: z.enum(['analytics', 'industry']).optional(),
});

export type AskAiBody = z.infer<typeof askAiBodySchema>;
