import { randomUUID } from "node:crypto";

/**
 * Generates a unique correlation ID (UUID v4) for request tracing.
 * Each incoming request gets a unique ID that propagates through
 * the entire processing chain via AsyncLocalStorage context.
 */
export function generateCorrelationId(): string {
  return randomUUID();
}
