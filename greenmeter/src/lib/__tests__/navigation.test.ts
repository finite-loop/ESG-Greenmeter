import { describe, it, expect } from "vitest";
import { SCREEN_ROUTES } from "../navigation";

describe("SCREEN_ROUTES", () => {
  const expectedScreens = [
    "dashboard",
    "console",
    "rollup",
    "analytics",
    "goals",
    "reports",
    "supplychain",
    "settings",
    "params",
    "knowledge",
    "entity",
    "materiality",
    "audit",
    "industrydata",
  ];

  it("maps all legacy screen IDs to routes", () => {
    for (const screen of expectedScreens) {
      expect(SCREEN_ROUTES[screen]).toBeDefined();
    }
  });

  it("all routes start with /", () => {
    for (const [screen, route] of Object.entries(SCREEN_ROUTES)) {
      expect(route, `route for '${screen}' should start with /`).toMatch(
        /^\//
      );
    }
  });

  it("dashboard maps to root", () => {
    expect(SCREEN_ROUTES.dashboard).toBe("/");
  });

  it("supplychain maps to kebab-case route", () => {
    expect(SCREEN_ROUTES.supplychain).toBe("/supply-chain");
  });

  it("params maps to settings sub-route", () => {
    expect(SCREEN_ROUTES.params).toBe("/settings/parameters");
  });
});
