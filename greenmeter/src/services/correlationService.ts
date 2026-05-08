import { correlationRepository, type CorrelationPeerRow } from '@/db/repositories/correlationRepository';
import { logger } from '@/lib/logger';
import { AppError, ErrorCode } from '@/lib/errors';

/** Minimum number of peer data points required per metric to be included */
const MIN_DATA_POINTS = 5;

/** Significance threshold for p-value */
const SIGNIFICANCE_LEVEL = 0.05;

/** Maximum number of metrics to include in the correlation matrix to bound computation */
const MAX_METRICS = 50;

/** Metric info returned in the result */
export interface CorrelationMetric {
  canonicalId: string;
  canonicalName: string;
}

/** Result of correlation computation */
export interface CorrelationResult {
  metrics: CorrelationMetric[];
  matrix: (number | null)[][];
  peerCount: number;
  metricsUsed: number;
}

/**
 * Compute Pearson correlation coefficient between two arrays.
 * Returns NaN if either array has zero variance.
 */
function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return NaN;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let covXY = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    covXY += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0 || varY === 0) return NaN;

  return covXY / Math.sqrt(varX * varY);
}

/**
 * Compute approximate p-value for Pearson r using t-distribution approximation.
 * Uses a two-tailed test.
 *
 * For n >= 5, computes t = r * sqrt((n-2) / (1-r^2)), then uses an approximation
 * of the Student's t cumulative distribution function.
 */
function pValueForR(r: number, n: number): number {
  if (n < 3) return 1;
  if (Math.abs(r) >= 1) return 0;

  const df = n - 2;
  const t = r * Math.sqrt(df / (1 - r * r));

  // Approximate two-tailed p-value using the regularized incomplete beta function
  // For the t-distribution: p = I(df/(df+t^2); df/2, 1/2)
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;

  // Use the regularized incomplete beta function approximation
  const betaValue = regularizedIncompleteBeta(x, a, b);
  return betaValue;
}

/**
 * Regularized incomplete beta function I_x(a, b) approximation.
 * Uses a continued fraction expansion (Lentz's method).
 */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use the log-beta for numerical stability
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta);

  // If x < (a + 1) / (a + b + 2), use direct continued fraction
  // Otherwise, use the symmetry relation: I_x(a,b) = 1 - I_{1-x}(b,a)
  if (x < (a + 1) / (a + b + 2)) {
    return front * betaCF(x, a, b) / a;
  }
  return 1 - front * betaCF(1 - x, b, a) / b;
}

/** Continued fraction for beta function using Lentz's method */
function betaCF(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 3e-12;
  const fpMin = 1e-30;

  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    // Even step
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;

    // Odd step
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < eps) break;
  }

  return h;
}

/** Log-gamma function (Stirling's approximation with Lanczos coefficients) */
function lnGamma(z: number): number {
  const g = 7;
  const coef = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }

  z -= 1;
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Build the peer×metric data structures from raw rows.
 * Returns metric info, peer IDs, and the values matrix.
 */
function buildPeerMetricMatrix(rows: CorrelationPeerRow[]): {
  metrics: CorrelationMetric[];
  peerIds: string[];
  values: (number | null)[][];
} | null {
  // Collect unique metrics and their names
  const metricMap = new Map<string, string>(); // canonicalId -> canonicalName
  const peerSet = new Set<string>();

  for (const row of rows) {
    metricMap.set(row.canonicalId, row.canonicalName);
    peerSet.add(row.peerId);
  }

  // Build data map: peerId -> canonicalId -> value
  const dataMap = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!dataMap.has(row.peerId)) {
      dataMap.set(row.peerId, new Map());
    }
    dataMap.get(row.peerId)!.set(row.canonicalId, row.value);
  }

  const peerIds = Array.from(peerSet);
  const allMetricIds = Array.from(metricMap.keys());

  // Filter metrics: exclude those with fewer than MIN_DATA_POINTS non-null values
  const filteredMetrics: CorrelationMetric[] = [];
  for (const metricId of allMetricIds) {
    let count = 0;
    for (const peerId of peerIds) {
      if (dataMap.get(peerId)?.has(metricId)) {
        count++;
      }
    }
    if (count >= MIN_DATA_POINTS) {
      filteredMetrics.push({
        canonicalId: metricId,
        canonicalName: metricMap.get(metricId)!,
      });
    }
  }

  if (filteredMetrics.length < 2) {
    return null;
  }

  // Cap the number of metrics to bound O(M^2 * P) computation
  if (filteredMetrics.length > MAX_METRICS) {
    // Keep the metrics with the most data points (sort by coverage descending)
    const metricCoverage = filteredMetrics.map((metric) => {
      let count = 0;
      for (const peerId of peerIds) {
        if (dataMap.get(peerId)?.has(metric.canonicalId)) count++;
      }
      return { metric, count };
    });
    metricCoverage.sort((a, b) => b.count - a.count);
    filteredMetrics.length = 0;
    for (let i = 0; i < MAX_METRICS; i++) {
      filteredMetrics.push(metricCoverage[i].metric);
    }
  }

  // Build values matrix: metrics × peers (each column is a metric's values across peers)
  const values: (number | null)[][] = filteredMetrics.map((metric) =>
    peerIds.map((peerId) => dataMap.get(peerId)?.get(metric.canonicalId) ?? null)
  );

  return { metrics: filteredMetrics, peerIds, values };
}

export const correlationService = {
  /**
   * Compute pairwise Pearson correlation matrix across peer metrics.
   * Filters by statistical significance (p < 0.05).
   * Excludes metrics with fewer than 5 peer data points.
   */
  async computeCorrelations(
    tenantId: string,
    fiscalYear: string,
    sector?: string
  ): Promise<CorrelationResult> {
    const peerRows = await correlationRepository.getPeerMetrics(tenantId, fiscalYear, sector);

    const built = buildPeerMetricMatrix(peerRows);
    if (!built) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'Insufficient data for correlation analysis (need at least 2 metrics with 5+ peer data points)',
        422
      );
    }

    const { metrics, peerIds, values } = built;
    const metricCount = metrics.length;
    const peerCount = peerIds.length;

    logger.info('Correlation computation starting', {
      tenantId,
      fiscalYear,
      peerCount,
      metricsUsed: metricCount,
    });

    // Compute pairwise Pearson correlations
    const matrix: (number | null)[][] = Array.from({ length: metricCount }, () =>
      new Array(metricCount).fill(null)
    );

    for (let i = 0; i < metricCount; i++) {
      // Diagonal is always 1
      matrix[i][i] = 1;

      for (let j = i + 1; j < metricCount; j++) {
        // Extract paired values (both non-null)
        const xVals: number[] = [];
        const yVals: number[] = [];

        for (let p = 0; p < values[i].length; p++) {
          const xi = values[i][p];
          const yj = values[j][p];
          if (xi !== null && yj !== null) {
            xVals.push(xi);
            yVals.push(yj);
          }
        }

        // Need at least MIN_DATA_POINTS paired values
        if (xVals.length < MIN_DATA_POINTS) {
          matrix[i][j] = null;
          matrix[j][i] = null;
          continue;
        }

        const r = pearsonR(xVals, yVals);

        // Handle NaN (zero variance)
        if (isNaN(r)) {
          matrix[i][j] = null;
          matrix[j][i] = null;
          continue;
        }

        // Check statistical significance
        const pVal = pValueForR(r, xVals.length);
        if (pVal >= SIGNIFICANCE_LEVEL) {
          matrix[i][j] = null;
          matrix[j][i] = null;
          continue;
        }

        // Round to 4 decimal places
        const rounded = Math.round(r * 10000) / 10000;
        matrix[i][j] = rounded;
        matrix[j][i] = rounded;
      }
    }

    logger.info('Correlation computation complete', {
      tenantId,
      metricsUsed: metricCount,
      peerCount,
    });

    return {
      metrics,
      matrix,
      peerCount,
      metricsUsed: metricCount,
    };
  },
};
