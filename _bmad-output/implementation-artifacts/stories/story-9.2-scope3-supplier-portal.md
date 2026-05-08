# Story 9.2: Scope 3 Category 1 & Supplier Portal

Status: complete

## Story

As a sustainability analyst,
I want suppliers to self-report emissions data through a portal,
so that Scope 3 Cat 1 data is collected without manual effort.

## Acceptance Criteria

1. Supplier portal page accessible via unique link (no full platform login required)
2. Portal shows simplified interface for entering requested metrics
3. Submitted data stored as supplier_assessments pending tenant verification
4. Scope 3 Cat 1 aggregated from all supplier contributions
5. /supply-chain page shows Scope 3 breakdown by supplier

## Tasks / Subtasks

- [x] Task 1: Create supplier portal page (AC: #1, #2)
  - [x] Public route /src/app/supplier-portal/[token]/page.tsx (outside auth middleware)
  - [x] Token validation logic in route handler
  - [x] Simplified data entry UI for requested metrics
- [x] Task 2: Create submission API (AC: #3)
  - [x] POST /api/supply-chain/portal/submit — validate token, create supplier_assessment record
  - [x] Mark submission as pending verification
  - [x] Return confirmation to supplier
- [x] Task 3: Implement Scope 3 aggregation logic (AC: #4)
  - [x] SUM all supplier Scope 3 Cat 1 values = tenant's Scope 3 Cat 1 total
  - [x] Query supplier_assessments for emissions-related entries
  - [x] Expose via GET /api/supply-chain/scope3 endpoint
- [x] Task 4: Display Scope 3 breakdown on supply-chain page (AC: #5)
  - [x] Pie/bar chart showing contributions by supplier
  - [x] Total Scope 3 Cat 1 summary card
  - [x] Link to individual supplier detail for drill-down

## Dev Notes

- Portal route: /src/app/supplier-portal/[token]/page.tsx (outside auth middleware)
- Token: unique per supplier, stored in suppliers table (portal_token), time-limited or persistent
- Portal auth: validate token in route handler (not OAuth — simplified access)
- Submission: POST /api/supply-chain/portal/submit — creates supplier_assessment record
- Aggregation: SUM all supplier Scope 3 Cat 1 values = tenant's Scope 3 Cat 1 total
- Display: on /supply-chain page, show pie/bar chart of contributions by supplier
- v1: portal is self-service only (no email dispatch — that's v2 per decisions-log)

### Depends On
- Story 9.1 (suppliers must exist)

### References
- [Source: product-brief.md — Scope 3 Cat 1]
- [Source: decisions-log.md — supplier survey dispatch deferred to v2]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Added `portal_token` (unique, nullable) column to suppliers DB schema + migration
- Created public supplier portal page at `/supplier-portal/[token]` with token validation, form for Scope 3 + ESG data entry, multi-state UI (loading/invalid/ready/submitting/submitted/error)
- Created portal validate API (`POST /api/supply-chain/portal/validate`) — public, no auth
- Created portal submit API (`POST /api/supply-chain/portal/submit`) — public, no auth, validates with Zod, creates assessment as 'submitted' status pending verification
- Added portal API bypass in proxy.ts middleware for `/api/supply-chain/portal` routes
- Added portal token generation API (`POST /api/supply-chain/suppliers/[supplierId]/portal-token`) — authenticated, audit-logged
- Implemented Scope 3 Cat 1 aggregation in supplierService: takes latest fiscal year per supplier, computes total + per-supplier breakdown with percentages
- Created scope3 API endpoint (`GET /api/supply-chain/scope3`) — authenticated
- Created Scope3Breakdown chart component with horizontal bar chart (Chart.js), total summary card, and breakdown table with drill-down
- Added "Suppliers" / "Scope 3 Emissions" tab switcher to SupplyChain screen
- Added "Portal Link" button to SupplierDetailPanel to generate and copy portal URLs
- Added 10 new unit tests (27 total) — all passing
- Full regression suite: 1441/1443 tests pass (2 pre-existing failures in reports/generate unrelated to this story)

### Implementation Plan
- Add `portal_token` column to suppliers table
- Create public route `/supplier-portal/[token]/page.tsx` outside auth middleware
- Add portal submission API endpoint (`POST /api/supply-chain/portal/submit`)
- Add portal API bypass in Next.js proxy middleware
- Implement Scope 3 aggregation service + API endpoint
- Add Scope 3 breakdown UI to supply-chain page

### File List
- `greenmeter/src/db/schema/supply-chain.ts` — added `portalToken` column to suppliers table
- `greenmeter/src/db/repositories/supplierRepository.ts` — added `portalToken` to SupplierRow, `findByPortalToken`, `setPortalToken`, `findAssessmentsWithScope3ByTenant` methods
- `greenmeter/src/schemas/suppliers.ts` — added `portalSubmissionSchema` and `PortalSubmission` type
- `greenmeter/src/services/supplierService.ts` — added `generatePortalToken`, `validatePortalToken`, `submitPortalAssessment`, `getScope3Summary` methods
- `greenmeter/src/services/supplierService.test.ts` — added 10 new tests for portal + scope3 service methods
- `greenmeter/src/proxy.ts` — added portal API bypass for `/api/supply-chain/portal` routes
- `greenmeter/src/app/supplier-portal/[token]/page.tsx` — **new** public portal page
- `greenmeter/src/app/api/supply-chain/portal/validate/route.ts` — **new** token validation API
- `greenmeter/src/app/api/supply-chain/portal/submit/route.ts` — **new** portal submission API
- `greenmeter/src/app/api/supply-chain/scope3/route.ts` — **new** Scope 3 aggregation API
- `greenmeter/src/app/api/supply-chain/suppliers/[supplierId]/portal-token/route.ts` — **new** portal token generation API
- `greenmeter/src/components/supply-chain/Scope3Breakdown.tsx` — **new** Scope 3 chart + table component
- `greenmeter/src/app/screens/SupplyChain.tsx` — added Scope 3 tab, portal link generation, imports
- `greenmeter/src/components/supply-chain/SupplierDetailPanel.tsx` — added portal link button
- `greenmeter/src/hooks/useSuppliers.ts` — added `useScope3Summary`, `useGeneratePortalToken` hooks + types
- `greenmeter/src/lib/queryKeys.ts` — added `suppliers.scope3()` query key
- `greenmeter/drizzle/migrations/0003_supplier_portal_token.sql` — **new** migration for portal_token column

## Change Log
- 2026-05-07: Implemented Scope 3 Cat 1 supplier portal + aggregation (Story 9.2)

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all tests passing (27/27 supplier tests, 1441/1443 full suite)
- 2026-05-07: Status changed to `review` — implementation complete, ready for human review
- 2026-05-07: Status changed to `complete` — human review approved
