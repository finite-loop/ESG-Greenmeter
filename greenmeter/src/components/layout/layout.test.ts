import { describe, it, expect, vi } from "vitest";

// Mock Next.js modules that components import
vi.mock("next/link", () => ({
  default: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

describe("layout barrel exports", () => {
  it("exports Sidebar component", async () => {
    const mod = await import("./index");
    expect(mod.Sidebar).toBeDefined();
    expect(typeof mod.Sidebar).toBe("function");
  });

  it("exports TopBar component", async () => {
    const mod = await import("./index");
    expect(mod.TopBar).toBeDefined();
    expect(typeof mod.TopBar).toBe("function");
  });

  it("exports RollupBar component", async () => {
    const mod = await import("./index");
    expect(mod.RollupBar).toBeDefined();
    expect(typeof mod.RollupBar).toBe("function");
  });

  it("exports PageHeader component", async () => {
    const mod = await import("./index");
    expect(mod.PageHeader).toBeDefined();
    expect(typeof mod.PageHeader).toBe("function");
  });

  it("exports NAV_ITEMS array", async () => {
    const mod = await import("./index");
    expect(mod.NAV_ITEMS).toBeDefined();
    expect(Array.isArray(mod.NAV_ITEMS)).toBe(true);
  });
});
