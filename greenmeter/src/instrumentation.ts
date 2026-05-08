/**
 * Next.js instrumentation hook — called once when the server starts.
 * Used for startup validation and observability initialization.
 */
export async function register(): Promise<void> {
  // Validate all required environment variables at startup (fast-fail)
  const { getEnv } = await import("@/config/env");
  getEnv();

  // Initialize Application Insights for staging/production
  const { initAppInsights } = await import("@/lib/appInsights");
  await initAppInsights();
}
