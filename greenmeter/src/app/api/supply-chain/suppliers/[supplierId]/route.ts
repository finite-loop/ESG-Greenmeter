import { withApiHandler } from '@/middleware';
import { supplierService } from '@/services/supplierService';
import { updateSupplierSchema } from '@/schemas/suppliers';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const supplierId = extractUuidParam(req, 4, 'supplier ID');
    const supplier = await supplierService.getById(supplierId);

    return { data: supplier };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

export const PUT = withApiHandler(
  async (req, ctx) => {
    const supplierId = extractUuidParam(req, 4, 'supplier ID');

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400
      );
    }

    const parsed = updateSupplierSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid update data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { oldValue, newValue } = await supplierService.update(
      supplierId,
      ctx.tenantId,
      parsed.data
    );

    return {
      data: newValue,
      _audit: {
        entityType: 'supplier',
        entityId: supplierId,
        oldValue,
        newValue,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
