import { withApiHandler } from '@/middleware/handler';
import { isLlmAvailable } from '@/lib/llm';

/**
 * GET /api/config/features
 * Returns feature flags for the client.
 * Checks server-side env vars so they are never leaked to the client bundle.
 */
export const GET = withApiHandler(
  async () => {
    return {
      data: {
        askAiEnabled: isLlmAvailable(),
      },
    };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);
