import { NextRequest, NextResponse } from 'next/server';
import { supplierService } from '@/services/supplierService';
import { portalSubmissionSchema } from '@/schemas/suppliers';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * POST /api/supply-chain/portal/submit
 *
 * Public endpoint (no auth required). Accepts supplier self-reported
 * emissions data via portal token authentication.
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

    const parsed = portalSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid submission data',
            details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
          },
        },
        { status: 400 }
      );
    }

    const assessment = await supplierService.submitPortalAssessment(parsed.data);

    return NextResponse.json(
      {
        data: {
          assessmentId: assessment.assessmentId,
          fiscalYear: assessment.fiscalYear,
          surveyStatus: assessment.surveyStatus,
        },
        message: 'Submission received successfully. Your data is pending verification.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }

    logger.error('Portal submit error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: { code: ErrorCode.PROCESSING_ERROR, message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
