import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Environment Validation", () => {
  const VALID_ENV = {
    DATABASE_URL: "postgresql://user:pass@localhost:5432/greenmeter",
    AUTH_SECRET: "a".repeat(32),
    AUTH_AZURE_AD_CLIENT_ID: "client-id-123",
    AUTH_AZURE_AD_CLIENT_SECRET: "client-secret-456",
    AUTH_AZURE_AD_TENANT_ID: "tenant-id-789",
    NODE_ENV: "development",
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates successfully with all required vars", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }

    const { getEnv } = await import("./env");
    const env = getEnv();

    expect(env.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL);
    expect(env.AUTH_SECRET).toBe(VALID_ENV.AUTH_SECRET);
    expect(env.NODE_ENV).toBe("development");
  });

  it("defaults NODE_ENV to development when not set", async () => {
    const envWithoutNode = { ...VALID_ENV };
    delete (envWithoutNode as Record<string, string | undefined>).NODE_ENV;

    for (const [key, value] of Object.entries(envWithoutNode)) {
      vi.stubEnv(key, value);
    }
    // Explicitly unset NODE_ENV
    delete process.env.NODE_ENV;

    const { getEnv } = await import("./env");
    const env = getEnv();

    expect(env.NODE_ENV).toBe("development");
  });

  it("throws when DATABASE_URL is missing", async () => {
    const envWithout = { ...VALID_ENV };
    delete (envWithout as Record<string, string | undefined>).DATABASE_URL;
    for (const [key, value] of Object.entries(envWithout)) {
      vi.stubEnv(key, value);
    }
    delete process.env.DATABASE_URL;

    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow("Environment validation failed");
  });

  it("throws when AUTH_SECRET is too short", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv("AUTH_SECRET", "short");

    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow("Environment validation failed");
  });

  it("accepts optional Azure service vars without failing", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }
    // Don't set any optional vars

    const { getEnv } = await import("./env");
    const env = getEnv();

    expect(env.AZURE_STORAGE_CONNECTION_STRING).toBeUndefined();
    expect(env.APPLICATIONINSIGHTS_CONNECTION_STRING).toBeUndefined();
  });

  it("includes optional vars when provided", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv("AZURE_STORAGE_CONNECTION_STRING", "DefaultEndpointsProtocol=https;AccountName=test");
    vi.stubEnv("LLM_PROVIDER", "azure");
    vi.stubEnv("LLM_ENDPOINT", "https://api.openai.com/v1");

    const { getEnv } = await import("./env");
    const env = getEnv();

    expect(env.AZURE_STORAGE_CONNECTION_STRING).toBe("DefaultEndpointsProtocol=https;AccountName=test");
    expect(env.LLM_PROVIDER).toBe("azure");
    expect(env.LLM_ENDPOINT).toBe("https://api.openai.com/v1");
  });

  it("rejects invalid LLM_PROVIDER value", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv("LLM_PROVIDER", "invalid-provider");

    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow("Environment validation failed");
  });

  it("caches result after first parse", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }

    const { getEnv } = await import("./env");
    const first = getEnv();
    const second = getEnv();

    expect(first).toBe(second);
  });
});
