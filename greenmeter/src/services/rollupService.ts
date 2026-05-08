import { orgHierarchyRepository } from '@/db/repositories/orgHierarchyRepository';
import { rollupRepository, type ChildValueRow } from '@/db/repositories/rollupRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

/** Units that represent monetary values and require currency conversion. */
const CURRENCY_UNITS = new Set([
  'currency', 'inr', 'usd', 'eur', 'gbp', 'jpy', 'cny',
  'lakhs', 'crores', 'millions', 'billions',
  'rs', 'rs.', '₹', '$', '€', '£',
]);

function isCurrencyUnit(unit: string): boolean {
  return CURRENCY_UNITS.has(unit.toLowerCase());
}

export interface ChildContribution {
  nodeId: string;
  nodeName: string;
  originalValue: number;
  convertedValue: number;
  currency: string | null;
  currencyConverted: boolean;
  conversionRate: number | null;
  /** True when currency conversion was needed but exchange rate was unavailable. */
  missingExchangeRate: boolean;
}

export interface RollupResult {
  paramId: string;
  paramName: string;
  unit: string;
  method: string;
  aggregatedValue: number;
  childContributions: ChildContribution[];
  /** True when at least one child had a missing exchange rate (mixed currencies in aggregation). */
  hasMissingExchangeRates: boolean;
}

export interface RollupSummary {
  nodeId: string;
  nodeName: string;
  nodeCurrency: string | null;
  periodId: string;
  parameters: RollupResult[];
}

export const rollupService = {
  /**
   * Computes rollup aggregation for all parameters at a given node for a period.
   * Recursively aggregates child node values using each parameter's rollup_method.
   * Handles currency conversion at rollup boundaries.
   */
  async computeRollup(
    tenantId: string,
    nodeId: string,
    periodId: string
  ): Promise<RollupResult[]> {
    const node = await orgHierarchyRepository.findById(nodeId);
    if (!node) {
      throw new AppError(ErrorCode.NOT_FOUND, `Org node not found: ${nodeId}`, 404);
    }

    // Get all child values for this node
    const childValues = await rollupRepository.findChildValues(tenantId, nodeId, periodId);

    if (childValues.length === 0) {
      return [];
    }

    // Group child values by paramId
    const paramGroups = new Map<string, ChildValueRow[]>();
    for (const cv of childValues) {
      const existing = paramGroups.get(cv.paramId) ?? [];
      existing.push(cv);
      paramGroups.set(cv.paramId, existing);
    }

    const results: RollupResult[] = [];

    for (const [paramId, values] of paramGroups) {
      const first = values[0];
      const method = first.rollupMethod;

      // Skip parameters that should not be aggregated
      if (method === 'NONE' || method === 'LATEST') {
        continue;
      }

      const needsCurrencyConversion = isCurrencyUnit(first.unit);

      // Build child contributions with optional currency conversion
      const contributions: ChildContribution[] = [];

      for (const cv of values) {
        if (cv.value === null || cv.value === undefined) continue;

        const numericValue = parseFloat(cv.value);
        if (isNaN(numericValue)) continue;

        let convertedValue = numericValue;
        let conversionRate: number | null = null;
        let currencyConverted = false;
        let missingExchangeRate = false;

        // Apply currency conversion if needed
        if (needsCurrencyConversion && cv.nodeCurrency && node.currency && cv.nodeCurrency !== node.currency) {
          const rate = await rollupRepository.findExchangeRate(
            tenantId,
            periodId,
            cv.nodeCurrency,
            node.currency
          );

          if (rate !== null) {
            convertedValue = numericValue * rate;
            conversionRate = rate;
            currencyConverted = true;
          } else {
            missingExchangeRate = true;
            logger.warn('Exchange rate not found for rollup conversion', {
              fromCurrency: cv.nodeCurrency,
              toCurrency: node.currency,
              nodeId: cv.nodeId,
              paramId,
              periodId,
            });
          }
        }

        contributions.push({
          nodeId: cv.nodeId,
          nodeName: cv.nodeName,
          originalValue: numericValue,
          convertedValue,
          currency: cv.nodeCurrency,
          currencyConverted,
          conversionRate,
          missingExchangeRate,
        });
      }

      if (contributions.length === 0) continue;

      // Compute aggregated value based on method
      let aggregatedValue: number;

      switch (method) {
        case 'SUM':
          aggregatedValue = contributions.reduce((sum, c) => sum + c.convertedValue, 0);
          break;
        case 'AVG':
        case 'AVERAGE':
          aggregatedValue =
            contributions.reduce((sum, c) => sum + c.convertedValue, 0) / contributions.length;
          break;
        case 'WEIGHTED_AVG': {
          // Default: equal weighting (equivalent to AVG). When a weight source
          // is added to org_nodes or tenant config, this branch should use
          // actual weights: sum(value * weight) / sum(weights).
          const totalWeight = contributions.length;
          aggregatedValue =
            contributions.reduce((sum, c) => sum + c.convertedValue, 0) / totalWeight;
          break;
        }
        default:
          logger.warn('Unknown rollup method, defaulting to SUM', {
            method,
            paramId,
            nodeId,
          });
          aggregatedValue = contributions.reduce((sum, c) => sum + c.convertedValue, 0);
      }

      // Persist the computed rollup value
      await rollupRepository.upsertRollupValue(
        tenantId,
        paramId,
        nodeId,
        periodId,
        String(aggregatedValue)
      );

      results.push({
        paramId,
        paramName: first.paramName,
        unit: first.unit,
        method,
        aggregatedValue,
        childContributions: contributions,
        hasMissingExchangeRates: contributions.some((c) => c.missingExchangeRate),
      });
    }

    logger.info('Rollup computation completed', {
      nodeId,
      periodId,
      parametersComputed: results.length,
    });

    return results;
  },

  /**
   * Gets a full rollup summary for a node, computing fresh values.
   * Used by the rollup page API.
   */
  async getRollupSummary(
    tenantId: string,
    nodeId: string,
    periodId: string
  ): Promise<RollupSummary> {
    const node = await orgHierarchyRepository.findById(nodeId);
    if (!node) {
      throw new AppError(ErrorCode.NOT_FOUND, `Org node not found: ${nodeId}`, 404);
    }

    const parameters = await this.computeRollup(tenantId, nodeId, periodId);

    return {
      nodeId: node.nodeId,
      nodeName: node.name,
      nodeCurrency: node.currency,
      periodId,
      parameters,
    };
  },

  /**
   * Computes rollups for all ancestor nodes of a given node.
   * Called when a KPI value changes — walks up the hierarchy and recomputes.
   */
  async recomputeAncestors(
    tenantId: string,
    nodeId: string,
    periodId: string
  ): Promise<void> {
    const allNodes = await orgHierarchyRepository.findAllByTenant();
    const nodeMap = new Map(allNodes.map((n) => [n.nodeId, n]));

    // Walk up from the given node to the root
    let currentNodeId: string | null = nodeId;
    const ancestorIds: string[] = [];

    while (currentNodeId) {
      const currentNode = nodeMap.get(currentNodeId);
      if (!currentNode) break;

      // The node's parent needs recomputation (the node itself is a child contributing to its parent)
      if (currentNode.parentNodeId) {
        ancestorIds.push(currentNode.parentNodeId);
      }
      currentNodeId = currentNode.parentNodeId;
    }

    // Recompute from closest ancestor to root (bottom-up)
    for (const ancestorId of ancestorIds) {
      await this.computeRollup(tenantId, ancestorId, periodId);
    }

    if (ancestorIds.length > 0) {
      logger.info('Ancestor rollups recomputed', {
        nodeId,
        periodId,
        ancestorsRecomputed: ancestorIds.length,
      });
    }
  },
};
