import { uuidSchema } from '@/schemas/common';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * Extracts and validates a UUID path parameter from a request URL.
 * @param req - The incoming request
 * @param segmentIndex - The index of the path segment (e.g., 3 for /api/peers/[peerId])
 * @param label - A human-readable label for error messages (e.g., "peer ID")
 */
export function extractUuidParam(
  req: Request,
  segmentIndex: number,
  label: string
): string {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const value = segments[segmentIndex];

  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Invalid ${label} format`,
      400
    );
  }

  return parsed.data;
}
