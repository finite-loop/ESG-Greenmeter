# Deferred Work

## Deferred from: code review of story-1.4-middleware-chain (2026-05-05)

- RLS tenant context race condition — `set_config` is transaction-scoped but no transaction boundary enforced in `db/index.ts`. Requires architectural decision on whether all handler queries must run within an explicit transaction. Related to Story 1.2.
- No "own department" scoping in role guard — the flat allow/deny middleware cannot enforce department-level data isolation. Must be implemented at service/repository layer with per-query tenant+department filtering. Will be needed by Stories 4.x (KPI operations).
- No read-only vs full-access distinction per role at middleware level — architecture matrix shows Analyst=read-only for Settings, Viewer=read-only for Goals. Current approach requires separate roles arrays per HTTP method. Not a bug, but a developer discipline requirement.
- `audit.ts` imports `db` at module level — will crash the process if DATABASE_URL is missing at import time (same issue as auth.ts before lazy import fix). Should migrate to lazy import pattern.
- No request timeout/abort signal in the middleware handler chain — relies on platform-level timeouts (Azure App Service, Next.js server). Consider adding AbortSignal if long-running handlers become an issue.
- AC #3 audit opt-in pattern — current middleware only logs writes when handler returns `_audit`. Story 1.5 (Audit Logging Service) should decide whether to enforce automatic minimal logging for all writes or accept opt-in with entity enrichment.

## Deferred from: code review of story-1.7-external-service-clients (2026-05-05)

- Clients read `process.env` directly instead of validated `getEnv()` — all three service modules (blobStorage, documentIntelligence, llm) bypass the centralized Zod-validated env schema. Should refactor to use `getEnv()` as single source of truth when env validation is revisited (Story 1.8 scope).
- Singleton clients never invalidated on credential rotation — module-level cached clients in blobStorage.ts, documentIntelligence.ts, and llm.ts will use stale credentials if keys are rotated at runtime. Acceptable for now; document as ops constraint or add TTL-based refresh when operational monitoring is in place.
- No upload size limit in blobStorage.ts — the `upload` function accepts any buffer size. Should add max size validation when the upload API route is built (Story 5.2).

## Deferred from: code review of story-1.8-structured-logging (2026-05-05)

- POST always returns 201, DELETE always 204 — `handler.ts:117` hardcodes status by HTTP method. Non-creation POSTs (search, RPC) and DELETEs that return data get wrong status codes. Pre-existing handler behavior.
- `_audit` deleted via mutation on handler result — `handler.ts:112-114` mutates the handler's returned object. If handler retains a reference, the `_audit` field is silently removed. Pre-existing audit system behavior.
- Array handler results serialized as objects — `handler.ts:94-95` wraps non-null objects but arrays (typeof 'object') get numeric-key serialization instead of JSON arrays. Pre-existing type-checking gap.
- `getEnv()` at module scope kills build without DATABASE_URL — Known project issue (MEMORY.md). Any module calling `getEnv()` at top level during `next build` will fail.
- Env cache never invalidates on secrets rotation — `env.ts:36` caches after first parse. By-design for serverless; secrets rotation requires process restart.

## Deferred from: code review of story-2.2-layout-components (2026-05-05)

- TopBar not wired with real user/tenant data or sign-out — Layout renders `<TopBar />` with no props, showing defaults. Auth session wiring belongs to Story 3.1 (Login + OAuth).
- rollupLevel state not shared with child pages — `rollupLevel` lives in layout `useState` but is not exposed via context/URL/store. Story 2.4 (State Management) should handle this.
- Dashboard layout is entirely client-rendered — `"use client"` on the layout prevents SSR. Can be refactored once state management (Story 2.4) provides a better mechanism.
- RollupBar container missing ARIA navigation role — No `role="navigation"` or `aria-label` on the breadcrumb-like container. Accessibility improvement for a future pass.
- Rollup levels hardcoded instead of tenant-specific — `ROLLUP_LEVELS` is static. Multi-tenancy requires dynamic hierarchy. Will be addressed in Story 4.6 (Org Hierarchy Management).

## Deferred from: code review of story-10.3-system-health (2026-05-05)

- findJobs returns unbounded results from DB before slice — pg-boss `findJobs()` API has no `limit` parameter; current `.slice(0, 500)` bounds in-memory processing but the DB query is unbounded. Requires raw SQL query or upstream pg-boss feature to truly limit.
- completedLast24h counts unreliable when >500 jobs exist — 24h completed/failed counts are derived from at most 500 jobs, so may undercount in high-volume queues. Requires SQL aggregate query for accurate counts.
- No client-side admin guard on health page — Server enforces admin access via `withApiHandler({ roles: ['admin'] })`, but non-admin users can navigate to `/settings/health` and see a 403 error. Add client-side role check when settings layout with role-based nav is implemented.
- Storage usage only checks connectivity, not actual usage — AC mentions "storage usage" but Azure Blob Storage lacks an efficient per-container usage API. Current check verifies container exists. Actual usage metrics would require listing all blobs.
- getBoss() singleton race condition — If `getBoss()` is called concurrently, it might create multiple pg-boss instances. Pre-existing in `pgBoss.ts`, not introduced by this story.
- No route-level or timeout tests — No integration tests for API routes and no tests verifying `withTimeout()` behavior. Requires more test infrastructure setup.

## Deferred from: code review of story-4.1-parameter-seed-pipeline (2026-05-06)

- console.log usage in seed scripts — Architecture says "No console.log, use structured logger." Seed scripts are CLI tools, not API routes, so console.log is reasonable. Defer to when/if structured CLI logging is adopted.
- No audit logging for seed operations — Architecture requires audit on every write, but seed scripts run outside the API middleware chain. Defer to when seed ops need audit trail.
- Default direction misclassification — `inferDirection` defaults to `lower_is_better` for ambiguous metrics like "Total plants / offices". Some neutral metrics would be better classified as `neutral`. Requires domain expert review of all 223 parameters.
- standardCode NULL for BRSR/ESRS — BRSR and ESRS parameters have `standardCode: null` while GRI parameters populate it from the "GRI Code" column. If BRSR/ESRS Excel files add code columns later, parsing logic should be updated.

## Deferred from: code review of story-5.1-peer-organisation-management (2026-05-06)

- Hardcoded sectors in frontend — SECTORS array in page.tsx is not shared with backend validation. Sector values are freeform in the schema which allows flexibility, but frontend/backend drift is possible. Requires product decision on whether sectors should be enforced server-side. [page.tsx:24-36]
- Empty update payload succeeds — sending `PUT /api/peers/{id}` with `{}` body bumps `updatedAt` without changing data. Not harmful but semantically misleading. Cosmetic, no data integrity risk. [peerService.ts:58-66]
- Hardcoded path segment index in extractPeerId — uses `segments[3]` which is fragile if routes are mounted under different base paths. Next.js App Router should provide params but current pattern works. Pre-existing pattern concern. [[peerId]/route.ts:11]

## Deferred from: code review of story-3.4-user-management (2026-05-06)

- **#10** API response exposes `tenantId` to client — `UserRow` includes `tenantId` in all API responses. Pre-existing pattern (peers repository does the same). Should add a response DTO that strips internal fields.
- **#11** Edit modal always sends unchanged fields → noisy audit log entries — Frontend sends all form fields even if unchanged, creating audit entries for no-op updates. Should diff form state before submitting.
- **#12** `updatedAt` set by application code not DB trigger — Manual `new Date()` in repository update. Pre-existing pattern across all repositories. A database trigger would be more reliable.
- **#13** DB `role` column is `text` not PostgreSQL enum — No CHECK constraint enforces valid roles at the database level. Pre-existing schema design decision.
- **#21** Page-level 403 is client-side only — Non-admin users can navigate to /settings/users, see a brief UI flash, then get the "Access restricted" message. Server-side layout guard would prevent this.

## Deferred from: code review of story-5.2 (2026-05-06)

- Full file buffered in memory — entire uploaded file read into memory via formData() before uploading to blob. Mitigated by 50MB cap; standard Next.js multipart pattern. Consider streaming when infrastructure supports it. [documentService.ts:17]
- Fake progress bar — upload progress jumps 0→10→80→100 rather than tracking real upload progress. fetch() API doesn't support upload progress natively; would require XMLHttpRequest or tus protocol. [DocumentUpload.tsx:48-58]
- No pagination UI controls — documents page hardcodes pageSize=50 with no next/prev buttons. AC#5 only requires showing status list, not pagination. Add when document volume justifies it. [page.tsx:71]
- Internal fields exposed in API response — blobPath, tenantId, uploadedBy, contentType, jobId returned from GET /api/extraction but unused by client. Not a vulnerability (user is authenticated and authorized) but unnecessary data over the wire. Should add response DTO projection. [route.ts:27-30]

## Deferred from: code review of story-5.3-extraction-pipeline (2026-05-06)

- Unbounded OCR text sent to LLM — full document text passed to LLM with no truncation or chunking for very large documents (100+ page ESG reports). Could exceed context window limits. Separate feature — consider chunked extraction with page-range prompts.
- European locale number parsing — parseNumericValue does not handle period-as-thousands-separator (e.g. "1.000.000,50" common in EU reports). Would require locale-aware parsing with ambiguity detection. Out of scope for current story.

## Deferred from: code review of story-4.6-org-hierarchy-management (2026-05-06)

- TOCTOU race on reparent circular-reference check — findDescendantIds, validation, and update are non-transactional. Concurrent reparent operations could introduce cycles. Requires serializable transaction with row-level locking. Pre-existing infra gap.
- TOCTOU race on delete safety checks — hasChildren/hasKpiValues checks and delete are non-transactional. Concurrent requests could add children between check and delete. Partially mitigated if FK constraints exist. Pre-existing infra gap.
- Recursive CTE has no depth/cycle guard — WITH RECURSIVE in findDescendantIds has no depth limit. PostgreSQL has built-in recursion limits but could consume resources on corrupted data. Add CYCLE detection (PostgreSQL 14+) when transactional infra is added.
- currency field lacks ISO 4217 validation — accepts any string up to 10 chars. Should validate against ISO 4217 codes. Enhancement.
- code field lacks format/uniqueness validation — accepts any string up to 50 chars with no uniqueness constraint. Should add tenant-scoped unique constraint if codes serve as business identifiers. Enhancement.
- No sibling name uniqueness check — no unique constraint on (tenant_id, parent_node_id, name). Duplicate sibling names are silently accepted. Enhancement.
- No pagination on findAllByTenant — returns all nodes for tenant with no limit. Bounded by practical org hierarchy sizes but should add pagination for large tenants. Enhancement.
- nodeType hierarchy consistency not enforced — no validation prevents illogical nesting (e.g., site as parent of company). Business rule not in current spec. Enhancement.

## Deferred from: code review of story-4.3-kpi-console-crud (2026-05-06)

- TOCTOU race in kpiRepository.update() — read-then-update pattern captures old value for audit but is not atomic. Under concurrent writes, the old value snapshot could be stale. Low risk given auth middleware and single-user-per-session semantics. Standard pattern for audit logging across the codebase. [kpiRepository.ts:176-209]

## Deferred from: code review of story-9.1-supplier-management (2026-05-06)

- TOCTOU race in supplierRepository.upsertAssessment — read-then-insert/update pattern instead of DB-level ON CONFLICT. Concurrent requests for same supplier+fiscalYear could create duplicates. Needs proper ON CONFLICT DO UPDATE clause. Pre-existing read-then-write pattern. [supplierRepository.ts]
- No search debouncing on supplier list — every keystroke triggers an API request. Should add 300ms debounce on search input. UX enhancement. [SupplyChain.tsx:187-190]
- No DELETE endpoint for suppliers — soft delete via active=false requires using the update endpoint. No dedicated DELETE route exists. Not in acceptance criteria; enhancement. [API routes]
- No optimistic locking on concurrent supplier updates — concurrent updates silently overwrite. Pre-existing pattern across all repositories. [supplierRepository.ts]
- highRiskCount stat computed from current page only — summary strip counts high/critical risk suppliers only from the current page of results, not from total dataset. Needs separate aggregation API or server-side count. [SupplyChain.tsx:100-102]

## Deferred from: code review of story-6.1-scoring-engine (2026-05-07)

- Threshold/weight queries use OR tenant_id IS NULL which may conflict with RLS policies — scoringRepository queries for thresholds and weights include `OR tenant_id IS NULL` to fall back to platform defaults, but strict RLS policies would block rows with NULL tenant_id. Platform defaults may be invisible, causing silent fallback to hardcoded defaults in service code. Pre-existing RLS policy design from earlier stories. [scoringRepository.ts:91-92, 109-110]
- MV stores all-tenant data; PostgreSQL RLS cannot apply to materialized views — esg_scores MV aggregates data across ALL tenants into a single structure. PostgreSQL does not apply RLS to materialized views. Mitigated by explicit tenant_id WHERE clause in repository getScores() query. Architectural constraint of PostgreSQL MVs, not a code defect. [0001_esg_scores_materialized_view.sql, scoringRepository.ts:127-147]

## Deferred from: code review of story-6.2-threshold-weight-config (2026-05-07)

- RLS potential bypass via `OR tenantId IS NULL` for platform defaults — configRepository queries include `OR tenant_id IS NULL` to merge platform defaults with tenant overrides. Strict RLS policies would block NULL tenant_id rows. Pre-existing pattern from scoringRepository (story 6.1), not introduced by this story. [configRepository.ts]

## Deferred from: code review of story-7.2-milestone-tracking (2026-05-07)

- Race condition in `checkMilestonesForParam` — concurrent KPI value writes could trigger duplicate milestone achievement checks, potentially double-marking milestones as achieved. Pre-existing architectural concern: read-then-write pattern without transactional isolation is used across the codebase. [goalService.ts]

## Deferred from: code review of story-8.1-report-template-engine (2026-05-07)

- No duplicate submission guard for same framework+period+tenant — every POST to /api/reports/generate creates a new report record and job unconditionally. Rapid clicks or retries create redundant jobs and DB records. Should add singletonKey to submitJob or check for existing pending/generating reports. [route.ts, reportRepository.ts]
- No polling/refetch for in-progress report status in UI — after generate mutation succeeds, query invalidates once but has no refetchInterval. Report status never updates from "Pending" to "Complete" without manual refresh. UX enhancement for future story. [Reports.tsx]
- Race condition on template creation (no unique constraint) — concurrent requests for the same framework both see null from findTemplateByStandard and both create duplicate platform-level template records. Needs unique constraint on (standard, tenant_id) or INSERT ON CONFLICT. [route.ts:76-93, report_templates schema]
- No optimistic locking on report status transitions — job handler updates status from pending→generating→complete without WHERE status='expected'. Duplicate jobs can overwrite each other's metadata. Requires broader job infrastructure changes. [reportGeneration.ts]

## Deferred from: code review of story-6.4-radar-chart (2026-05-07, 3-layer adversarial review)

- PeerTab bar chart uses hardcoded data and hardcoded fiscalYear "2023-24" — pre-existing pattern across analytics components. [Analytics.tsx:83-101]
- Duplicate fetchJson utility — identical fetchJson<T> helper defined in both useBenchmarks.ts and usePeers.ts. Pre-existing pattern across hooks; should extract to shared lib/fetchJson.ts.
- `any` type violations in Analytics.tsx — PeerTab uses `let c1:any` and Props type uses `[k:string]:any`. Pre-existing code style violating architecture rule. [Analytics.tsx:11,83]
- PeerTab chart has no cancelled guard for unmount race — async Chart.js import has no cancellation flag unlike RadarChart.tsx. Pre-existing code. [Analytics.tsx:82-90]
- selectAll truncates at 100 peers due to pageSize limit — usePeers called with pageSize:100, no pagination UI. Enhancement for future story. [PeerSelector.tsx:55]
- Analytics tab bar inaccessible to keyboard — tab divs have onClick but no tabIndex, role=tab, or keyboard handlers. Pre-existing component. [Analytics.tsx:62-66]
- computeCorrelationStats crashes on undefined matrix row — CorrelationTab function accesses matrix[i].length without null check. Not in scope of story 6.4. [Analytics.tsx:298-316]

## Deferred from: code review of story-7.3-forecasting (2026-05-07)

- Thin ForecastChart component tests — only 2 smoke tests (module export + compile check). No rendering tests for chart canvas, insufficient data placeholder, or props handling. Matches existing RadarChart test pattern; Chart.js canvas testing requires heavy mocking infrastructure. [ForecastChart.test.ts]

## Deferred from: code review of story-9.4-ai-recommendations (2026-05-07, 3-layer adversarial review)

- LLM prompt injection via metric names — metric names from kpi_parameters.name are interpolated into LLM prompts without sanitization. LLM has no tool-use capability so impact is limited to recommendation text quality, not system compromise. Pre-existing concern across LLM integration layer.
- Concurrent cron + manual job can cause duplicate/missing recommendations — if a manual job runs while the nightly cron is active, both delete and re-insert for the same tenant. Requires broader pg-boss job-design decision on singletonKey usage for the llm-recommendations queue.
- Inverted thresholds (redMax > amberMax) not validated — if thresholds are misconfigured with redMax > amberMax, the isInPoorBand and determinePriority logic produces incorrect results. Threshold validation belongs in threshold creation/update flow, not consumption.
- No audit logging for recommendation write operations in nightly job — architecture mandates audit on every write, but background job audit pattern not yet established project-wide. withApiHandler handles audit for API routes; background jobs need a different approach.
- No rate limiting on LLM calls per tenant — generateLlmRecommendations makes up to 5 sequential LLM calls per tenant with no throttling. Should be implemented in the createLlmClient abstraction layer or as a wrapper in the service.

## Deferred from: code review of story-8.3-pdf-generation (2026-05-07)

- `extractUuidParam` uses hardcoded segment index — fragile to base path changes. Pre-existing project-wide pattern used in all dynamic API routes. [download/route.ts:17]
- Large PDF buffer held entirely in memory — `generatePdfFromReport` collects entire PDF in memory before blob upload. Should stream to blob for large enterprise reports. Not a blocker at current scale. [pdfGenerator.ts:42-77]
- Report status can get stuck as 'generating' if process crashes — no stale-report cleanup mechanism. pg-boss retry handles job re-execution but report record stays in 'generating'. Needs periodic sweep or timeout-based reset. [reportGeneration.ts:46-48]
- `reportProgress()` does not persist progress data — `pgBoss.ts` `resume()` ignores the progress parameter entirely. Progress stages are emitted but never queryable. Pre-existing in pgBoss.ts. [pgBoss.ts:91]
- No deduplication guard for concurrent report generation — same framework+period+format can produce duplicate report records and jobs. Related to prior deferred item from story 8.1. [Reports.tsx, reportGeneration.ts]

## Deferred from: code review of story-8.2-coverage-tracking (2026-05-07)

- Inconsistent coverage formula between renderReport and getCoverage — renderReport uses `totalReported / grandTotal * 100` (N/A not in numerator) while getCoverage uses `(hasValue + notApplicable) / totalParams * 100` (N/A in numerator). Pre-existing in Story 8.1's renderReport. Same data produces different percentages. [reportService.ts:265 vs 357]
- NULL notApplicable edge case — kpi_values.notApplicable has `.default(false)` but no NOT NULL constraint. If explicitly set to NULL, the row falls through both hasValue and notApplicable CASE expressions, appearing as a gap. Pre-existing schema design. [kpi.ts:59]
- findRootNode has no deterministic ordering — `.limit(1)` without `orderBy` returns arbitrary node if multiple level-0 company nodes exist. Pre-existing method from Story 8.1. [reportRepository.ts:294-311]
- Coverage query does not filter by parameter status — inactive/draft parameters are counted in totalParams, dragging down coverage percentage. Other parameter queries (findAllForMatching) exclude inactive. Design choice not specified in story. [reportRepository.ts:341-345]
- No materialized view for coverage_summary (AC #3) — implementation uses live query with GROUP BY instead of PostgreSQL materialized view. Functionally equivalent but not pre-computed. MV can be introduced when performance profiling indicates need. [reportRepository.ts:318-370]
