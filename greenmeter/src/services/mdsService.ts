import { Matrix, EigenvalueDecomposition } from 'ml-matrix';
import { mdsRepository, type PeerMetricRow } from '@/db/repositories/mdsRepository';
import { logger } from '@/lib/logger';
import { AppError, ErrorCode } from '@/lib/errors';

/** Minimum number of peers required for meaningful MDS positioning */
const MIN_PEERS = 4;

/** Maximum proportion of missing values allowed per metric before exclusion */
const MAX_MISSING_RATIO = 0.5;

/** MDS coordinate for a single company */
export interface MdsPoint {
  peerId: string;
  peerName: string;
  x: number;
  y: number;
  isCurrentTenant: boolean;
}

/** Result of MDS computation */
export interface MdsResult {
  points: MdsPoint[];
  metricsUsed: number;
  peerCount: number;
}

/**
 * Build a company×metric matrix from raw peer metric rows.
 * Returns the matrix, ordered peer list, and ordered metric list.
 * Imputes missing values with column (metric) median.
 * Excludes metrics where >50% of companies have missing data.
 */
function buildMatrix(
  rows: PeerMetricRow[],
  tenantValues: { canonicalId: string; value: number }[]
): {
  matrix: number[][];
  peerIds: string[];
  peerNames: string[];
  metricIds: string[];
  tenantIndex: number;
} | null {
  // Collect unique peers and metrics
  const peerMap = new Map<string, string>(); // peerId -> peerName
  const metricSet = new Set<string>();

  for (const row of rows) {
    peerMap.set(row.peerId, row.peerName);
    metricSet.add(row.canonicalId);
  }

  // Add tenant metrics
  for (const tv of tenantValues) {
    metricSet.add(tv.canonicalId);
  }

  const peerIds = Array.from(peerMap.keys());
  const peerNames = Array.from(peerMap.values());
  const allMetricIds = Array.from(metricSet);

  // Build raw data map: peerId -> { canonicalId -> value }
  const dataMap = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!dataMap.has(row.peerId)) {
      dataMap.set(row.peerId, new Map());
    }
    dataMap.get(row.peerId)!.set(row.canonicalId, row.value);
  }

  // Build tenant data map (tenant is at index = peerIds.length, added after peers)
  const tenantData = new Map<string, number>();
  for (const tv of tenantValues) {
    tenantData.set(tv.canonicalId, tv.value);
  }

  // Total company count = peers + tenant
  const companyCount = peerIds.length + 1;
  const tenantIndex = peerIds.length; // tenant is last row

  // Filter metrics: exclude those with >50% missing values
  const filteredMetricIds: string[] = [];
  for (const metricId of allMetricIds) {
    let presentCount = 0;

    for (const peerId of peerIds) {
      if (dataMap.get(peerId)?.has(metricId)) {
        presentCount++;
      }
    }
    // Check tenant too
    if (tenantData.has(metricId)) {
      presentCount++;
    }

    const missingRatio = 1 - presentCount / companyCount;
    if (missingRatio <= MAX_MISSING_RATIO) {
      filteredMetricIds.push(metricId);
    }
  }

  if (filteredMetricIds.length < 2) {
    return null;
  }

  // Build raw matrix (companies × metrics) with NaN for missing
  const rawMatrix: number[][] = [];

  for (const peerId of peerIds) {
    const row: number[] = [];
    for (const metricId of filteredMetricIds) {
      const val = dataMap.get(peerId)?.get(metricId);
      row.push(val ?? NaN);
    }
    rawMatrix.push(row);
  }

  // Add tenant row
  const tenantRow: number[] = [];
  for (const metricId of filteredMetricIds) {
    const val = tenantData.get(metricId);
    tenantRow.push(val ?? NaN);
  }
  rawMatrix.push(tenantRow);

  // Impute missing values with column median
  for (let col = 0; col < filteredMetricIds.length; col++) {
    const values: number[] = [];
    for (let row = 0; row < companyCount; row++) {
      if (!isNaN(rawMatrix[row][col])) {
        values.push(rawMatrix[row][col]);
      }
    }

    if (values.length === 0) continue;

    values.sort((a, b) => a - b);
    const median =
      values.length % 2 === 0
        ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
        : values[Math.floor(values.length / 2)];

    for (let row = 0; row < companyCount; row++) {
      if (isNaN(rawMatrix[row][col])) {
        rawMatrix[row][col] = median;
      }
    }
  }

  // Z-score normalize each column (metric) for equal weighting
  for (let col = 0; col < filteredMetricIds.length; col++) {
    let sum = 0;
    for (let row = 0; row < companyCount; row++) {
      sum += rawMatrix[row][col];
    }
    const mean = sum / companyCount;

    let sqSum = 0;
    for (let row = 0; row < companyCount; row++) {
      sqSum += (rawMatrix[row][col] - mean) ** 2;
    }
    const std = Math.sqrt(sqSum / companyCount);

    if (std > 0) {
      for (let row = 0; row < companyCount; row++) {
        rawMatrix[row][col] = (rawMatrix[row][col] - mean) / std;
      }
    } else {
      // Zero variance: set all to 0
      for (let row = 0; row < companyCount; row++) {
        rawMatrix[row][col] = 0;
      }
    }
  }

  return {
    matrix: rawMatrix,
    peerIds: [...peerIds, 'tenant'],
    peerNames: [...peerNames, 'tenant'],
    metricIds: filteredMetricIds,
    tenantIndex,
  };
}

/**
 * Compute Euclidean distance matrix from a data matrix.
 * Returns an n×n symmetric matrix of pairwise distances.
 */
function computeDistanceMatrix(data: number[][]): number[][] {
  const n = data.length;
  const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sumSq = 0;
      for (let k = 0; k < data[0].length; k++) {
        sumSq += (data[i][k] - data[j][k]) ** 2;
      }
      const d = Math.sqrt(sumSq);
      dist[i][j] = d;
      dist[j][i] = d;
    }
  }

  return dist;
}

/**
 * Classical (metric) MDS algorithm.
 *
 * 1. Compute squared distance matrix D²
 * 2. Double-center: B = -½ J D² J, where J = I - (1/n)11ᵀ
 * 3. Eigendecompose B
 * 4. Take top 2 eigenvalues/vectors → 2D coordinates
 */
function classicalMds(distMatrix: number[][]): { x: number[]; y: number[] } {
  const n = distMatrix.length;

  // Step 1: Squared distances
  const dSq: number[][] = distMatrix.map((row) =>
    row.map((d) => d * d)
  );

  // Step 2: Double-centering
  // B = -0.5 * H * D² * H, where H = I - (1/n)*ones
  const rowMeans = new Array(n).fill(0);
  const colMeans = new Array(n).fill(0);
  let grandMean = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rowMeans[i] += dSq[i][j];
      colMeans[j] += dSq[i][j];
      grandMean += dSq[i][j];
    }
  }

  for (let i = 0; i < n; i++) {
    rowMeans[i] /= n;
    colMeans[i] /= n;
  }
  grandMean /= n * n;

  const B: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      B[i][j] = -0.5 * (dSq[i][j] - rowMeans[i] - colMeans[j] + grandMean);
    }
  }

  // Step 3: Eigendecomposition
  const bMatrix = new Matrix(B);
  const evd = new EigenvalueDecomposition(bMatrix);
  const eigenvalues = evd.realEigenvalues;
  const eigenvectors = evd.eigenvectorMatrix;

  // Step 4: Sort eigenvalues descending and take top 2
  const indexed = eigenvalues.map((val, idx) => ({ val, idx }));
  indexed.sort((a, b) => b.val - a.val);

  const top2 = indexed.slice(0, 2);
  const x: number[] = new Array(n);
  const y: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const ev0 = Math.max(top2[0].val, 0);
    const ev1 = Math.max(top2[1].val, 0);
    x[i] = eigenvectors.get(i, top2[0].idx) * Math.sqrt(ev0);
    y[i] = eigenvectors.get(i, top2[1].idx) * Math.sqrt(ev1);
  }

  return { x, y };
}

export const mdsService = {
  /**
   * Compute MDS positioning for the tenant and its peers.
   * Reduces multi-dimensional metric space to 2D coordinates.
   */
  async computeMds(
    tenantId: string,
    fiscalYear: string,
    sector?: string
  ): Promise<MdsResult> {
    // Fetch peer metric data
    const [peerRows, tenantValues] = await Promise.all([
      mdsRepository.getPeerMetrics(tenantId, fiscalYear, sector),
      mdsRepository.getTenantMetrics(tenantId, fiscalYear),
    ]);

    // Filter out tenant from peer rows to prevent duplicate appearance
    const filteredPeerRows = peerRows.filter((r) => r.peerId !== tenantId);

    // Count unique peers
    const uniquePeers = new Set(filteredPeerRows.map((r) => r.peerId));
    if (uniquePeers.size < MIN_PEERS) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Insufficient peer data: found ${uniquePeers.size} peers, need at least ${MIN_PEERS}`,
        422,
        { peers: [`Minimum ${MIN_PEERS} peers required, found ${uniquePeers.size}`] }
      );
    }

    // Build matrix
    const built = buildMatrix(filteredPeerRows, tenantValues);
    if (!built) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'Insufficient metrics for 2D positioning (need at least 2 after filtering)',
        422
      );
    }

    const { matrix, peerIds: orderedPeerIds, peerNames: orderedPeerNames, tenantIndex, metricIds } = built;

    logger.info('MDS computation starting', {
      tenantId,
      fiscalYear,
      peerCount: uniquePeers.size,
      metricsUsed: metricIds.length,
      matrixSize: `${matrix.length}x${metricIds.length}`,
    });

    // Compute distance matrix and run MDS
    const distMatrix = computeDistanceMatrix(matrix);
    const coords = classicalMds(distMatrix);

    // Assemble result points using the same ordering as buildMatrix
    const points: MdsPoint[] = [];

    for (let i = 0; i < tenantIndex; i++) {
      points.push({
        peerId: orderedPeerIds[i],
        peerName: orderedPeerNames[i],
        x: Math.round(coords.x[i] * 1000) / 1000,
        y: Math.round(coords.y[i] * 1000) / 1000,
        isCurrentTenant: false,
      });
    }

    // Add tenant point
    points.push({
      peerId: tenantId,
      peerName: 'Your Company',
      x: Math.round(coords.x[tenantIndex] * 1000) / 1000,
      y: Math.round(coords.y[tenantIndex] * 1000) / 1000,
      isCurrentTenant: true,
    });

    logger.info('MDS computation complete', {
      tenantId,
      pointCount: points.length,
      metricsUsed: metricIds.length,
    });

    return {
      points,
      metricsUsed: metricIds.length,
      peerCount: uniquePeers.size,
    };
  },
};
