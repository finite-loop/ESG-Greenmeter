import { withApiHandler } from '@/middleware';
import { healthService } from '@/services/healthService';

export const GET = withApiHandler(
  async () => {
    const result = await healthService.getHealthCheck();

    return {
      data: result,
    };
  },
  { roles: ['admin'], audit: false }
);
