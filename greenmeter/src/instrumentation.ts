/**
 * Next.js instrumentation hook — called once when the server starts.
 * Used for startup validation and observability initialization.
 *
 * Next.js 16 compiles this file for both Node.js and Edge runtimes.
 * Node-only imports (applicationinsights) must be guarded by NEXT_RUNTIME.
 */
export async function register(): Promise<void> {
  // Validate all required environment variables at startup (fast-fail)
  const { getEnv } = await import("@/config/env");
  getEnv();

  // Initialize Application Insights only in the Node.js runtime —
  // the applicationinsights SDK uses native modules incompatible with Edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initAppInsights } = await import("@/lib/appInsights");
    await initAppInsights();
  }
}
