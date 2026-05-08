import { withApiHandler } from '@/middleware';
import { supplierService } from '@/services/supplierService';

/**
 * POST /api/supply-chain/suppliers/[supplierId]/portal-token
 *
 * Generates a unique portal token for the supplier. The token is used
 * to construct the supplier portal URL for self-service data submission.
 */
export const POST = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const supplierIdIndex = segments.indexOf('suppliers') + 1;
    const supplierId = segments[supplierIdIndex];

    const token = await supplierService.generatePortalToken(supplierId);

    return {
      data: { token, portalUrl: `/supplier-portal/${token}` },
      _audit: {
        entityType: 'supplier',
        entityId: supplierId,
        newValue: { action: 'portal_token_generated' },
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
