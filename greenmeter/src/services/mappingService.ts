import { createLlmClient } from '@/lib/llm';
import { logger } from '@/lib/logger';
import type { ParameterRow } from '@/db/repositories/parameterRepository';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedMetricRow {
  metricId: string;
  extractionId: string;
  tenantId: string;
  standard: string;
  section: string | null;
  topic: string | null;
  metricName: string;
  metricValue: string | null;
  parsedValue: string | null;
  unit: string | null;
  indicatorType: string | null;
  additionalContext: string | null;
}

export interface AliasRow {
  aliasId: string;
  paramId: string;
  aliasText: string;
  standard: string | null;
}

export interface MappingRuleRow {
  ruleId: string;
  standard: string;
  sectionPattern: string | null;
  metricPattern: string;
  targetParamId: string | null;
  priority: number | null;
  active: boolean | null;
}

export interface MappingResult {
  paramId: string | null;
  confidence: number;
  method: 'exact' | 'pattern' | 'fuzzy' | 'llm' | 'none';
  /** Optional pillar guess for unmapped metrics */
  pillarGuess?: string | null;
  /** Optional category guess for unmapped metrics */
  categoryGuess?: string | null;
}

export interface MappingThresholds {
  autoMapThreshold: number;   // default 85
  reviewThreshold: number;    // default 60
}

// ---------------------------------------------------------------------------
// Trigram similarity utilities (no external dependency)
// ---------------------------------------------------------------------------

/**
 * Generate trigrams from a string. Pads with leading/trailing spaces
 * to give weight to word boundaries.
 */
export function generateTrigrams(text: string): Set<string> {
  const normalized = ` ${text.toLowerCase().trim()} `;
  const trigrams = new Set<string>();
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.slice(i, i + 3));
  }
  return trigrams;
}

/**
 * Compute Jaccard similarity between two trigram sets.
 * Returns a value between 0 and 1.
 */
export function trigramSimilarity(a: string, b: string): number {
  const trigramsA = generateTrigrams(a);
  const trigramsB = generateTrigrams(b);

  if (trigramsA.size === 0 && trigramsB.size === 0) return 1;
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const tri of trigramsA) {
    if (trigramsB.has(tri)) intersection++;
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// Cascade stages
// ---------------------------------------------------------------------------

/**
 * Stage 1: Exact alias match.
 * Checks if the metric name exactly matches any alias text (case-insensitive).
 * Returns confidence 100 on match.
 */
function exactAliasMatch(
  metricName: string,
  aliases: AliasRow[],
  standard: string
): MappingResult | null {
  const normalizedName = metricName.toLowerCase().trim();

  for (const alias of aliases) {
    // Filter by standard if alias has one
    if (alias.standard && alias.standard !== standard) continue;

    if (alias.aliasText.toLowerCase().trim() === normalizedName) {
      return {
        paramId: alias.paramId,
        confidence: 100,
        method: 'exact',
      };
    }
  }

  return null;
}

/**
 * Stage 2: Pattern rule match.
 * Checks if the metric name matches any configured regex pattern.
 * Returns confidence 85 on match (pattern rules are curated).
 */
function patternRuleMatch(
  metricName: string,
  section: string | null,
  rules: MappingRuleRow[],
  standard: string
): MappingResult | null {
  const normalizedName = metricName.toLowerCase().trim();
  const normalizedSection = section?.toLowerCase().trim() ?? '';

  // Sort by priority descending (higher priority first)
  const sortedRules = [...rules]
    .filter((r) => r.active !== false && r.standard === standard)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of sortedRules) {
    try {
      const metricRegex = new RegExp(rule.metricPattern, 'i');

      // Guard against catastrophic backtracking: test against a length-limited input
      const testInput = normalizedName.slice(0, 500);
      if (!metricRegex.test(testInput)) continue;

      // If section pattern is specified, check it too
      if (rule.sectionPattern) {
        const sectionRegex = new RegExp(rule.sectionPattern, 'i');
        const sectionInput = normalizedSection.slice(0, 500);
        if (!sectionRegex.test(sectionInput)) continue;
      }

      if (rule.targetParamId) {
        return {
          paramId: rule.targetParamId,
          confidence: 85,
          method: 'pattern',
        };
      }
    } catch {
      // Invalid regex — skip this rule
      logger.warn('Invalid regex in mapping rule', { ruleId: rule.ruleId, pattern: rule.metricPattern });
    }
  }

  return null;
}

/**
 * Stage 3: Fuzzy trigram match.
 * Compares the metric name against parameter names and alias texts.
 * Scales the raw similarity (0-1) into a confidence score (0-100).
 * Only returns if the best match exceeds a minimum similarity threshold (0.3).
 */
function fuzzyTrigramMatch(
  metricName: string,
  parameters: ParameterRow[],
  aliases: AliasRow[],
  standard: string
): MappingResult | null {
  const MIN_SIMILARITY = 0.3;
  const MIN_NAME_LENGTH = 3;

  // Short metric names produce unreliable trigram matches
  if (metricName.trim().length < MIN_NAME_LENGTH) return null;

  let bestParamId: string | null = null;
  let bestSimilarity = 0;

  // Match against parameter names (filtered by standard)
  for (const param of parameters) {
    if (param.standard !== standard) continue;

    const similarity = trigramSimilarity(metricName, param.name);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestParamId = param.paramId;
    }
  }

  // Match against alias texts
  for (const alias of aliases) {
    if (alias.standard && alias.standard !== standard) continue;

    const similarity = trigramSimilarity(metricName, alias.aliasText);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestParamId = alias.paramId;
    }
  }

  if (bestSimilarity < MIN_SIMILARITY || !bestParamId) return null;

  // Scale similarity to confidence: 0.3 maps to ~30, 1.0 maps to 100
  const confidence = Math.round(bestSimilarity * 100);

  return {
    paramId: bestParamId,
    confidence,
    method: 'fuzzy',
  };
}

// ---------------------------------------------------------------------------
// LLM classification prompt
// ---------------------------------------------------------------------------

const LLM_MAPPING_SYSTEM_PROMPT = `You are an ESG metric mapping assistant. Your job is to match an extracted metric to the most likely parameter from a list of candidates.

You will receive:
- A metric name, section, and standard
- A list of candidate parameters with their IDs and names

Respond with ONLY a JSON object in this format:
{
  "paramId": "<uuid of the best matching parameter or null if no match>",
  "confidence": <number 0-100>,
  "pillarGuess": "<E, S, or G>",
  "categoryGuess": "<brief category like 'emissions', 'water', 'workforce'>"
}

Rules:
- If a candidate is clearly the same metric, set confidence 80-95
- If a candidate is related but not exact, set confidence 50-75
- If no candidate is a reasonable match, set paramId to null and confidence to 0
- Always provide pillarGuess and categoryGuess based on the metric name
- Respond with ONLY the JSON object, no other text`;

/**
 * Build the user prompt for LLM classification.
 */
function buildLlmUserPrompt(
  metricName: string,
  section: string | null,
  standard: string,
  candidates: Array<{ paramId: string; name: string; code: string }>
): string {
  const candidateList = candidates
    .map((c) => `  - ${c.paramId}: ${c.name} (${c.code})`)
    .join('\n');

  return `Metric name: "${metricName}"
Section: "${section ?? 'unknown'}"
Standard: ${standard}

Candidate parameters:
${candidateList}`;
}

/**
 * Stage 4: LLM classification.
 * Sends the metric and top candidate parameters to the LLM for classification.
 * Returns the LLM's mapping decision with confidence.
 */
async function llmClassification(
  metricName: string,
  section: string | null,
  standard: string,
  parameters: ParameterRow[]
): Promise<MappingResult> {
  // Filter candidates to the same standard, limit to top 30 to keep prompt size manageable
  const candidates = parameters
    .filter((p) => p.standard === standard)
    .slice(0, 30)
    .map((p) => ({ paramId: p.paramId, name: p.name, code: p.code }));

  if (candidates.length === 0) {
    return { paramId: null, confidence: 0, method: 'llm', pillarGuess: null, categoryGuess: null };
  }

  try {
    const llmClient = createLlmClient();
    const userPrompt = buildLlmUserPrompt(metricName, section, standard, candidates);

    const response = await llmClient.complete(LLM_MAPPING_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.1,
      maxTokens: 256,
    });

    // Parse the JSON response
    let parsed: Record<string, unknown>;
    try {
      // Strip code fences if present
      let text = response.trim();
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fenceMatch) text = fenceMatch[1].trim();
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      logger.warn('LLM mapping response was not valid JSON', { metricName, response: response.slice(0, 200) });
      return { paramId: null, confidence: 0, method: 'llm', pillarGuess: null, categoryGuess: null };
    }

    const paramId = typeof parsed.paramId === 'string' ? parsed.paramId : null;
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
      : 0;
    const pillarGuess = typeof parsed.pillarGuess === 'string' ? parsed.pillarGuess : null;
    const categoryGuess = typeof parsed.categoryGuess === 'string' ? parsed.categoryGuess : null;

    // Validate that paramId is actually in candidates
    if (paramId && !candidates.some((c) => c.paramId === paramId)) {
      logger.warn('LLM returned paramId not in candidate list', { paramId, metricName });
      return { paramId: null, confidence: 0, method: 'llm', pillarGuess, categoryGuess };
    }

    return { paramId, confidence, method: 'llm', pillarGuess, categoryGuess };
  } catch (error) {
    logger.error('LLM classification failed', {
      metricName,
      error: error instanceof Error ? error.message : String(error),
    });
    return { paramId: null, confidence: 0, method: 'llm', pillarGuess: null, categoryGuess: null };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Maps a single extracted metric through the 4-stage cascade:
 *   1. Exact alias match (confidence 100)
 *   2. Pattern rule match (confidence 85)
 *   3. Fuzzy trigram match (confidence 0-100)
 *   4. LLM classification (confidence from LLM)
 *
 * Returns the first result that exceeds the review threshold,
 * or falls through to LLM classification if all earlier stages fail.
 */
export async function mapMetric(
  metric: ExtractedMetricRow,
  parameters: ParameterRow[],
  aliases: AliasRow[],
  rules: MappingRuleRow[],
  thresholds: MappingThresholds
): Promise<MappingResult> {
  // Stage 1: Exact alias
  const exactResult = exactAliasMatch(metric.metricName, aliases, metric.standard);
  if (exactResult) return exactResult;

  // Stage 2: Pattern rule
  const patternResult = patternRuleMatch(metric.metricName, metric.section, rules, metric.standard);
  if (patternResult) return patternResult;

  // Stage 3: Fuzzy trigram
  const fuzzyResult = fuzzyTrigramMatch(metric.metricName, parameters, aliases, metric.standard);
  if (fuzzyResult && fuzzyResult.confidence >= thresholds.reviewThreshold) {
    return fuzzyResult;
  }

  // Stage 4: LLM classification
  const llmResult = await llmClassification(metric.metricName, metric.section, metric.standard, parameters);

  // If LLM gave a result, use it — but prefer the higher-confidence result
  // between LLM and any below-threshold fuzzy result
  if (llmResult.paramId && llmResult.confidence > 0) {
    if (fuzzyResult && fuzzyResult.confidence > llmResult.confidence) {
      return {
        ...fuzzyResult,
        pillarGuess: llmResult.pillarGuess,
        categoryGuess: llmResult.categoryGuess,
      };
    }
    return llmResult;
  }

  // If fuzzy had some result but below review threshold, still return it for pillar/category guessing
  if (fuzzyResult) {
    return {
      ...fuzzyResult,
      pillarGuess: llmResult.pillarGuess,
      categoryGuess: llmResult.categoryGuess,
    };
  }

  // Nothing found
  return {
    paramId: null,
    confidence: 0,
    method: 'none',
    pillarGuess: llmResult.pillarGuess,
    categoryGuess: llmResult.categoryGuess,
  };
}

/**
 * Determines the mapping status based on confidence and thresholds.
 */
export function classifyMappingResult(
  result: MappingResult,
  thresholds: MappingThresholds
): 'auto_mapped' | 'auto_mapped_review' | 'unmapped' {
  if (!result.paramId || result.confidence < thresholds.reviewThreshold) {
    return 'unmapped';
  }
  if (result.confidence >= thresholds.autoMapThreshold) {
    return 'auto_mapped';
  }
  return 'auto_mapped_review';
}

export const DEFAULT_THRESHOLDS: MappingThresholds = {
  autoMapThreshold: 85,
  reviewThreshold: 60,
};
