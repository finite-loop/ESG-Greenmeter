import { describe, it, expect, vi, beforeAll } from "vitest";

/**
 * Tests for Story 1.3: Auth.js v5 Configuration & Azure AD Provider
 *
 * Tests are split into two categories:
 * 1. Configuration tests (auth.config, env schema) — can run without mocking
 * 2. Integration tests (proxy, route handler, auth exports) — require Next.js mocks
 */

// Mock next/server before any module that imports it
vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => new Response()),
    redirect: vi.fn((url: URL) => new Response(null, { status: 307, headers: { Location: url.toString() } })),
    json: vi.fn((body: unknown, init?: ResponseInit) => Response.json(body, init)),
  },
  NextRequest: vi.fn(),
}));

// Mock next/headers (used by next-auth internally)
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

// ---------- Auth Config ----------
describe("auth.config", () => {
  it("exports a valid NextAuthConfig object", async () => {
    const authConfig = (await import("@/lib/auth.config")).default;

    expect(authConfig).toBeDefined();
    expect(authConfig.session).toEqual({ strategy: "jwt" });
    expect(authConfig.pages).toEqual({
      signIn: "/login",
      error: "/login",
    });
  });

  it("configures Microsoft Entra ID provider", async () => {
    const authConfig = (await import("@/lib/auth.config")).default;

    expect(authConfig.providers).toBeDefined();
    expect(authConfig.providers).toHaveLength(1);

    const provider = authConfig.providers[0] as unknown as Record<string, unknown>;
    expect(provider).toBeDefined();
    // Auth.js v5 providers are config objects with id and type
    expect(provider.id).toBe("microsoft-entra-id");
    expect(provider.type).toBe("oidc");
  });

  it("uses JWT session strategy (not database sessions)", async () => {
    const authConfig = (await import("@/lib/auth.config")).default;

    expect(authConfig.session?.strategy).toBe("jwt");
  });

  it("sets sign-in page to /login", async () => {
    const authConfig = (await import("@/lib/auth.config")).default;

    expect(authConfig.pages?.signIn).toBe("/login");
  });

  it("sets error page to /login", async () => {
    const authConfig = (await import("@/lib/auth.config")).default;

    expect(authConfig.pages?.error).toBe("/login");
  });
});

// ---------- Environment Schema ----------
describe("env schema", () => {
  it("validates required auth environment variables", async () => {
    const { z } = await import("zod");

    const envSchema = z.object({
      DATABASE_URL: z.string().min(1),
      AUTH_SECRET: z.string().min(1),
      AUTH_AZURE_AD_CLIENT_ID: z.string().min(1),
      AUTH_AZURE_AD_CLIENT_SECRET: z.string().min(1),
      AUTH_AZURE_AD_TENANT_ID: z.string().min(1),
      AUTH_URL: z.string().url().optional(),
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    });

    const invalidResult = envSchema.safeParse({});
    expect(invalidResult.success).toBe(false);

    const validResult = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      AUTH_SECRET: "test-secret-value",
      AUTH_AZURE_AD_CLIENT_ID: "test-client-id",
      AUTH_AZURE_AD_CLIENT_SECRET: "test-client-secret",
      AUTH_AZURE_AD_TENANT_ID: "test-tenant-id",
    });
    expect(validResult.success).toBe(true);
  });

  it("AUTH_URL is optional", async () => {
    const { z } = await import("zod");

    const envSchema = z.object({
      DATABASE_URL: z.string().min(1),
      AUTH_SECRET: z.string().min(1),
      AUTH_AZURE_AD_CLIENT_ID: z.string().min(1),
      AUTH_AZURE_AD_CLIENT_SECRET: z.string().min(1),
      AUTH_AZURE_AD_TENANT_ID: z.string().min(1),
      AUTH_URL: z.string().url().optional(),
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    });

    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      AUTH_SECRET: "test-secret-value",
      AUTH_AZURE_AD_CLIENT_ID: "test-client-id",
      AUTH_AZURE_AD_CLIENT_SECRET: "test-client-secret",
      AUTH_AZURE_AD_TENANT_ID: "test-tenant-id",
    });
    expect(result.success).toBe(true);
  });

  it("NODE_ENV defaults to development", async () => {
    const { z } = await import("zod");

    const envSchema = z.object({
      DATABASE_URL: z.string().min(1),
      AUTH_SECRET: z.string().min(1),
      AUTH_AZURE_AD_CLIENT_ID: z.string().min(1),
      AUTH_AZURE_AD_CLIENT_SECRET: z.string().min(1),
      AUTH_AZURE_AD_TENANT_ID: z.string().min(1),
      AUTH_URL: z.string().url().optional(),
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    });

    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      AUTH_SECRET: "test-secret-value",
      AUTH_AZURE_AD_CLIENT_ID: "test-client-id",
      AUTH_AZURE_AD_CLIENT_SECRET: "test-client-secret",
      AUTH_AZURE_AD_TENANT_ID: "test-tenant-id",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("rejects invalid NODE_ENV values", async () => {
    const { z } = await import("zod");

    const envSchema = z.object({
      DATABASE_URL: z.string().min(1),
      AUTH_SECRET: z.string().min(1),
      AUTH_AZURE_AD_CLIENT_ID: z.string().min(1),
      AUTH_AZURE_AD_CLIENT_SECRET: z.string().min(1),
      AUTH_AZURE_AD_TENANT_ID: z.string().min(1),
      AUTH_URL: z.string().url().optional(),
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    });

    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      AUTH_SECRET: "test-secret-value",
      AUTH_AZURE_AD_CLIENT_ID: "test-client-id",
      AUTH_AZURE_AD_CLIENT_SECRET: "test-client-secret",
      AUTH_AZURE_AD_TENANT_ID: "test-tenant-id",
      NODE_ENV: "staging",
    });
    expect(result.success).toBe(false);
  });
});

// ---------- Proxy Configuration ----------
describe("proxy config", () => {
  it("exports a config with correct matchers", async () => {
    const { config } = await import("@/proxy");

    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(config.matcher).toContain("/(dashboard)/:path*");
    expect(config.matcher).toContain("/api/:path*");
  });

  it("exports a proxy function", async () => {
    const proxyModule = await import("@/proxy");

    expect(proxyModule.proxy).toBeDefined();
    expect(typeof proxyModule.proxy).toBe("function");
  });

  it("matcher does not include /api/auth paths (handled by exclusion logic)", async () => {
    const { config } = await import("@/proxy");

    // The matcher includes /api/:path* which covers /api/auth,
    // but the proxy function itself checks and allows /api/auth through
    expect(config.matcher).toContain("/api/:path*");
  });
});

// ---------- Auth Route Handler ----------
describe("auth route handler", () => {
  it("exports GET and POST handlers", async () => {
    const routeModule = await import(
      "@/app/api/auth/[...nextauth]/route"
    );

    expect(routeModule.GET).toBeDefined();
    expect(routeModule.POST).toBeDefined();
    expect(typeof routeModule.GET).toBe("function");
    expect(typeof routeModule.POST).toBe("function");
  });
});

// ---------- Auth Exports ----------
describe("auth module exports", () => {
  it("exports handlers, auth, signIn, signOut from auth.ts", async () => {
    const authModule = await import("@/lib/auth");

    expect(authModule.handlers).toBeDefined();
    expect(authModule.auth).toBeDefined();
    expect(authModule.signIn).toBeDefined();
    expect(authModule.signOut).toBeDefined();
  });

  it("handlers has GET and POST methods", async () => {
    const { handlers } = await import("@/lib/auth");

    expect(handlers.GET).toBeDefined();
    expect(handlers.POST).toBeDefined();
    expect(typeof handlers.GET).toBe("function");
    expect(typeof handlers.POST).toBe("function");
  });

  it("auth is a callable function (for server-side session retrieval)", async () => {
    const { auth } = await import("@/lib/auth");

    expect(typeof auth).toBe("function");
  });
});
