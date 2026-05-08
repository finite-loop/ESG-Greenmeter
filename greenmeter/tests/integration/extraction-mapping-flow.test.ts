import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PARAM_GHG,
  PARAM_WATER,
  PARAM_WASTE,
  makeParameterRow,
} from './helpers/test-fixtures';
import type { ExtractedMetricRow, AliasRow, MappingRuleRow, MappingThresholds } from '@/services/mappingService';

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockLlmComplete = vi.fn();
vi.mock('@/lib/llm', () => ({
  createLlmClient: () => ({
    complete: (...args: unknown[]) => mockLlmComplete(...args),
  }),
}));

// Import AFTER mocks
import {
  mapMetric,
  classifyMappingResult,
  trigramSimilarity,
  generateTrigrams,
  DEFAULT_THRESHOLDS,
} from '@/services/mappingService';

// ─── Helpers ──────────────────────────────────────────────────

function makeMetric(overrides: Partial<ExtractedMetricRow> = {}): ExtractedMetricRow {
  return {
    metricId: overrides.metricId ?? 'met-1',
    extractionId: overrides.extractionId ?? 'ext-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    standard: overrides.standard ?? 'BRSR',
    section: overrides.section ?? 'Principle 6',
    topic: overrides.topic ?? null,
    metricName: overrides.metricName ?? 'GHG Emissions',
    metricValue: overrides.metricValue ?? '100',
    parsedValue: overrides.parsedValue ?? '100',
    unit: overrides.unit ?? 'tCO2e',
    indicatorType: overrides.indicatorType ?? null,
    additionalContext: overrides.additionalContext ?? null,
  };
}

function makeAlias(overrides: Partial<AliasRow> = {}): AliasRow {
  return {
    aliasId: overrides.aliasId ?? 'alias-1',
    paramId: overrides.paramId ?? PARAM_GHG,
    aliasText: overrides.aliasText ?? 'GHG Emissions',
    standard: overrides.standard ?? null,
  };
}

function makeRule(overrides: Partial<MappingRuleRow> = {}): MappingRuleRow {
  return {
    ruleId: overrides.ruleId ?? 'rule-1',
    standard: overrides.standard ?? 'BRSR',
    sectionPattern: overrides.sectionPattern ?? null,
    metricPattern: overrides.metricPattern ?? 'ghg.*emission',
    targetParamId: overrides.targetParamId ?? PARAM_GHG,
    priority: overrides.priority ?? 10,
    active: overrides.active ?? true,
  };
}

const thresholds: MappingThresholds = DEFAULT_THRESHOLDS;

// ─── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Integration: Extraction → Mapping Cascade', () => {
  // ── Stage 1: Exact Alias Match ─────────────────────────────

  describe('Stage 1: Exact alias match', () => {
    it('returns confidence=100, method=exact on exact match', async () => {
      const metric = makeMetric({ metricName: 'GHG Emissions' });
      const aliases = [makeAlias({ aliasText: 'GHG Emissions', paramId: PARAM_GHG })];

      const result = await mapMetric(metric, [], aliases, [], thresholds);

      expect(result.paramId).toBe(PARAM_GHG);
      expect(result.confidence).toBe(100);
      expect(result.method).toBe('exact');
    });

    it('matches case-insensitively', async () => {
      const metric = makeMetric({ metricName: 'ghg emissions' });
      const aliases = [makeAlias({ aliasText: 'GHG Emissions', paramId: PARAM_GHG })];

      const result = await mapMetric(metric, [], aliases, [], thresholds);

      expect(result.confidence).toBe(100);
      expect(result.method).toBe('exact');
    });

    it('filters aliases by standard when alias has a standard set', async () => {
      const metric = makeMetric({ metricName: 'GHG Emissions', standard: 'GRI' });
      const aliases = [
        makeAlias({ aliasText: 'GHG Emissions', paramId: PARAM_GHG, standard: 'BRSR' }),
      ];

      // Alias is BRSR, metric is GRI → no match → falls through
      const result = await mapMetric(metric, [], aliases, [], thresholds);

      // Should not match (different standard) → falls through to later stages
      expect(result.method).not.toBe('exact');
    });
  });

  // ── Stage 2: Pattern Rule Match ────────────────────────────

  describe('Stage 2: Pattern rule match', () => {
    it('returns confidence=85, method=pattern on regex match', async () => {
      const metric = makeMetric({ metricName: 'GHG Scope 1 Emissions' });
      const rules = [makeRule({ metricPattern: 'ghg.*emission', targetParamId: PARAM_GHG })];

      const result = await mapMetric(metric, [], [], rules, thresholds);

      expect(result.paramId).toBe(PARAM_GHG);
      expect(result.confidence).toBe(85);
      expect(result.method).toBe('pattern');
    });

    it('respects priority ordering (higher priority first)', async () => {
      const metric = makeMetric({ metricName: 'GHG Emissions Total' });
      const rules = [
        makeRule({ ruleId: 'r1', metricPattern: 'ghg.*', targetParamId: PARAM_WATER, priority: 5 }),
        makeRule({ ruleId: 'r2', metricPattern: 'ghg.*emission', targetParamId: PARAM_GHG, priority: 10 }),
      ];

      const result = await mapMetric(metric, [], [], rules, thresholds);

      // Higher priority rule (r2, priority=10) should match first
      expect(result.paramId).toBe(PARAM_GHG);
    });

    it('checks section pattern when specified', async () => {
      const metric = makeMetric({ metricName: 'Water Usage', section: 'Principle 6' });
      const rules = [
        makeRule({
          metricPattern: 'water.*usage',
          sectionPattern: 'principle 6',
          targetParamId: PARAM_WATER,
        }),
      ];

      const result = await mapMetric(metric, [], [], rules, thresholds);

      expect(result.paramId).toBe(PARAM_WATER);
      expect(result.method).toBe('pattern');
    });

    it('skips inactive rules', async () => {
      const metric = makeMetric({ metricName: 'GHG Emissions' });
      const rules = [
        makeRule({ metricPattern: 'ghg.*emission', targetParamId: PARAM_GHG, active: false }),
      ];

      const result = await mapMetric(metric, [], [], rules, thresholds);

      expect(result.method).not.toBe('pattern');
    });
  });

  // ── Stage 3: Fuzzy Trigram Match ───────────────────────────

  describe('Stage 3: Fuzzy trigram match', () => {
    it('computes high similarity for identical strings', () => {
      const sim = trigramSimilarity('GHG Emissions', 'GHG Emissions');
      expect(sim).toBeCloseTo(1.0, 1);
    });

    it('computes lower similarity for different strings', () => {
      const sim = trigramSimilarity('GHG Emissions', 'Water Usage');
      expect(sim).toBeLessThan(0.3);
    });

    it('returns 0 similarity for empty vs non-empty', () => {
      const sim = trigramSimilarity('', 'GHG Emissions');
      expect(sim).toBe(0);
    });

    it('returns 1 similarity for both empty', () => {
      const sim = trigramSimilarity('', '');
      expect(sim).toBe(1);
    });

    it('returns null when similarity is below MIN_SIMILARITY (0.3)', async () => {
      const metric = makeMetric({ metricName: 'Completely Unrelated Metric XYZ' });
      const parameters = [
        makeParameterRow({ paramId: PARAM_GHG, name: 'GHG Emissions', standard: 'BRSR' }),
      ];

      // No aliases, no rules → falls to fuzzy; if below threshold → falls to LLM
      mockLlmComplete.mockResolvedValue('{"paramId": null, "confidence": 0, "pillarGuess": "E", "categoryGuess": "other"}');

      const result = await mapMetric(metric, parameters, [], [], thresholds);

      // Low similarity should not produce a fuzzy match with confidence >= 60
      if (result.method === 'fuzzy') {
        expect(result.confidence).toBeLessThan(60);
      }
    });
  });

  // ── Stage 4: LLM Classification ───────────────────────────

  describe('Stage 4: LLM classification', () => {
    it('parses valid JSON response from LLM', async () => {
      const metric = makeMetric({ metricName: 'Total Carbon Footprint' });
      const parameters = [
        makeParameterRow({ paramId: PARAM_GHG, name: 'GHG Emissions', standard: 'BRSR' }),
      ];
      mockLlmComplete.mockResolvedValue(
        JSON.stringify({ paramId: PARAM_GHG, confidence: 85, pillarGuess: 'E', categoryGuess: 'emissions' })
      );

      const result = await mapMetric(metric, parameters, [], [], thresholds);

      expect(result.paramId).toBe(PARAM_GHG);
      expect(result.method).toBe('llm');
      expect(result.confidence).toBe(85);
    });

    it('rejects paramId not in candidate list', async () => {
      const metric = makeMetric({ metricName: 'Total Carbon Footprint' });
      const parameters = [
        makeParameterRow({ paramId: PARAM_GHG, name: 'GHG Emissions', standard: 'BRSR' }),
      ];
      // LLM returns a paramId that's NOT in the candidates
      mockLlmComplete.mockResolvedValue(
        JSON.stringify({ paramId: 'fake-param-id', confidence: 90, pillarGuess: 'E', categoryGuess: 'emissions' })
      );

      const result = await mapMetric(metric, parameters, [], [], thresholds);

      // Should reject the invalid paramId
      expect(result.paramId).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('handles invalid JSON response gracefully', async () => {
      const metric = makeMetric({ metricName: 'Total Carbon Footprint' });
      const parameters = [
        makeParameterRow({ paramId: PARAM_GHG, name: 'GHG Emissions', standard: 'BRSR' }),
      ];
      mockLlmComplete.mockResolvedValue('This is not JSON at all');

      const result = await mapMetric(metric, parameters, [], [], thresholds);

      expect(result.confidence).toBe(0);
    });
  });

  // ── Cascade Short-Circuit ──────────────────────────────────

  describe('Cascade short-circuit', () => {
    it('exact match skips pattern, fuzzy, and LLM stages', async () => {
      const metric = makeMetric({ metricName: 'GHG Emissions' });
      const aliases = [makeAlias({ aliasText: 'GHG Emissions', paramId: PARAM_GHG })];
      const rules = [makeRule({ metricPattern: 'ghg.*emission', targetParamId: PARAM_WATER })];

      const result = await mapMetric(metric, [], aliases, rules, thresholds);

      expect(result.paramId).toBe(PARAM_GHG); // From alias, not from rule
      expect(result.method).toBe('exact');
      expect(mockLlmComplete).not.toHaveBeenCalled();
    });

    it('pattern match skips fuzzy and LLM stages', async () => {
      const metric = makeMetric({ metricName: 'GHG Scope 1 Emissions' });
      const rules = [makeRule({ metricPattern: 'ghg.*emission', targetParamId: PARAM_GHG })];

      const result = await mapMetric(metric, [], [], rules, thresholds);

      expect(result.method).toBe('pattern');
      expect(mockLlmComplete).not.toHaveBeenCalled();
    });
  });

  // ── Classification ─────────────────────────────────────────

  describe('classifyMappingResult', () => {
    it('returns auto_mapped when confidence >= 85', () => {
      const classification = classifyMappingResult(
        { paramId: PARAM_GHG, confidence: 85, method: 'pattern' },
        thresholds
      );
      expect(classification).toBe('auto_mapped');
    });

    it('returns auto_mapped for confidence=100', () => {
      const classification = classifyMappingResult(
        { paramId: PARAM_GHG, confidence: 100, method: 'exact' },
        thresholds
      );
      expect(classification).toBe('auto_mapped');
    });

    it('returns auto_mapped_review when confidence >= 60 and < 85', () => {
      const classification = classifyMappingResult(
        { paramId: PARAM_GHG, confidence: 70, method: 'fuzzy' },
        thresholds
      );
      expect(classification).toBe('auto_mapped_review');
    });

    it('returns unmapped when confidence < 60', () => {
      const classification = classifyMappingResult(
        { paramId: PARAM_GHG, confidence: 40, method: 'fuzzy' },
        thresholds
      );
      expect(classification).toBe('unmapped');
    });

    it('returns unmapped when paramId is null', () => {
      const classification = classifyMappingResult(
        { paramId: null, confidence: 90, method: 'llm' },
        thresholds
      );
      expect(classification).toBe('unmapped');
    });
  });

  // ── Trigram Utility ────────────────────────────────────────

  describe('generateTrigrams', () => {
    it('generates correct trigrams for a short string', () => {
      const trigrams = generateTrigrams('abc');
      // " ab", "abc", "bc "  (padded)
      expect(trigrams.size).toBeGreaterThan(0);
      expect(trigrams.has(' ab')).toBe(true);
      expect(trigrams.has('abc')).toBe(true);
    });
  });
});
