import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, runWithContext, getContextStore } from "./logger";

describe("Structured Logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("logger.info", () => {
    it("outputs structured JSON with required fields", () => {
      logger.info("test message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: "info",
        message: "test message",
      });
      expect(output.timestamp).toBeDefined();
      expect(typeof output.timestamp).toBe("string");
    });

    it("includes extra data when provided", () => {
      logger.info("with extra", { requestId: "abc", path: "/api/test" });

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(output.requestId).toBe("abc");
      expect(output.path).toBe("/api/test");
    });
  });

  describe("logger.warn", () => {
    it("outputs structured JSON at warn level", () => {
      logger.warn("warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: "warn",
        message: "warning message",
      });
      expect(output.timestamp).toBeDefined();
    });
  });

  describe("logger.error", () => {
    it("outputs structured JSON at error level", () => {
      logger.error("error message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);

      expect(output).toMatchObject({
        level: "error",
        message: "error message",
      });
      expect(output.timestamp).toBeDefined();
    });

    it("includes error stack when Error object provided in extra", () => {
      const err = new Error("something broke");
      logger.error("operation failed", { error: err.stack });

      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
      expect(output.error).toContain("something broke");
    });
  });

  describe("context propagation", () => {
    it("includes correlationId from context", async () => {
      await new Promise<void>((resolve) => {
        runWithContext(
          { correlationId: "corr-123", tenantId: "t-1", userId: "u-1" },
          () => {
            logger.info("in context");
            resolve();
          }
        );
      });

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(output.correlationId).toBe("corr-123");
      expect(output.tenantId).toBe("t-1");
      expect(output.userId).toBe("u-1");
    });

    it("works without context (correlationId/tenantId/userId are undefined)", () => {
      logger.info("no context");

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(output.correlationId).toBeUndefined();
      expect(output.tenantId).toBeUndefined();
      expect(output.userId).toBeUndefined();
    });
  });

  describe("reserved key protection", () => {
    it("prevents extra from overwriting structural fields", () => {
      runWithContext(
        { correlationId: "real-id", tenantId: "real-tenant" },
        () => {
          logger.info("test", {
            correlationId: "fake-id",
            tenantId: "fake-tenant",
            timestamp: "fake-time",
            level: "fake-level",
            message: "fake-message",
            safeKey: "allowed",
          });
        }
      );

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(output.correlationId).toBe("real-id");
      expect(output.tenantId).toBe("real-tenant");
      expect(output.level).toBe("info");
      expect(output.message).toBe("test");
      expect(output.safeKey).toBe("allowed");
    });
  });

  describe("safe serialization", () => {
    it("handles circular references in extra without throwing", () => {
      const circular: Record<string, unknown> = { key: "value" };
      circular.self = circular;

      expect(() => logger.info("circular test", circular)).not.toThrow();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(output.serializationError).toBe(
        "Failed to serialize log entry extras"
      );
      expect(output.level).toBe("info");
      expect(output.message).toBe("circular test");
    });
  });

  describe("dev pretty-print", () => {
    it("outputs human-readable format in development", () => {
      vi.stubEnv("NODE_ENV", "development");

      logger.info("dev message");

      const output = consoleLogSpy.mock.calls[0][0] as string;
      // Dev format is not JSON — it's a readable string
      expect(output).toContain("INFO");
      expect(output).toContain("dev message");
      expect(() => JSON.parse(output)).toThrow(); // Not JSON
    });

    it("outputs JSON in production", () => {
      vi.stubEnv("NODE_ENV", "production");

      logger.info("prod message");

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("prod message");
    });
  });

  describe("getContextStore", () => {
    it("returns the AsyncLocalStorage instance", () => {
      expect(getContextStore()).toBeDefined();
    });
  });
});
