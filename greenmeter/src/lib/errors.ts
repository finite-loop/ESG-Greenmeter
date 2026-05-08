/**
 * Standard application error codes used across all API responses.
 */
export const ErrorCode = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  RATE_LIMITED: 'RATE_LIMITED',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  CONFLICT: 'CONFLICT',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Structured application error that maps directly to API error responses.
 *
 * Usage:
 *   throw new AppError(ErrorCode.NOT_FOUND, 'Resource not found', 404)
 *   throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid input', 400, { email: ['Required'] })
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCodeType,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}
