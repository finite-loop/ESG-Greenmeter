import { benchmarkRepository } from '@/db/repositories/benchmarkRepository';
import { logger } from '@/lib/logger';

/** Minimum number of peers required for a valid benchmark */
const MIN_PEER_COUNT = 3;

/** Benchmark result for a single canonical metric */
export interface BenchmarkResult {
  canonicalId: string;
  canonicalName: string;
  pillar: string;
  category: string;
  sectorMedian: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  min: number;
  max: number;
  tenantValue: number | null;
  percentileRank: number | null;
  peerCount: number;
  insufficientData: boolean;
}

/** Available metric for benchmarking */
export interface AvailableMetric {
  canonicalId: string;
  canonicalName: string;
  pillar: string;
  category: string;
  peerCount: number;
  insufficientData: boolean;
}

export const benchmarkService = {
  /**
   * Compute benchmark data for a single canonical metric.
   * Returns percentile breakdown, tenant rank, and insufficient data flag.
   *
   * Q1 = 25th percentile (bottom of second quartile)
   * Q2 = 50th percentile (median, bottom of third quartile)
   * Q3 = 75th percentile (bottom of fourth quartile)
   * Q4 = max value (top of distribution)
   */
  async getBenchmark(
    tenantId: string,
    canonicalId: string,
    fiscalYear: string,
    periodId?: string,
    sector?: string,
    peerIds?: string[]
  ): Promise<BenchmarkResult | null> {
    // Fetch percentile stats from peer data
    const percentiles = await benchmarkRepository.getPercentiles(
      tenantId,
      canonicalId,
      fiscalYear,
      sector,
      peerIds
    );

    if (!percentiles) {
      logger.info('No peer data found for benchmark', {
        tenantId,
        canonicalId,
        fiscalYear,
        sector: sector ?? 'all',
      });
      return null;
    }

    const insufficientData = percentiles.peerCount < MIN_PEER_COUNT;

    // Get tenant's own value and percentile rank
    let tenantValue: number | null = null;
    let percentileRank: number | null = null;

    if (periodId) {
      const tenantMetric = await benchmarkRepository.getTenantValue(
        tenantId,
        canonicalId,
        periodId
      );

      if (tenantMetric) {
        tenantValue = tenantMetric.value;

        percentileRank = await benchmarkRepository.getPercentileRank(
          tenantId,
          canonicalId,
          fiscalYear,
          tenantMetric.value,
          sector,
          peerIds
        );
      }
    }

    return {
      canonicalId: percentiles.canonicalId,
      canonicalName: percentiles.canonicalName,
      pillar: percentiles.pillar,
      category: percentiles.category,
      sectorMedian: percentiles.median,
      q1: percentiles.q1,
      q2: percentiles.median,
      q3: percentiles.q3,
      q4: percentiles.max,
      min: percentiles.min,
      max: percentiles.max,
      tenantValue,
      percentileRank,
      peerCount: percentiles.peerCount,
      insufficientData,
    };
  },

  /**
   * List all canonical metrics with available peer data for benchmarking.
   */
  async listAvailableMetrics(
    tenantId: string,
    fiscalYear: string,
    sector?: string,
    peerIds?: string[]
  ): Promise<AvailableMetric[]> {
    const metrics = await benchmarkRepository.getAvailableMetrics(
      tenantId,
      fiscalYear,
      sector,
      peerIds
    );

    return metrics.map((m) => ({
      canonicalId: m.canonicalId,
      canonicalName: m.canonicalName,
      pillar: m.pillar,
      category: m.category,
      peerCount: m.peerCount,
      insufficientData: m.peerCount < MIN_PEER_COUNT,
    }));
  },
};
