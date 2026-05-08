import type { TelemetryClient } from "applicationinsights";

let client: TelemetryClient | null = null;
let initialized = false;

/**
 * Initializes Azure Application Insights if a connection string is configured.
 * Call this once at app startup (e.g., from instrumentation.ts).
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * In development or when the connection string is not set, this is a no-op.
 */
export async function initAppInsights(): Promise<void> {
  if (initialized) {
    return;
  }
  initialized = true;

  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    return;
  }

  try {
    const appInsights = await import("applicationinsights");

    appInsights.default
      .setup(connectionString)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .start();

    client = appInsights.default.defaultClient;
  } catch (err: unknown) {
    // Log to stderr directly — the structured logger may not be available yet at startup
    // eslint-disable-next-line no-console
    console.error(
      `[AppInsights] Failed to initialize: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Returns the Application Insights client if initialized.
 * Returns null when App Insights is not configured (e.g., local development).
 */
export function getAppInsightsClient(): TelemetryClient | null {
  return client;
}
