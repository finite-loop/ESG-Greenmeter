import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode } from './errors';

describe('AppError', () => {
  it('creates an error with code, message, and status', () => {
    const error = new AppError(ErrorCode.NOT_FOUND, 'Resource not found', 404);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
    expect(error.status).toBe(404);
    expect(error.details).toBeUndefined();
    expect(error.name).toBe('AppError');
  });

  it('creates an error with details', () => {
    const details = { email: ['Required', 'Must be valid'] };
    const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid input', 400, details);

    expect(error.details).toEqual(details);
  });

  it('serializes to JSON matching API error format', () => {
    const error = new AppError(ErrorCode.FORBIDDEN, 'Access denied', 403);
    const json = error.toJSON();

    expect(json).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
      },
    });
  });

  it('includes details in JSON when present', () => {
    const details = { name: ['Too short'] };
    const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', 400, details);
    const json = error.toJSON();

    expect(json).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { name: ['Too short'] },
      },
    });
  });

  it('omits details from JSON when not present', () => {
    const error = new AppError(ErrorCode.PROCESSING_ERROR, 'Server error', 500);
    const json = error.toJSON();

    expect(json.error).not.toHaveProperty('details');
  });
});

describe('ErrorCode', () => {
  it('has all required error codes', () => {
    expect(ErrorCode.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.TENANT_MISMATCH).toBe('TENANT_MISMATCH');
    expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ErrorCode.PROCESSING_ERROR).toBe('PROCESSING_ERROR');
    expect(ErrorCode.DUPLICATE_ENTRY).toBe('DUPLICATE_ENTRY');
  });
});
