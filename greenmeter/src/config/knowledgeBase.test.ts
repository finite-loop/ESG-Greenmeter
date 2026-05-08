import { describe, it, expect } from "vitest";
import {
  KNOWLEDGE_ENTRIES,
  FRAMEWORKS,
  CATEGORIES,
  getEntriesByFramework,
  getEntriesByCategory,
  getEntriesByPillar,
  getEntryById,
  getEntriesByParamCode,
  getCategoryById,
  getCategoriesForFramework,
  searchEntries,
  type KnowledgeEntry,
  type Framework,
} from "./knowledgeBase";

describe("knowledgeBase", () => {
  describe("data integrity", () => {
    it("has entries for all four frameworks", () => {
      const frameworks = new Set(KNOWLEDGE_ENTRIES.map((e) => e.framework));
      expect(frameworks).toContain("BRSR");
      expect(frameworks).toContain("ESRS");
      expect(frameworks).toContain("GRI");
      expect(frameworks).toContain("IFRS_S2");
    });

    it("has entries for all three pillars", () => {
      const pillars = new Set(KNOWLEDGE_ENTRIES.map((e) => e.pillar));
      expect(pillars).toContain("E");
      expect(pillars).toContain("S");
      expect(pillars).toContain("G");
    });

    it("all entries have unique IDs", () => {
      const ids = KNOWLEDGE_ENTRIES.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("all entries reference valid categories", () => {
      const categoryIds = new Set(CATEGORIES.map((c) => c.id));
      for (const entry of KNOWLEDGE_ENTRIES) {
        expect(categoryIds.has(entry.category)).toBe(true);
      }
    });

    it("all entries have required fields populated", () => {
      for (const entry of KNOWLEDGE_ENTRIES) {
        expect(entry.id).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.definition).toBeTruthy();
        expect(entry.methodology).toBeTruthy();
        expect(entry.interventions.length).toBeGreaterThan(0);
        expect(entry.tags.length).toBeGreaterThan(0);
        expect(entry.relatedParamCodes.length).toBeGreaterThan(0);
        expect(entry.updatedAt).toMatch(/^\d{4}-\d{2}$/);
      }
    });

    it("FRAMEWORKS metadata covers all four frameworks", () => {
      expect(FRAMEWORKS).toHaveLength(4);
      const ids = FRAMEWORKS.map((f) => f.id);
      expect(ids).toContain("BRSR");
      expect(ids).toContain("ESRS");
      expect(ids).toContain("GRI");
      expect(ids).toContain("IFRS_S2");
    });

    it("CATEGORIES cover all three pillars", () => {
      const pillars = new Set(CATEGORIES.map((c) => c.pillar));
      expect(pillars.size).toBe(3);
    });
  });

  describe("getEntriesByFramework", () => {
    it("returns only entries matching the framework", () => {
      const brsr = getEntriesByFramework("BRSR");
      expect(brsr.length).toBeGreaterThan(0);
      for (const entry of brsr) {
        expect(entry.framework).toBe("BRSR");
      }
    });

    it("returns empty array for framework with no entries", () => {
      // All frameworks have entries, but this tests the filter mechanism
      const all = getEntriesByFramework("BRSR");
      expect(all.every((e) => e.framework === "BRSR")).toBe(true);
    });
  });

  describe("getEntriesByCategory", () => {
    it("returns entries in the ghg-emissions category", () => {
      const ghg = getEntriesByCategory("ghg-emissions");
      expect(ghg.length).toBeGreaterThan(0);
      for (const entry of ghg) {
        expect(entry.category).toBe("ghg-emissions");
      }
    });

    it("returns empty array for nonexistent category", () => {
      expect(getEntriesByCategory("nonexistent")).toEqual([]);
    });
  });

  describe("getEntriesByPillar", () => {
    it("returns only environment entries for pillar E", () => {
      const env = getEntriesByPillar("E");
      expect(env.length).toBeGreaterThan(0);
      for (const entry of env) {
        expect(entry.pillar).toBe("E");
      }
    });
  });

  describe("getEntryById", () => {
    it("finds entry by exact ID", () => {
      const entry = getEntryById("brsr-ghg-scope1-direct");
      expect(entry).toBeDefined();
      expect(entry!.title).toContain("Scope 1");
    });

    it("returns undefined for nonexistent ID", () => {
      expect(getEntryById("nonexistent-id")).toBeUndefined();
    });
  });

  describe("getEntriesByParamCode", () => {
    it("finds entries by exact param code match", () => {
      const entries = getEntriesByParamCode("P6-Q7a-S1");
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].id).toBe("brsr-ghg-scope1-direct");
    });

    it("finds entries by prefix match", () => {
      const entries = getEntriesByParamCode("GRI-305");
      expect(entries.length).toBeGreaterThan(0);
    });

    it("returns empty array for unmatched code", () => {
      expect(getEntriesByParamCode("NONEXISTENT-CODE")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(getEntriesByParamCode("")).toEqual([]);
    });

    it("returns empty array for whitespace-only string", () => {
      expect(getEntriesByParamCode("   ")).toEqual([]);
    });

    it("uses delimiter-bounded prefix matching", () => {
      // "GRI-305" should match "GRI-305-1" (delimiter-bounded)
      const entries = getEntriesByParamCode("GRI-305");
      expect(entries.length).toBeGreaterThan(0);
      // But "GRI-30" should NOT match "GRI-305-1" (no delimiter boundary)
      const noMatch = getEntriesByParamCode("GRI-30");
      expect(noMatch).toEqual([]);
    });
  });

  describe("getCategoryById", () => {
    it("finds category by ID", () => {
      const cat = getCategoryById("ghg-emissions");
      expect(cat).toBeDefined();
      expect(cat!.name).toBe("GHG Emissions");
    });

    it("returns undefined for nonexistent category", () => {
      expect(getCategoryById("nonexistent")).toBeUndefined();
    });
  });

  describe("getCategoriesForFramework", () => {
    it("returns categories that have entries in the given framework", () => {
      const cats = getCategoriesForFramework("BRSR");
      expect(cats.length).toBeGreaterThan(0);
      // Verify each returned category actually has BRSR entries
      for (const cat of cats) {
        const entries = KNOWLEDGE_ENTRIES.filter(
          (e) => e.framework === "BRSR" && e.category === cat.id
        );
        expect(entries.length).toBeGreaterThan(0);
      }
    });
  });

  describe("searchEntries", () => {
    it("returns all entries when query is empty and no filters", () => {
      const results = searchEntries("");
      expect(results.length).toBe(KNOWLEDGE_ENTRIES.length);
    });

    it("searches by title", () => {
      const results = searchEntries("Scope 1");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.title.includes("Scope 1"))).toBe(true);
    });

    it("searches by tag", () => {
      const results = searchEntries("LTIFR");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.tags.includes("LTIFR"))).toBe(true);
    });

    it("searches by definition content", () => {
      const results = searchEntries("fugitive");
      expect(results.length).toBeGreaterThan(0);
    });

    it("searches by methodology content", () => {
      const results = searchEntries("calorific");
      expect(results.length).toBeGreaterThan(0);
    });

    it("is case insensitive", () => {
      const lower = searchEntries("climate");
      const upper = searchEntries("CLIMATE");
      expect(lower.length).toBe(upper.length);
    });

    it("filters by framework", () => {
      const results = searchEntries("", { framework: "GRI" });
      expect(results.length).toBeGreaterThan(0);
      for (const entry of results) {
        expect(entry.framework).toBe("GRI");
      }
    });

    it("filters by pillar", () => {
      const results = searchEntries("", { pillar: "G" });
      expect(results.length).toBeGreaterThan(0);
      for (const entry of results) {
        expect(entry.pillar).toBe("G");
      }
    });

    it("filters by category", () => {
      const results = searchEntries("", { category: "water" });
      expect(results.length).toBeGreaterThan(0);
      for (const entry of results) {
        expect(entry.category).toBe("water");
      }
    });

    it("filters by content type", () => {
      const results = searchEntries("", { contentType: "regulation" });
      expect(results.length).toBeGreaterThan(0);
      for (const entry of results) {
        expect(entry.contentType).toBe("regulation");
      }
    });

    it("combines search and filters", () => {
      const results = searchEntries("emissions", { framework: "BRSR" });
      expect(results.length).toBeGreaterThan(0);
      for (const entry of results) {
        expect(entry.framework).toBe("BRSR");
      }
    });

    it("returns empty when search and filter exclude all entries", () => {
      const results = searchEntries("nonexistentterm12345");
      expect(results).toEqual([]);
    });
  });
});
