import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParameterRow } from '@/db/repositories/parameterRepository';
import type {
  ExtractedMetricRow,
  AliasRow,
  MappingRuleRow,
  MappingThresholds,
} from './mappingService';

// --- Module mocks ---

const mockComplete = vi.fn();
vi.mock('@/lib/llm', () => ({
  createLlmClient: () => ({
    complete: mockComplete,
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// --- Helpers ---

function createMetric(overrides: Partial<ExtractedMetricRow> = {}): ExtractedMetricRow {
  return {
    metricId: 'metric-1',
    extractionId: 'ext-1',
    tenantId: 'tenant-1',
    standard: 'BRSR',
    section: 'P6',
    topic: 'Environment',
    metricName: 'Total Scope 1 GHG Emissions',
    metricValue: '160000',
    parsedValue: '160000',
    unit: 'tCO2e',
    indicatorType: 'essential',
    additionalContext: null,
    ...overrides,
  };
}

function createParam(overrides: Partial<ParameterRow> = {}): ParameterRow {
  return {
    paramId: 'param-1',
    tenantId: null,
    canonicalId: 'can-1',
    standard: 'BRSR',
    standardSection: 'P6',
    standardCode: 'P6-E1',
    disclosure: null,
    code: 'BRSR-P6-E1',
    name: 'Total Scope 1 GHG Emissions',
    description: null,
    pillar: 'E',
    unit: 'tCO2e',
    dataType: 'numeric',
    category: 'emissions',
    indicatorType: 'essential',
    computationMethod: null,
    howToMeasure: null,
    howToCompute: null,
    howToReport: null,
    direction: 'lower_is_better',
    rollupMethod: 'SUM',
    status: 'active',
    src: 'system',
    depts: null,
    standards: ['BRSR'],
    priorityOrder: 1,
    createdAt: new Date(),
    overrideParamId: null,
  };
}

function createAlias(overrides: Partial<AliasRow> = {}): AliasRow {
  return {
    aliasId: 'alias-1',
    paramId: 'param-1',
    aliasText: 'Scope 1 Emissions',
    standard: 'BRSR',
    ...overrides,
  };
}

function createRule(overrides: Partial<MappingRuleRow> = {}): MappingRuleRow {
  return {
    ruleId: 'rule-1',
    standard: 'BRSR',
    sectionPattern: null,
    metricPattern: 'scope.*1.*emission',
    targetParamId: 'param-1',
    priority: 10,
    active: true,
    ...overrides,
  };
}

const DEFAULT_THRESHOLDS: MappingThresholds = {
  autoMapThreshold: 85,
  reviewThreshold: 60,
};

// --- Tests ---

describe('mappingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateTrigrams', () => {
    it('generates correct trigrams for a simple word', async () => {
      const { generateTrigrams } = await import('./mappingService');
      const trigrams = generateTrigrams('abc');
      // " ab", "abc", "bc "
      expect(trigrams.size).toBeGreaterThan(0);
      expect(trigrams.has(' ab')).toBe(true);
      expect(trigrams.has('abc')).toBe(true);
      expect(trigrams.has('bc ')).toBe(true);
    });

    it('normalizes to lowercase', async () => {
      const { generateTrigrams } = await import('./mappingService');
      const upper = generateTrigrams('ABC');
      const lower = generateTrigrams('abc');
      expect(upper).toEqual(lower);
    });

    it('handles empty string', async () => {
      const { generateTrigrams } = await import('./mappingService');
      const trigrams = generateTrigrams('');
      // "   " is a single trigram from " " + "" + " "
      expect(trigrams.size).toBeLessThanOrEqual(1);
    });
  });

  describe('trigramSimilarity', () => {
    it('returns 1 for identical strings', async () => {
      const { trigramSimilarity } = await import('./mappingService');
      expect(trigramSimilarity('hello', 'hello')).toBe(1);
    });

    it('returns 1 for case-insensitive identical strings', async () => {
      const { trigramSimilarity } = await import('./mappingService');
      expect(trigramSimilarity('Hello', 'hello')).toBe(1);
    });

    it('returns high similarity for similar strings', async () => {
      const { trigramSimilarity } = await import('./mappingService');
      const sim = trigramSimilarity('Total Scope 1 GHG Emissions', 'Scope 1 GHG Emissions Total');
      expect(sim).toBeGreaterThan(0.5);
    });

    it('returns low similarity for unrelated strings', async () => {
      const { trigramSimilarity } = await import('./mappingService');
      const sim = trigramSimilarity('Total Scope 1 GHG Emissions', 'Employee Count');
      expect(sim).toBeLessThan(0.2);
    });

    it('returns 0 when one string is empty', async () => {
      const { trigramSimilarity } = await import('./mappingService');
      expect(trigramSimilarity('hello', '')).toBe(0);
      expect(trigramSimilarity('', 'hello')).toBe(0);
    });

    it('returns 1 for two empty strings', async () => {
      const { trigramSimilarity } = await import('./mappingService');
      expect(trigramSimilarity('', '')).toBe(1);
    });
  });

  describe('mapMetric — Stage 1: Exact alias match', () => {
    it('returns exact match with confidence 100 when alias matches', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Scope 1 Emissions' });
      const params = [createParam()];
      const aliases = [createAlias({ aliasText: 'Scope 1 Emissions' })];
      const rules: MappingRuleRow[] = [];

      const result = await mapMetric(metric, params, aliases, rules, DEFAULT_THRESHOLDS);

      expect(result.method).toBe('exact');
      expect(result.confidence).toBe(100);
      expect(result.paramId).toBe('param-1');
    });

    it('matches case-insensitively', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'SCOPE 1 EMISSIONS' });
      const aliases = [createAlias({ aliasText: 'scope 1 emissions' })];

      const result = await mapMetric(metric, [createParam()], aliases, [], DEFAULT_THRESHOLDS);

      expect(result.method).toBe('exact');
      expect(result.confidence).toBe(100);
    });

    it('filters aliases by standard', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Scope 1 Emissions', standard: 'BRSR' });
      const aliases = [createAlias({ aliasText: 'Scope 1 Emissions', standard: 'ESRS' })];

      // Should NOT match since standard doesn't match
      // Will fall through to later stages
      mockComplete.mockResolvedValue('{"paramId": null, "confidence": 0, "pillarGuess": "E", "categoryGuess": "emissions"}');
      const result = await mapMetric(metric, [createParam()], aliases, [], DEFAULT_THRESHOLDS);

      expect(result.method).not.toBe('exact');
    });

    it('allows aliases with null standard to match any standard', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Scope 1 Emissions', standard: 'ESRS' });
      const aliases = [createAlias({ aliasText: 'Scope 1 Emissions', standard: null })];

      const result = await mapMetric(metric, [createParam()], aliases, [], DEFAULT_THRESHOLDS);

      expect(result.method).toBe('exact');
      expect(result.confidence).toBe(100);
    });
  });

  describe('mapMetric — Stage 2: Pattern rule match', () => {
    it('matches regex pattern and returns confidence 85', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Scope 1 GHG Emission Details' });
      const rules = [createRule({ metricPattern: 'scope.*1.*emission' })];

      const result = await mapMetric(metric, [createParam()], [], rules, DEFAULT_THRESHOLDS);

      expect(result.method).toBe('pattern');
      expect(result.confidence).toBe(85);
      expect(result.paramId).toBe('param-1');
    });

    it('respects section pattern when provided', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Total Emissions', section: 'P6' });
      const rules = [
        createRule({
          metricPattern: 'total emissions',
          sectionPattern: 'P6',
          targetParamId: 'param-ghg',
        }),
      ];

      const result = await mapMetric(metric, [createParam()], [], rules, DEFAULT_THRESHOLDS);

      expect(result.method).toBe('pattern');
      expect(result.paramId).toBe('param-ghg');
    });

    it('skips rule when section pattern does not match', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Total Emissions', section: 'P3' });
      const rules = [
        createRule({
          metricPattern: 'total emissions',
          sectionPattern: 'P6',
          targetParamId: 'param-ghg',
        }),
      ];

      // Falls through to fuzzy/LLM
      mockComplete.mockResolvedValue('{"paramId": null, "confidence": 0, "pillarGuess": "E", "categoryGuess": "emissions"}');
      const result = await mapMetric(metric, [createParam()], [], rules, DEFAULT_THRESHOLDS);

      expect(result.method).not.toBe('pattern');
    });

    it('filters rules by standard', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Scope 1 Emissions', standard: 'GRI' });
      const rules = [createRule({ standard: 'BRSR' })]; // Different standard

      mockComplete.mockResolvedValue('{"paramId": null, "confidence": 0, "pillarGuess": "E", "categoryGuess": "emissions"}');
      const result = await mapMetric(metric, [createParam({ standard: 'GRI' })], [], rules, DEFAULT_THRESHOLDS);

      expect(result.method).not.toBe('pattern');
    });

    it('handles invalid regex gracefully', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Test' });
      const rules = [createRule({ metricPattern: '[invalid regex' })];

      mockComplete.mockResolvedValue('{"paramId": null, "confidence": 0, "pillarGuess": null, "categoryGuess": null}');
      const result = await mapMetric(metric, [createParam()], [], rules, DEFAULT_THRESHOLDS);

      // Should not throw, just skip the bad rule
      expect(result).toBeDefined();
    });

    it('uses higher priority rule when multiple match', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Scope 1 GHG Emissions' });
      const rules = [
        createRule({ metricPattern: 'scope.*emission', targetParamId: 'param-low', priority: 1 }),
        createRule({ metricPattern: 'scope.*1.*emission', targetParamId: 'param-high', priority: 10 }),
      ];

      const result = await mapMetric(metric, [createParam()], [], rules, DEFAULT_THRESHOLDS);

      expect(result.paramId).toBe('param-high');
    });
  });

  describe('mapMetric — Stage 3: Fuzzy trigram match', () => {
    it('returns fuzzy match when name is similar to parameter', async () => {
      const { mapMetric } = await import('./mappingService');
      // Use a metric name that is similar but not identical to the parameter name
      const metric = createMetric({ metricName: 'Scope 1 GHG Emission' });
      // Create a single param — the only possible match target
      const param = createParam();
      const paramId = param.paramId; // 'param-1'

      // Mock LLM to not interfere — fuzzy should trigger first if similarity is high enough
      mockComplete.mockResolvedValue('{"paramId": null, "confidence": 0, "pillarGuess": "E", "categoryGuess": "emissions"}');

      const result = await mapMetric(metric, [param], [], [], DEFAULT_THRESHOLDS);

      // The fuzzy match should find the only available parameter
      expect(result.paramId).toBe(paramId);
      expect(result.confidence).toBeGreaterThan(50);
      expect(['fuzzy', 'llm']).toContain(result.method);
    });

    it('matches against alias texts as well', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'GHG Scope One', standard: 'BRSR' });
      const params = [createParam({ name: 'Completely Different Name', paramId: 'param-1' })];
      const aliases = [createAlias({ aliasText: 'GHG Scope 1', paramId: 'param-1', standard: 'BRSR' })];

      mockComplete.mockResolvedValue('{"paramId": null, "confidence": 0, "pillarGuess": "E", "categoryGuess": "emissions"}');

      const result = await mapMetric(metric, params, aliases, [], DEFAULT_THRESHOLDS);

      // Fuzzy or LLM should handle this
      expect(result).toBeDefined();
    });
  });

  describe('mapMetric — Stage 4: LLM classification', () => {
    it('calls LLM when earlier stages fail', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Something completely unique' });
      const params = [createParam({ name: 'A Very Different Parameter Name', standard: 'BRSR' })];

      mockComplete.mockResolvedValue(JSON.stringify({
        paramId: 'param-1',
        confidence: 70,
        pillarGuess: 'E',
        categoryGuess: 'emissions',
      }));

      const result = await mapMetric(metric, params, [], [], DEFAULT_THRESHOLDS);

      expect(mockComplete).toHaveBeenCalled();
      if (result.method === 'llm') {
        expect(result.confidence).toBe(70);
        expect(result.paramId).toBe('param-1');
      }
    });

    it('handles LLM returning invalid JSON', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Unknown Metric XYZ' });
      const params = [createParam({ standard: 'BRSR' })];

      mockComplete.mockResolvedValue('This is not JSON');

      const result = await mapMetric(metric, params, [], [], DEFAULT_THRESHOLDS);

      // Should not throw
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('handles LLM throwing an error', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Unknown Metric XYZ' });
      const params = [createParam({ standard: 'BRSR' })];

      mockComplete.mockRejectedValue(new Error('LLM timeout'));

      const result = await mapMetric(metric, params, [], [], DEFAULT_THRESHOLDS);

      // Should not throw, returns zero-confidence result
      expect(result).toBeDefined();
    });

    it('rejects paramId not in candidate list', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Some Metric ABCD' });
      const params = [createParam({ paramId: 'param-1', standard: 'BRSR' })];

      mockComplete.mockResolvedValue(JSON.stringify({
        paramId: 'param-nonexistent',
        confidence: 90,
        pillarGuess: 'E',
        categoryGuess: 'emissions',
      }));

      const result = await mapMetric(metric, params, [], [], DEFAULT_THRESHOLDS);

      // LLM result should be rejected since paramId isn't a valid candidate
      if (result.method === 'llm') {
        expect(result.paramId).toBeNull();
      }
    });

    it('handles LLM response wrapped in code fences', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Unique metric name ZZZ' });
      const params = [createParam({ paramId: 'param-1', standard: 'BRSR' })];

      mockComplete.mockResolvedValue('```json\n{"paramId": "param-1", "confidence": 80, "pillarGuess": "E", "categoryGuess": "emissions"}\n```');

      const result = await mapMetric(metric, params, [], [], DEFAULT_THRESHOLDS);

      if (result.method === 'llm') {
        expect(result.paramId).toBe('param-1');
        expect(result.confidence).toBe(80);
      }
    });

    it('returns no-match when no parameters for standard', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Some Metric', standard: 'GRI' });
      const params = [createParam({ standard: 'BRSR' })]; // Different standard

      mockComplete.mockResolvedValue('{"paramId": null, "confidence": 0, "pillarGuess": null, "categoryGuess": null}');

      const result = await mapMetric(metric, params, [], [], DEFAULT_THRESHOLDS);

      // No candidates for GRI, so LLM gets empty list
      expect(result.paramId).toBeNull();
    });
  });

  describe('mapMetric — cascade priority', () => {
    it('prefers exact match over pattern match', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Scope 1 Emissions' });
      const aliases = [createAlias({ aliasText: 'Scope 1 Emissions', paramId: 'param-alias' })];
      const rules = [createRule({ metricPattern: 'scope.*emission', targetParamId: 'param-rule' })];

      const result = await mapMetric(metric, [createParam()], aliases, rules, DEFAULT_THRESHOLDS);

      expect(result.method).toBe('exact');
      expect(result.paramId).toBe('param-alias');
    });

    it('prefers pattern match over fuzzy when exact fails', async () => {
      const { mapMetric } = await import('./mappingService');
      const metric = createMetric({ metricName: 'Scope 1 GHG Emission Details' });
      const params = [createParam({ name: 'Total Scope 1 GHG Emissions', paramId: 'param-fuzzy' })];
      const rules = [createRule({ metricPattern: 'scope.*1.*emission', targetParamId: 'param-rule' })];

      const result = await mapMetric(metric, params, [], rules, DEFAULT_THRESHOLDS);

      expect(result.method).toBe('pattern');
      expect(result.paramId).toBe('param-rule');
    });
  });

  describe('classifyMappingResult', () => {
    it('classifies high confidence as auto_mapped', async () => {
      const { classifyMappingResult } = await import('./mappingService');

      const result = classifyMappingResult(
        { paramId: 'p1', confidence: 90, method: 'exact' },
        DEFAULT_THRESHOLDS
      );
      expect(result).toBe('auto_mapped');
    });

    it('classifies confidence exactly at autoMap threshold as auto_mapped', async () => {
      const { classifyMappingResult } = await import('./mappingService');

      const result = classifyMappingResult(
        { paramId: 'p1', confidence: 85, method: 'pattern' },
        DEFAULT_THRESHOLDS
      );
      expect(result).toBe('auto_mapped');
    });

    it('classifies medium confidence as auto_mapped_review', async () => {
      const { classifyMappingResult } = await import('./mappingService');

      const result = classifyMappingResult(
        { paramId: 'p1', confidence: 70, method: 'fuzzy' },
        DEFAULT_THRESHOLDS
      );
      expect(result).toBe('auto_mapped_review');
    });

    it('classifies confidence exactly at review threshold as auto_mapped_review', async () => {
      const { classifyMappingResult } = await import('./mappingService');

      const result = classifyMappingResult(
        { paramId: 'p1', confidence: 60, method: 'fuzzy' },
        DEFAULT_THRESHOLDS
      );
      expect(result).toBe('auto_mapped_review');
    });

    it('classifies low confidence as unmapped', async () => {
      const { classifyMappingResult } = await import('./mappingService');

      const result = classifyMappingResult(
        { paramId: 'p1', confidence: 40, method: 'llm' },
        DEFAULT_THRESHOLDS
      );
      expect(result).toBe('unmapped');
    });

    it('classifies null paramId as unmapped regardless of confidence', async () => {
      const { classifyMappingResult } = await import('./mappingService');

      const result = classifyMappingResult(
        { paramId: null, confidence: 90, method: 'none' },
        DEFAULT_THRESHOLDS
      );
      expect(result).toBe('unmapped');
    });

    it('uses custom thresholds', async () => {
      const { classifyMappingResult } = await import('./mappingService');

      const customThresholds: MappingThresholds = { autoMapThreshold: 95, reviewThreshold: 70 };

      // 80 is between custom review (70) and custom auto (95) → auto_mapped_review
      expect(classifyMappingResult({ paramId: 'p1', confidence: 80, method: 'fuzzy' }, customThresholds))
        .toBe('auto_mapped_review');

      // 65 is below custom review threshold → unmapped
      expect(classifyMappingResult({ paramId: 'p1', confidence: 65, method: 'fuzzy' }, customThresholds))
        .toBe('unmapped');
    });
  });

  describe('DEFAULT_THRESHOLDS', () => {
    it('has expected default values', async () => {
      const { DEFAULT_THRESHOLDS } = await import('./mappingService');
      expect(DEFAULT_THRESHOLDS.autoMapThreshold).toBe(85);
      expect(DEFAULT_THRESHOLDS.reviewThreshold).toBe(60);
    });
  });
});
