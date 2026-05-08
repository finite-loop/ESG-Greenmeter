# Story 6.5: Multi-Dimensional Scaling (MDS) Positioning

Status: complete

## Story

As a C-suite executive,
I want a 2D competitive map showing my company vs all peers,
so that I can grasp overall ESG positioning at a glance.

## Acceptance Criteria

1. mdsService performs multi-dimensional scaling reducing N metrics to 2D coordinates
2. GET /api/benchmarks/mds returns coordinates for all companies in sector
3. Requires >= 4 peers with sufficient data
4. Scatter plot highlights current tenant distinctly
5. Recomputed when peer_metrics_unified MV refreshes

## Tasks / Subtasks

- [x] Task 1: Create mdsService (AC: #1, #3)
  - [x] Create /src/services/mdsService.ts
  - [x] Implement Classical MDS: compute distance matrix from normalized metric vectors
  - [x] Perform eigendecomposition and take top 2 dimensions
  - [x] Use ml-pca or ml-matrix for matrix operations (pure JS, no Python)
  - [x] Handle missing data: impute with sector median or exclude metric if >50% missing
  - [x] Validate >= 4 peers with sufficient data before computing
- [x] Task 2: Create API endpoint (AC: #2)
  - [x] Build /src/app/api/benchmarks/mds/route.ts
  - [x] Query peer_metrics_unified view filtered by sector
  - [x] Build matrix (companies x metrics) as input
  - [x] Return [{peerId, peerName, x, y, isCurrentTenant}]
- [x] Task 3: Create MdsScatterPlot component (AC: #4)
  - [x] Build /src/components/charts/MdsScatterPlot.tsx
  - [x] Use Chart.js scatter plot
  - [x] Highlight current tenant with distinct color/size
  - [x] Label peer points with company names
- [x] Task 4: Configure caching (AC: #5)
  - [x] Use TanStack Query with longer staleTime (MDS is expensive, data changes infrequently)
  - [x] Invalidate cache when peer_metrics_unified MV refreshes

### Review Findings

- [x] [Review][Defer] Hardcoded `fiscalYear: '2023-24'` in MdsSection — deferred, consistent with existing prototype pattern; will be wired when fiscal-year selector is built
- [x] [Review][Patch] `getTenantMetrics` missing fiscal year filter — fixed, added JOIN to reporting_periods with fiscal_year filter
- [x] [Review][Patch] Index mismatch: `peerIdList` from `Set` vs `coords` from `buildMatrix` ordering — fixed, now uses `built.peerIds` / `built.peerNames`
- [x] [Review][Patch] Chart.js async race condition — fixed, added `cancelled` staleness flag
- [x] [Review][Patch] Tenant could appear as both peer and "Your Company" — fixed, filter tenant from peer rows before matrix building
- [x] [Review][Patch] Single metric produces degenerate 1D MDS with all y=0 — fixed, require >= 2 metrics after filtering
- [x] [Review][Patch] Unused `isNotNull` import — fixed, removed during fiscal year filter patch
- [x] [Review][Patch] `fiscalYear` schema allows any non-empty string — fixed, added regex pattern `/^\d{4}(-\d{2})?$/`
- [x] [Review][Defer] No server-side rate limiting on CPU-intensive MDS endpoint — deferred, cross-cutting concern
- [x] [Review][Defer] Peer company names exposed to analyst role — deferred, business decision on anonymization
- [x] [Review][Defer] Unsafe `db.execute` result type cast chain — deferred, pre-existing pattern across codebase

## Dev Notes

- Service: /src/services/mdsService.ts
- Algorithm: Classical MDS — compute distance matrix from normalized metric vectors → eigendecomposition → take top 2 dimensions
- Library options: `ml-pca` or `ml-matrix` for matrix operations (pure JS, no Python)
- Input: peer_metrics_unified view filtered by sector — build matrix (companies x metrics)
- Handle missing data: impute with sector median or exclude metric if >50% missing
- API: /src/app/api/benchmarks/mds/route.ts — returns [{peerId, peerName, x, y, isCurrentTenant}]
- Component: /src/components/charts/MdsScatterPlot.tsx — Chart.js scatter plot
- Cache: TanStack Query with longer staleTime (MDS is expensive, data changes infrequently)

### Depends On
- Story 5.4 (peer_metrics_unified needs peer data)
- Story 6.1 (normalization logic)

### References
- [Source: product-brief.md — MDS competitive positioning]
- [Source: decisions-log.md#D14]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Implementation Plan
1. Created `mdsService.ts` with Classical MDS algorithm:
   - Builds company×metric matrix from peer KPI values and tenant values
   - Z-score normalizes each metric column for equal weighting
   - Computes Euclidean distance matrix
   - Double-centers the squared distance matrix
   - Eigendecomposes via ml-matrix's EigenvalueDecomposition
   - Projects to top 2 eigenvectors for 2D coordinates
   - Handles missing data via column-median imputation
   - Excludes metrics with >50% missing values
   - Validates minimum 4 peers before computing

2. Created `mdsRepository.ts` with SQL queries:
   - getPeerMetrics: joins peerKpiValues + peerOrganisations, filters by tenant/fiscal year/sector
   - getTenantMetrics: joins kpiValues + kpiParameters + canonicalMetrics for tenant's own data

3. Created `GET /api/benchmarks/mds` route with standard middleware chain (auth → tenant → role → handler)

4. Created `MdsScatterPlot.tsx` Chart.js scatter plot component with dynamic import

5. Created `useMds.ts` TanStack Query hook with 10-min staleTime / 30-min gcTime

6. Integrated MDS section into Analytics PeerTab via dynamic import

### Debug Log References
### Completion Notes List
- All 10 unit tests pass for mdsService (algorithm correctness, minimum peers validation, missing data handling, metric exclusion, coordinate rounding, clustering correctness)
- Full test suite: 1321 passed, 4 pre-existing failures (goalService/milestones — from story 7.2)
- No TypeScript errors in new files (34 pre-existing errors from other stories)
- Installed ml-matrix dependency for eigendecomposition

### File List
- greenmeter/src/services/mdsService.ts (new)
- greenmeter/src/services/mdsService.test.ts (new)
- greenmeter/src/db/repositories/mdsRepository.ts (new)
- greenmeter/src/schemas/mds.ts (new)
- greenmeter/src/app/api/benchmarks/mds/route.ts (new)
- greenmeter/src/components/charts/MdsScatterPlot.tsx (new)
- greenmeter/src/hooks/useMds.ts (new)
- greenmeter/src/lib/queryKeys.ts (modified — added mds key)
- greenmeter/src/app/screens/Analytics.tsx (modified — added MDS section to PeerTab)
- greenmeter/package.json (modified — ml-matrix dependency added)
- greenmeter/package-lock.json (modified — ml-matrix + transitive deps)

## Change Log
- 2026-05-07: Implemented Classical MDS service with ml-matrix eigendecomposition, API endpoint, scatter plot component, TanStack Query caching, and Analytics page integration

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all tests passing (10/10 new, 1321/1325 full suite with 4 pre-existing failures)
- 2026-05-07: Status changed to `review` — code review passed, all 7 patch findings applied and verified
- 2026-05-07: Status changed to `complete` — human review approved
