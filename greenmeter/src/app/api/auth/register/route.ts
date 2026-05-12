import { NextRequest, NextResponse } from 'next/server';
import { accessRequestService } from '@/services/accessRequestService';
import { registerRequestSchema } from '@/schemas/accessRequests';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/register
 *
 * Public endpoint (no auth required). Accepts registration requests
 * that will be reviewed by a platform admin.
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

    const parsed = registerRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid registration data',
            details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
          },
        },
        { status: 400 }
      );
    }

    await accessRequestService.register(parsed.data);

    return NextResponse.json(
      { message: 'Registration request submitted successfully.' },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }

    logger.error('Registration error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: { code: ErrorCode.PROCESSING_ERROR, message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
