# Story 5.1: Peer Organisation Management

Status: complete

## Story

As an ESG analyst,
I want to manage a list of peer companies,
so that extracted data is attributed for comparison.

## Acceptance Criteria

1. GET /api/peers returns all peer_organisations for current tenant
2. POST /api/peers creates new peer (name, sector, country)
3. PUT /api/peers/[peerId] updates metadata
4. GET /api/peers/[peerId]/values returns peer_kpi_values
5. Peer list page accessible from analytics or settings

## Tasks / Subtasks

- [x] Task 1: Create peerRepository (AC: #1, #2, #3, #4)
  - [x] Implement findAllByTenant method
  - [x] Implement create method with name, sector, country fields
  - [x] Implement update method for metadata
  - [x] Implement findValuesByPeerId method for peer_kpi_values
- [x] Task 2: Create API routes (AC: #1, #2, #3, #4)
  - [x] GET /api/peers route returning tenant-scoped peers
  - [x] POST /api/peers route with validation (name, sector, country)
  - [x] PUT /api/peers/[peerId] route for updates
  - [x] GET /api/peers/[peerId]/values route for peer KPI values
- [x] Task 3: Create peer list component (AC: #5)
  - [x] Build PeerList page component
  - [x] Add navigation entry from analytics or settings
  - [x] Include add/edit peer form with sector dropdown

## Dev Notes

- API: /src/app/api/peers/route.ts, /src/app/api/peers/[peerId]/route.ts, /src/app/api/peers/[peerId]/values/route.ts
- Repository: /src/db/repositories/peerRepository.ts
- Sectors should match a predefined list for consistency

### Depends On
- Story 4.1 (parameters must exist for peer values to reference)

### References
- [Source: architecture.md#Complete Project Directory Structure — /api/peers/]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No blocking issues encountered during implementation

### Completion Notes List
- **Task 1 (peerRepository):** Created `src/db/repositories/peerRepository.ts` with four methods:
  - `findAllByTenant` — paginated list with search/sector/active filters, RLS-scoped
  - `findById` — single peer lookup by UUID
  - `create` — inserts peer with tenantId, name, sector, country, marketCap, exchange
  - `update` — partial update with `updatedAt` timestamp refresh
  - `findValuesByPeerId` — paginated peer_kpi_values with fiscalYear and paramId filters
- **Task 1 (peerService):** Created `src/services/peerService.ts` with business logic layer:
  - `list`, `getById`, `create`, `update`, `getValues` methods
  - Throws `AppError(NOT_FOUND)` for missing peers
  - Validates peer existence before returning values
- **Task 1 (schemas):** Created `src/schemas/peers.ts` with Zod validation:
  - `createPeerSchema` — name required, sector/country/marketCap/exchange optional
  - `updatePeerSchema` — all fields optional, nullable for clearing
  - `peerListFilterSchema` — extends pagination with search/sector/active
  - `peerValuesFilterSchema` — extends pagination with fiscalYear/paramId(uuid)
- **Task 2 (API routes):** Created three route files following the middleware chain pattern:
  - `GET /api/peers` — paginated list, admin/analyst roles, audit disabled
  - `POST /api/peers` — create peer, admin/analyst roles, audit entry with entityType='peer_organisation'
  - `GET /api/peers/[peerId]` — single peer by ID with UUID validation
  - `PUT /api/peers/[peerId]` — partial update with old/new value audit
  - `GET /api/peers/[peerId]/values` — paginated peer KPI values with filters
  - All routes use `withApiHandler` for auth → tenant → role → handler → audit chain
  - tenantId extracted from `ctx.tenantId` (never from request body)
- **Task 3 (UI):** Created `src/app/(dashboard)/settings/peers/page.tsx`:
  - Full CRUD peer list page with table display
  - Search by name, pagination controls
  - Inline add/edit form with sector dropdown (11 GICS-aligned sectors)
  - MarketCap selector (large_cap/mid_cap/small_cap)
  - Active/Inactive status badge
  - Unauthorized state handling (401/403)
  - Uses existing UI primitives (Table, Badge, Button, Input, Select, PageHeader)
- **Task 3 (Navigation):** Added "Peer organisations" tab to Settings screen:
  - Added route mapping `peers: "/settings/peers"` to `SCREEN_ROUTES`
  - Added "Peer organisations" tab to legacy Settings screen that navigates to `/settings/peers`
- **Testing:** 53 new tests across 4 test files. All 533 tests pass (0 regressions).

### File List
**New files:**
- `greenmeter/src/schemas/peers.ts` — Zod validation schemas for peer API
- `greenmeter/src/schemas/peers.test.ts` — 20 unit tests for schema validation
- `greenmeter/src/db/repositories/peerRepository.ts` — Data access layer for peers and peer KPI values
- `greenmeter/src/services/peerService.ts` — Business logic layer for peer operations
- `greenmeter/src/app/api/peers/route.ts` — GET list + POST create API route
- `greenmeter/src/app/api/peers/route.test.ts` — 16 tests for peers list/create routes
- `greenmeter/src/app/api/peers/[peerId]/route.ts` — GET single + PUT update API route
- `greenmeter/src/app/api/peers/[peerId]/route.test.ts` — 10 tests for peer detail/update routes
- `greenmeter/src/app/api/peers/[peerId]/values/route.ts` — GET peer KPI values route
- `greenmeter/src/app/api/peers/[peerId]/values/route.test.ts` — 7 tests for peer values route
- `greenmeter/src/lib/params.ts` — Shared UUID path parameter extraction utility
- `greenmeter/src/app/(dashboard)/settings/peers/page.tsx` — Peer list management page

**Modified files:**
- `greenmeter/src/lib/navigation.ts` — added `peers: "/settings/peers"` route mapping
- `greenmeter/src/app/screens/Settings.tsx` — added "Peer organisations" tab linking to `/settings/peers`

### Review Findings

- [x] [Review][Decision] AC5 partial — peer list accessible from settings but not from analytics. Spec says "from analytics or settings" — settings-only confirmed sufficient by user.
- [x] [Review][Patch] ILIKE wildcards not escaped — Fixed: escape `%`, `_`, `\` before building ILIKE pattern. [peerRepository.ts:53]
- [x] [Review][Patch] Missing JSON parse error handling — Fixed: wrapped `req.json()` in try/catch returning 400. [peers/route.ts, [peerId]/route.ts]
- [x] [Review][Patch] Duplicated extractPeerId helper — Fixed: extracted shared `extractUuidParam()` to `src/lib/params.ts`. [[peerId]/route.ts, [peerId]/values/route.ts]
- [x] [Review][Patch] No max length on search filter — Fixed: added `.max(255)` to search field. [schemas/peers.ts:27]
- [x] [Review][Patch] Name not trimmed in createPeerSchema — Fixed: added `.trim()` transform before `.min(1)`. [schemas/peers.ts:5]
- [x] [Review][Defer] Hardcoded sectors in frontend — SECTORS array in page.tsx is not shared with backend validation. Sector values are freeform in the schema which allows flexibility, but frontend/backend drift is possible. Defer — requires product decision on whether sectors should be enforced server-side. [page.tsx:24-36]
- [x] [Review][Defer] Empty update payload succeeds — sending `PUT /api/peers/{id}` with `{}` body bumps `updatedAt` without changing data. Not harmful but semantically misleading. Defer — cosmetic, no data integrity risk. [peerService.ts:58-66]
- [x] [Review][Defer] Hardcoded path segment index in extractPeerId — uses `segments[3]` which is fragile if routes are mounted under different base paths. Next.js App Router should provide params but current pattern works. Defer — pre-existing pattern concern. [[peerId]/route.ts:11]

## Change Log
- 2026-05-06: Implemented peer organisation management with repository, service, API routes (GET/POST/PUT), Zod schemas, peer list UI page, navigation entries, and 53 tests.
- 2026-05-06: Applied 5 review patches — ILIKE escaping, JSON parse error handling, shared extractUuidParam utility, search max length, name trimming. 537/537 tests passing.

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `review` — all tasks complete, 533/533 tests passing (0 regressions), DoD validated
- 2026-05-06: Status changed to `complete` — human review approved
