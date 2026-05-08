import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

const APP_DIR = join(__dirname, "..");

describe("App Router file structure", () => {
  describe("root layout", () => {
    it("layout.tsx exists", () => {
      expect(existsSync(join(APP_DIR, "layout.tsx"))).toBe(true);
    });

    it("globals.css exists", () => {
      expect(existsSync(join(APP_DIR, "globals.css"))).toBe(true);
    });
  });

  describe("(auth) route group", () => {
    it("auth layout exists", () => {
      expect(existsSync(join(APP_DIR, "(auth)", "layout.tsx"))).toBe(true);
    });

    it("login page exists", () => {
      expect(existsSync(join(APP_DIR, "(auth)", "login", "page.tsx"))).toBe(
        true
      );
    });

    it("onboarding page exists", () => {
      expect(
        existsSync(join(APP_DIR, "(auth)", "onboarding", "page.tsx"))
      ).toBe(true);
    });
  });

  describe("(dashboard) route group", () => {
    it("dashboard layout exists", () => {
      expect(existsSync(join(APP_DIR, "(dashboard)", "layout.tsx"))).toBe(true);
    });

    const dashboardPages = [
      ["page.tsx", "Dashboard home"],
      [join("console", "page.tsx"), "Console"],
      [join("rollup", "page.tsx"), "Rollup"],
      [join("analytics", "page.tsx"), "Analytics"],
      [join("goals", "page.tsx"), "Goals"],
      [join("reports", "page.tsx"), "Reports"],
      [join("supply-chain", "page.tsx"), "Supply Chain"],
      [join("knowledge", "page.tsx"), "Knowledge"],
      [join("materiality", "page.tsx"), "Materiality"],
      [join("industry-data", "page.tsx"), "Industry Data"],
    ];

    for (const [path, label] of dashboardPages) {
      it(`${label} page exists at (dashboard)/${path}`, () => {
        expect(existsSync(join(APP_DIR, "(dashboard)", path))).toBe(true);
      });
    }

    const settingsPages = [
      ["page.tsx", "Settings overview"],
      [join("users", "page.tsx"), "Users"],
      [join("parameters", "page.tsx"), "Parameters"],
      [join("integrations", "page.tsx"), "Integrations"],
      [join("documents", "page.tsx"), "Documents"],
      [join("thresholds", "page.tsx"), "Thresholds"],
      [join("audit", "page.tsx"), "Audit"],
      [join("health", "page.tsx"), "Health"],
    ];

    for (const [path, label] of settingsPages) {
      it(`Settings ${label} page exists`, () => {
        expect(
          existsSync(join(APP_DIR, "(dashboard)", "settings", path))
        ).toBe(true);
      });
    }
  });

  describe("legacy AppShell", () => {
    it("old root page.tsx is removed (no more AppShell entry point)", () => {
      expect(existsSync(join(APP_DIR, "page.tsx"))).toBe(false);
    });
  });
});
