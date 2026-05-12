import { describe, it, expect } from "vitest";
import { NAV_ITEMS, NAV_GROUPS, type NavItem } from "./navigation";

describe("navigation", () => {
  it("defines 14 navigation items across 5 groups", () => {
    expect(NAV_GROUPS).toHaveLength(5);
    expect(NAV_ITEMS).toHaveLength(14);
  });

  it("includes all required navigation items", () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      "Dashboard",
      "Rollup view",
      "Console",
      "Org & hierarchy",
      "Parameters & KPIs",
      "Materiality",
      "Goals",
      "Analytics",
      "Industry data",
      "Report builder",
      "Supply chain",
      "Knowledge base",
      "Audit & assurance",
      "Settings & admin",
    ]);
  });

  it("maps correct hrefs for each nav item", () => {
    const hrefMap = Object.fromEntries(
      NAV_ITEMS.map((item) => [item.label, item.href])
    );

    expect(hrefMap).toEqual({
      Dashboard: "/",
      "Rollup view": "/rollup",
      Console: "/console",
      "Org & hierarchy": "/settings/org",
      "Parameters & KPIs": "/settings/parameters",
      Materiality: "/materiality",
      Goals: "/goals",
      Analytics: "/analytics",
      "Industry data": "/industry-data",
      "Report builder": "/reports",
      "Supply chain": "/supply-chain",
      "Knowledge base": "/knowledge",
      "Audit & assurance": "/settings/audit",
      "Settings & admin": "/settings",
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

  it("nav groups have correct titles", () => {
    const titles = NAV_GROUPS.map((g) => g.title);
    expect(titles).toEqual([
      "Overview",
      "Configuration",
      "Intelligence",
      "Reporting",
      "Governance",
    ]);
  });
});
