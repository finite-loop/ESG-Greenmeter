import { db } from '@/db';
import { kpiValues, kpiParameters } from '@/db/schema/kpi';
import { orgNodes } from '@/db/schema/tenants';
import { tenantConfig } from '@/db/schema/config';
import { eq, and, sql } from 'drizzle-orm';

export interface ChildValueRow {
  paramId: string;
  paramName: string;
  rollupMethod: string;
  unit: string;
  nodeId: string;
  nodeName: string;
  nodeCurrency: string | null;
  value: string | null;
  valueText: string | null;
}

export const rollupRepository = {
  /**
   * Finds all KPI values for direct children of a given parent node for a period.
   * Joins with parameters to get rollup_method and with org_nodes for currency.
   */
  async findChildValues(
    tenantId: string,
    parentNodeId: string,
    periodId: string
  ): Promise<ChildValueRow[]> {
    const rows = await db
      .select({
        paramId: kpiParameters.paramId,
        paramName: kpiParameters.name,
        rollupMethod: kpiParameters.rollupMethod,
        unit: kpiParameters.unit,
        nodeId: orgNodes.nodeId,
        nodeName: orgNodes.name,
        nodeCurrency: orgNodes.currency,
        value: kpiValues.value,
        valueText: kpiValues.valueText,
      })
      .from(kpiValues)
      .innerJoin(
        kpiParameters,
        eq(kpiValues.paramId, kpiParameters.paramId)
      )
      .innerJoin(
        orgNodes,
        eq(kpiValues.nodeId, orgNodes.nodeId)
      )
      .where(
        and(
          eq(kpiValues.tenantId, tenantId),
          eq(orgNodes.parentNodeId, parentNodeId),
          eq(kpiValues.periodId, periodId),
          eq(orgNodes.active, true)
        )
      );

    return rows.map((row) => ({
      paramId: row.paramId,
      paramName: row.paramName ?? '',
      rollupMethod: row.rollupMethod ?? 'SUM',
      unit: row.unit,
      nodeId: row.nodeId,
      nodeName: row.nodeName,
      nodeCurrency: row.nodeCurrency,
      value: row.value,
      valueText: row.valueText,
    }));
  },

  /**
   * Upserts a computed rollup value for a parent node.
   * Uses the unique constraint on (tenantId, paramId, nodeId, periodId) for conflict resolution.
   */
  async upsertRollupValue(
    tenantId: string,
    paramId: string,
    nodeId: string,
    periodId: string,
    value: string
  ): Promise<{ valueId: string }> {
    const rows = await db
      .insert(kpiValues)
      .values({
        tenantId,
        paramId,
        nodeId,
        periodId,
        value,
        sourceType: 'computed',
        sourceRef: 'rollup',
      })
      .onConflictDoUpdate({
        target: [kpiValues.tenantId, kpiValues.paramId, kpiValues.nodeId, kpiValues.periodId],
        set: {
          value,
          sourceType: 'computed',
          sourceRef: 'rollup',
          updatedAt: sql`now()`,
        },
      })
      .returning({ valueId: kpiValues.valueId });

    return rows[0] as { valueId: string };
  },

  /**
   * Finds exchange rate from tenant_config for a given period.
   * Exchange rates are stored as JSON under key 'exchange_rates_{periodId}'.
   * Format: { "USD": 83.0, "EUR": 91.5, ... } — rates to tenant base currency.
   */
  async findExchangeRate(
    tenantId: string,
    periodId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    // Look up exchange rate config for this period
    const configRows = await db
      .select({ value: tenantConfig.value })
      .from(tenantConfig)
      .where(
        and(
          eq(tenantConfig.tenantId, tenantId),
          eq(tenantConfig.key, `exchange_rates_${periodId}`)
        )
      )
      .limit(1);

    if (!configRows[0]) {
      // Fallback: look for a global exchange rates config
      const globalRows = await db
        .select({ value: tenantConfig.value })
        .from(tenantConfig)
        .where(
          and(
            eq(tenantConfig.tenantId, tenantId),
            eq(tenantConfig.key, 'exchange_rates')
          )
        )
        .limit(1);

      if (!globalRows[0]) return null;

      return extractRate(globalRows[0].value, fromCurrency, toCurrency);
    }

    return extractRate(configRows[0].value, fromCurrency, toCurrency);
  },
};

/**
 * Extracts a conversion rate from a rates map.
 * Rates map format: { "USD": 83.0, "EUR": 91.5 } — rates are per-unit to base currency.
 * To convert fromCurrency to toCurrency:
 *   - If fromCurrency rate exists and toCurrency rate exists: value * (toCurrencyRate / fromCurrencyRate)
 *   - If fromCurrency exists and toCurrency is the base (no entry): value * (1 / fromCurrencyRate)
 *   - Actually simplified: rates are stored as "1 unit of X = Y units of base currency"
 *     So to convert 100 USD to INR when rates = { "USD": 83 }: 100 * 83 = 8300 INR
 *     To convert 100 USD to EUR when rates = { "USD": 83, "EUR": 91.5 }: 100 * 83 / 91.5
 */
function extractRate(
  ratesJson: unknown,
  fromCurrency: string,
  toCurrency: string
): number | null {
  if (!ratesJson || typeof ratesJson !== 'object') return null;

  const rates = ratesJson as Record<string, number>;

  // Same currency — rate is 1
  if (fromCurrency === toCurrency) return 1;

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  // If toCurrency is the base currency (not in the map), its rate is 1
  // The base currency is the one not listed — typically the tenant's currency
  if (fromRate !== undefined && toRate === undefined) {
    // fromCurrency → base currency: multiply by fromRate
    return fromRate;
  }

  if (fromRate !== undefined && toRate !== undefined) {
    // Cross-rate: fromCurrency → base → toCurrency
    return fromRate / toRate;
  }

  return null;
}
