import { withApiHandler } from '@/middleware';
import { supplierService } from '@/services/supplierService';
import { supplierListFilterSchema, createSupplierSchema } from '@/schemas/suppliers';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = supplierListFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await supplierService.list(parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

export const POST = withApiHandler(
  async (req, ctx) => {
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

    const parsed = createSupplierSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid supplier data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const supplier = await supplierService.create(ctx.tenantId, parsed.data);

    return {
      data: supplier,
      _audit: {
        entityType: 'supplier',
        entityId: supplier.supplierId,
        newValue: supplier,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
