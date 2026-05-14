/**
 * In-memory per-tenant rate limiter using a sliding window.
 * Sufficient for single-instance Azure App Service.
 */

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();

const MAX_REQUESTS = 10;
const WINDOW_MS = 60_000; // 1 minute

/**
 * Check if the tenant has exceeded the rate limit.
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  let entry = windows.get(tenantId);

  if (!entry) {
    entry = { timestamps: [] };
    windows.set(tenantId, entry);
  }

  // Remove expired timestamps outside the window
  entry.timestamps = entry.timestamps.filter(ts => now - ts < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

/**
 * Clean up stale entries periodically (optional, prevents memory leak for long-running instances).
 */
export function cleanupRateLimiter(): void {
  const now = Date.now();
  for (const [tenantId, entry] of windows) {
    entry.timestamps = entry.timestamps.filter(ts => now - ts < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      windows.delete(tenantId);
    }
  }
}
