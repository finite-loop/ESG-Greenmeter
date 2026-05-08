import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetEnv = vi.fn().mockReturnValue({
  DATABASE_URL: "postgresql://localhost/test",
  NODE_ENV: "test",
});
const mockInitAppInsights = vi.fn().mockResolvedValue(undefined);

vi.mock("@/config/env", () => ({
  getEnv: () => mockGetEnv(),
}));

vi.mock("@/lib/appInsights", () => ({
  initAppInsights: () => mockInitAppInsights(),
}));

describe("instrumentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls getEnv() for environment validation on register", async () => {
    const { register } = await import("./instrumentation");
    await register();

    expect(mockGetEnv).toHaveBeenCalledTimes(1);
  });

  it("calls initAppInsights() on register", async () => {
    const { register } = await import("./instrumentation");
    await register();

    expect(mockInitAppInsights).toHaveBeenCalledTimes(1);
  });
});
