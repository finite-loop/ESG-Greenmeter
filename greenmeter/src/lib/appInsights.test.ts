import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockStart = vi.fn();
const mockSetup = vi.fn().mockReturnValue({
  setAutoCollectRequests: vi.fn().mockReturnThis(),
  setAutoCollectPerformance: vi.fn().mockReturnThis(),
  setAutoCollectExceptions: vi.fn().mockReturnThis(),
  setAutoCollectDependencies: vi.fn().mockReturnThis(),
  setAutoCollectConsole: vi.fn().mockReturnThis(),
  start: mockStart,
});

vi.mock("applicationinsights", () => ({
  default: {
    setup: (...args: unknown[]) => mockSetup(...args),
    defaultClient: { trackEvent: vi.fn() },
  },
}));

describe("Application Insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("initAppInsights", () => {
    it("does nothing when APPLICATIONINSIGHTS_CONNECTION_STRING is not set", async () => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

      const { initAppInsights } = await import("./appInsights");
      await initAppInsights();

      expect(mockSetup).not.toHaveBeenCalled();
    });

    it("initializes SDK when connection string is set", async () => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=test-key"
      );

      const { initAppInsights } = await import("./appInsights");
      await initAppInsights();

      expect(mockSetup).toHaveBeenCalledWith("InstrumentationKey=test-key");
    });

    it("is idempotent — second call is a no-op", async () => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=test-key"
      );

      const { initAppInsights } = await import("./appInsights");
      await initAppInsights();
      await initAppInsights();

      expect(mockSetup).toHaveBeenCalledTimes(1);
    });

    it("handles SDK initialization failure gracefully", async () => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=bad"
      );

      mockSetup.mockImplementationOnce(() => {
        throw new Error("SDK init failed");
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { initAppInsights } = await import("./appInsights");
      await expect(initAppInsights()).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("SDK init failed")
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getAppInsightsClient", () => {
    it("returns client after initialization", async () => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=test-key"
      );

      const { initAppInsights, getAppInsightsClient } = await import(
        "./appInsights"
      );
      await initAppInsights();
      const client = getAppInsightsClient();

      expect(client).toBeDefined();
      expect(client).toHaveProperty("trackEvent");
    });
  });
});
