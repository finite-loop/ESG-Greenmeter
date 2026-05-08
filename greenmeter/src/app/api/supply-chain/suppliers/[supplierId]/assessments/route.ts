import { withApiHandler } from '@/middleware';
import { supplierService } from '@/services/supplierService';
import { upsertAssessmentSchema } from '@/schemas/suppliers';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

export const POST = withApiHandler(
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

    const parsed = upsertAssessmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid assessment data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await supplierService.upsertAssessment(
      supplierId,
      ctx.tenantId,
      parsed.data
    );

    return {
      data: result,
      _audit: {
        entityType: 'supplier_assessment',
        entityId: supplierId,
        newValue: result.assessment,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
