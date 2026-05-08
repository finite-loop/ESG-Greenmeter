import { describe, it, expect } from "vitest";
import { generateCorrelationId } from "./correlationId";

describe("correlationId", () => {
  describe("generateCorrelationId", () => {
    it("generates a valid UUID v4 string", () => {
      const id = generateCorrelationId();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it("generates unique IDs on each call", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateCorrelationId()));
      expect(ids.size).toBe(100);
    });
  });
});
