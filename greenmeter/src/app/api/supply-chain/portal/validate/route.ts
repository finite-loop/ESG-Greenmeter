import { NextRequest, NextResponse } from 'next/server';
import { supplierService } from '@/services/supplierService';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * POST /api/supply-chain/portal/validate
 *
 * Public endpoint (no auth required). Validates a portal token and returns
 * supplier info for the portal UI.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid JSON in request body' } },
        { status: 400 }
      );
    }

    const { token } = body as { token?: string };
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: { code: ErrorCode.VALIDATION_ERROR, message: 'Token is required' } },
        { status: 400 }
      );
    }

    const result = await supplierService.validatePortalToken(token);
    if (!result) {
      return NextResponse.json(
        { error: { code: ErrorCode.NOT_FOUND, message: 'Invalid or expired portal link' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        supplierId: result.supplierId,
        supplierName: result.supplierName,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }

    logger.error('Portal validate error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: { code: ErrorCode.PROCESSING_ERROR, message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
