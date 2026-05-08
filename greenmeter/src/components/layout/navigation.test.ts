import { describe, it, expect } from "vitest";
import { NAV_ITEMS, type NavItem } from "./navigation";

describe("navigation", () => {
  it("defines exactly 11 navigation items", () => {
    expect(NAV_ITEMS).toHaveLength(11);
  });

  it("includes all required navigation items", () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      "Dashboard",
      "Console",
      "Rollup",
      "Analytics",
      "Goals",
      "Reports",
      "Supply Chain",
      "Knowledge",
      "Materiality",
      "Industry Data",
      "Settings",
    ]);
  });

  it("maps correct hrefs for each nav item", () => {
    const hrefMap = Object.fromEntries(
      NAV_ITEMS.map((item) => [item.label, item.href])
    );

    expect(hrefMap).toEqual({
      Dashboard: "/",
      Console: "/console",
      Rollup: "/rollup",
      Analytics: "/analytics",
      Goals: "/goals",
      Reports: "/reports",
      "Supply Chain": "/supply-chain",
      Knowledge: "/knowledge",
      Materiality: "/materiality",
      "Industry Data": "/industry-data",
      Settings: "/settings",
    });
  });

  it("every item has a valid Lucide icon component", () => {
    for (const item of NAV_ITEMS) {
      // Lucide icons are forwardRef objects with a render function
      expect(item.icon).toBeDefined();
      expect(item.icon.$$typeof).toBeDefined();
    }
  });

  it("every href starts with /", () => {
    for (const item of NAV_ITEMS) {
      expect(item.href).toMatch(/^\//);
    }
  });

  it("all hrefs are unique", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("conforms to NavItem interface shape", () => {
    for (const item of NAV_ITEMS) {
      expect(item).toHaveProperty("label");
      expect(item).toHaveProperty("href");
      expect(item).toHaveProperty("icon");
      expect(typeof item.label).toBe("string");
      expect(typeof item.href).toBe("string");
      // Lucide icons may resolve as functions or ForwardRef objects
      expect(["function", "object"]).toContain(typeof item.icon);
      expect(item.icon).toBeTruthy();
    }
  });
});
