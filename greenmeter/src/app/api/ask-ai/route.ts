import { withApiHandler } from '@/middleware/handler';
import { isLlmAvailable } from '@/lib/llm';
import { checkRateLimit } from '@/lib/rateLimiter';
import { askAiBodySchema } from '@/schemas/askAi';
import { askAiService } from '@/services/askAiService';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * POST /api/ask-ai
 * Submit a natural language question about ESG data.
 * Body: { question: string, context?: 'analytics' | 'industry' }
 */
export const POST = withApiHandler(
  async (req, ctx) => {
    // Check if LLM is configured
    if (!isLlmAvailable()) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'AI assistant is not available. LLM provider is not configured.',
        503
      );
    }

    // Check rate limit
    if (!checkRateLimit(ctx.tenantId)) {
      throw new AppError(
        ErrorCode.RATE_LIMITED,
        'Too many AI requests. Please wait a moment and try again.',
        429
      );
    }

    // Validate body
    const rawBody = await req.json();
    const parseResult = askAiBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        400,
        parseResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const response = await askAiService.ask(ctx.tenantId, parseResult.data);

    return { data: response };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
