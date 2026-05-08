# Story 4.4: KPI Verification Workflow

Status: complete

## Story

As a department manager,
I want to verify or mark KPI values as not-applicable,
so that data is quality-controlled before reporting.

## Acceptance Criteria

1. "Verify" button on unverified values sets verified=true, verified_by, verified_at
2. "Not Applicable" option sets not_applicable=true, excludes from coverage
3. POST /api/kpi/verify accepts array of valueIds for batch verification
4. Verified values show green badge with verifier name and timestamp
5. Only Admin, Analyst, or owning Department can verify
6. All verification actions audit logged

## Tasks / Subtasks

- [x] Add verify endpoint (AC: #1, #3, #5, #6)
  - [x] Create `/src/app/api/kpi/verify/route.ts` — POST { valueIds: string[] }
  - [x] Add `verifyValues(valueIds, userId)` to kpiService
  - [x] Validate all valueIds belong to current tenant
  - [x] Execute updates in a database transaction
  - [x] Check permission: Admin, Analyst, or owning Department role
  - [x] Create separate audit entry for each verified value (action='VERIFY')
- [x] Add not-applicable endpoint (AC: #2, #6)
  - [x] Add `markNotApplicable(valueIds, userId)` to kpiService
  - [x] Set not_applicable=true and exclude from coverage calculations
  - [x] Audit log the action
- [x] Update KPI table to show verify button (AC: #1, #4)
  - [x] Add "Verify" button on unverified values in KpiTable
  - [x] Add "Not Applicable" option in row action menu
  - [x] Support multi-select for batch verification
- [x] Create VerificationBadge component (AC: #4)
  - [x] Build `/src/components/console/VerificationBadge.tsx`
  - [x] Display verified_by name + verified_at date
  - [x] Show green badge styling for verified state

### Senior Developer Review (AI)

Review Date: 2026-05-07
Review Outcome: Changes Requested → All Findings Addressed
Reviewers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (parallel)
Total Findings: 13 actionable, 6 dismissed

#### Action Items

- [x] [Review][Decision] #1 TOCTOU: SELECT and UPDATE not in transaction — Fixed: wrapped batchVerify/batchMarkNotApplicable in db.transaction(), validate count before UPDATE
- [x] [Review][Decision] #2 Department role scope not enforced — Fixed: added checkDepartmentScope() in kpiRepository, department scope check in verifyValues/markNotApplicable service methods
- [x] [Review][Decision] #5 VerificationBadge shows raw UUID instead of verifier name — Fixed: added LEFT JOIN to users table in findByFilters, propagated verifiedByName through stack
- [x] [Review][Patch] #3 No upper bound on valueIds array — Fixed: added .max(100) to both batch schemas
- [x] [Review][Patch] #4 Duplicate valueIds cause false 404 — Fixed: deduplicate with [...new Set(valueIds)] in service
- [x] [Review][Patch] #6 Missing oldValue in verify audit log — Fixed: service returns oldValues, route maps them for audit oldValue field
- [x] [Review][Patch] #7 Re-verification overwrites original verifier — Fixed: added WHERE verified=false guard in batchVerify
- [x] [Review][Patch] #8 markNotApplicable on verified value creates contradictory state — Fixed: clears verified/verifiedBy/verifiedAt when marking N/A
- [x] [Review][Patch] #9 Frontend clears selection before server confirms — Fixed: removed immediate clear, added useEffect to prune stale selections on data refresh
- [x] [Review][Patch] #11 computeRagStatus doesn't distinguish N/A values — Fixed: added 'grey' RAG status for notApplicable values
- [x] [Review][Patch] #12 N/A audit uses generic 'UPDATE' action — Fixed: changed to 'MARK_NA' action type (added to LogChangeParams)
- [x] [Review][Patch] #19 markNotApplicable doesn't pass userId through — Fixed: added userId parameter to service + route passes ctx.userId
- [x] [Review][Defer] #10 N/A mark does not trigger score recompute — deferred, depends on Story 6.1 scoring engine

### Review Follow-ups (AI)

_Findings from Senior Developer Review that require implementation changes._

## Dev Notes

- API: `/src/app/api/kpi/verify/route.ts` — POST { valueIds: string[] }
- Service: add `verifyValues(valueIds, userId)` to kpiService
- VerificationBadge: `/src/components/console/VerificationBadge.tsx` — shows verified_by name + date
- Permission: Department role can only verify values where param.depts includes their department
- Batch verify: validate all valueIds belong to current tenant, then update in transaction
- Audit: each value verification is a separate audit entry (action='VERIFY')

### Depends On
- Story 4.3 (KPI values must exist to verify)

### References
- [Source: product-brief.md#Solution — verification workflow with RAG status]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Implemented batch verify endpoint (POST /api/kpi/verify) with per-value audit logging using action='VERIFY'
- Implemented mark-not-applicable endpoint (PUT /api/kpi/verify) with per-value audit logging using action='MARK_NA'
- Added Zod validation schemas (kpiBatchVerifySchema, kpiBatchMarkNotApplicableSchema) with UUID array validation + max(100)
- Added repository methods (batchVerify, batchMarkNotApplicable) in db.transaction() with validate-before-update
- Added checkDepartmentScope() repository method for department-role authorization
- Added service layer methods (verifyValues, markNotApplicable) with tenant ownership validation, department scope check, deduplication
- Service returns oldValues + updated for audit trail (oldValue field populated in audit logs)
- Created VerificationBadge component with tooltip showing verifier name (resolved via LEFT JOIN to users table) and timestamp
- Updated KpiTable with verify button, not-applicable button, multi-select checkboxes, batch action bar, selection pruning on data refresh
- Added 'grey' RAG status for N/A values in computeRagStatus and KpiTable
- WHERE verified=false guard prevents re-verification from overwriting original verifier
- markNotApplicable clears verified/verifiedBy/verifiedAt to prevent contradictory state
- Added React Query mutation hooks (useVerifyKpiValues, useMarkNotApplicable)
- Wired up console page to pass new callbacks to KpiTable
- Role-based access: admin, analyst, department can verify (viewer blocked); department scoped to param.depts
- 62 tests across 4 test files, all passing; 1173 total tests, 0 regressions

### File List
- greenmeter/src/app/api/kpi/verify/route.ts (created — POST verify, PUT mark-N/A with per-value audit)
- greenmeter/src/app/api/kpi/verify/route.test.ts (created — 19 tests)
- greenmeter/src/components/console/VerificationBadge.tsx (created — green badge with verifier name tooltip)
- greenmeter/src/components/console/VerificationBadge.test.ts (created — 5 tests)
- greenmeter/src/schemas/kpi.ts (modified — added batch schemas with max(100))
- greenmeter/src/schemas/kpi.test.ts (modified — added batch schema tests)
- greenmeter/src/db/repositories/kpiRepository.ts (modified — batchVerify/batchMarkNotApplicable in transactions, checkDepartmentScope, LEFT JOIN users for verifiedByName)
- greenmeter/src/services/kpiService.ts (modified — verifyValues/markNotApplicable with dept scope, dedup, grey RAG status)
- greenmeter/src/services/kpiService.test.ts (modified — verify/markNA/dept scope/dedup/grey RAG tests)
- greenmeter/src/services/auditService.ts (modified — added MARK_NA to action type)
- greenmeter/src/hooks/useKpiValues.ts (modified — added hooks, verifiedByName, grey ragStatus)
- greenmeter/src/components/console/KpiTable.tsx (modified — verify/N/A buttons, multi-select, selection pruning, grey N/A status)
- greenmeter/src/app/(dashboard)/console/page.tsx (modified — wired up verify/markNA mutations, verifiedByName mapping)

## Change Log
- 2026-05-07: Story 4.4 implementation complete — verification workflow with batch verify, not-applicable, per-value audit, verification badge UI
- 2026-05-07: Code review patches applied — 12 findings fixed (transaction safety, dept scope, verifier name JOIN, dedup, oldValue audit, MARK_NA action, grey RAG, selection fix)

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all tests passing (1040/1041, 1 pre-existing failure in rollup route unrelated to this story)
- 2026-05-07: Status changed to `review` — code review patches applied, all 1173 tests passing, ready for human review
- 2026-05-07: Status changed to `complete` — human review approved
