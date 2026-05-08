# Story 1.1: Database Schema & Drizzle ORM Setup

Status: complete

## Story

As a developer,
I want the complete PostgreSQL database schema defined via Drizzle ORM with migrations generated,
so that all subsequent features have a type-safe, version-controlled data layer to build on.

## Acceptance Criteria

1. Drizzle ORM and drizzle-kit are installed with PostgreSQL driver (postgres.js or @neondatabase/serverless)
2. All domain schema files exist in `/src/db/schema/` with correct table definitions matching the storage-schema-design
3. `drizzle.config.ts` at project root configured with schema path and migrations output
4. `drizzle-kit generate` produces valid SQL migration files in `/drizzle/migrations/`
5. `/src/db/index.ts` exports a typed `db` instance connected via DATABASE_URL
6. All naming conventions match architecture spec (snake_case tables, `{singular}_id` PKs, TIMESTAMPTZ timestamps, UUID v4 IDs)
7. `drizzle-zod` is configured to auto-generate Zod schemas from table definitions

## Tasks / Subtasks

- [x] Task 1: Install dependencies (AC: #1, #7)
  - [x] `npm install drizzle-orm postgres drizzle-zod zod`
  - [x] `npm install -D drizzle-kit @types/node`
- [x] Task 2: Create drizzle.config.ts (AC: #3)
  - [x] Configure schema path: `./src/db/schema`
  - [x] Configure output: `./drizzle/migrations`
  - [x] Configure driver: `postgres`
  - [x] Configure dbCredentials from DATABASE_URL env var
- [x] Task 3: Create /src/db/schema/ files (AC: #2, #6)
  - [x] `tenants.ts` — tenants, org_nodes, reporting_periods
  - [x] `auth.ts` — users, sessions, accounts (Auth.js compatible)
  - [x] `kpi.ts` — kpi_parameters, kpi_values, canonical_metrics
  - [x] `extraction.ts` — raw_extractions, extracted_metrics, peer_kpi_values, unmapped_metrics
  - [x] `mapping.ts` — metric_mapping_rules, metric_aliases
  - [x] `peers.ts` — peer_organisations
  - [x] `goals.ts` — goals, goal_components, milestones
  - [x] `reports.ts` — report_templates, generated_reports
  - [x] `supply-chain.ts` — suppliers, supplier_assessments
  - [x] `config.ts` — tenant_config, scoring_weights, thresholds
  - [x] `audit.ts` — audit_logs
  - [x] `index.ts` — barrel export of all schemas
- [x] Task 4: Create /src/db/index.ts (AC: #5)
  - [x] Initialize postgres client with DATABASE_URL
  - [x] Create and export typed Drizzle instance
  - [x] Add helper for setting RLS session variable
- [x] Task 5: Generate initial migration (AC: #4)
  - [x] Run `drizzle-kit generate` and verify SQL output
  - [x] Create `/scripts/migrate.ts` to run migrations programmatically
- [x] Task 6: Create Zod schema generation utility (AC: #7)
  - [x] Use `createInsertSchema` / `createSelectSchema` from drizzle-zod for key tables
  - [x] Export from `/src/schemas/` directory

## Dev Notes

### Key Architecture Decisions
- **ORM:** Drizzle ORM (NOT Prisma) — chosen for SQL-like API, small bundle, RLS compatibility
- **IDs:** UUID v4 for all primary keys — use `uuid('column_name').defaultRandom().primaryKey()`
- **Timestamps:** Always TIMESTAMPTZ — use `timestamp('created_at', { withTimezone: true }).defaultNow()`
- **Enums:** Stored as TEXT with application-level validation (not pgEnum) — use `text('status')` with Zod union
- **Booleans:** Positive phrasing — `verified`, `active`, `not_applicable` (NOT `is_verified`)
- **Arrays:** PostgreSQL text arrays for `depts`, `standards` — use `text('depts').array()`

### Critical Schema Details (from storage-schema-design.md)

**kpi_parameters unique constraint:** `UNIQUE (tenant_id, standard, code)` — one entry per standard per tenant
**kpi_values unique constraint:** `UNIQUE (tenant_id, param_id, node_id, period_id)`
**peer_kpi_values unique constraint:** `UNIQUE (tenant_id, peer_id, param_id, fiscal_year)`
**metric_aliases unique constraint:** `UNIQUE (param_id, alias_text)`
**raw_extractions:** raw_payload is JSONB, NEVER updatable (immutability rule)

### Table Relationships (Foreign Keys)
- `org_nodes.parent_node_id` → self-referential (tree)
- `kpi_values.param_id` → `kpi_parameters.param_id`
- `kpi_values.node_id` → `org_nodes.node_id`
- `kpi_values.period_id` → `reporting_periods.period_id`
- `extracted_metrics.extraction_id` → `raw_extractions.extraction_id`
- `peer_kpi_values.peer_id` → `peer_organisations.peer_id`
- All tenant-scoped tables have `tenant_id` → `tenants.tenant_id`

### Project Structure Notes

- Schema files go in: `/src/db/schema/`
- DB client goes in: `/src/db/index.ts`
- Migrations output: `/drizzle/migrations/`
- Config at root: `/drizzle.config.ts`
- Scripts go in: `/scripts/`

### Important: Existing Project Context
- Project is already initialized Next.js 16.2.4 with `greenmeter/` directory
- Working directory for all new files is within the `greenmeter/` application folder
- package.json already exists — ADD to it, don't replace

### References

- [Source: _bmad-output/planning-artifacts/storage-schema-design.md — Full table definitions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — ORM choice rationale]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns — All naming conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure — File locations]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- TypeScript compilation verified clean (`npx tsc --noEmit` — no errors)
- All schema files checked against storage-schema-design.md for compliance

### Completion Notes List
- All 12 schema files created with correct naming conventions (snake_case DB columns, camelCase TS properties)
- UUID v4 primary keys with `defaultRandom()` on all tables
- TIMESTAMPTZ timestamps on all date fields
- Self-referential FK on `org_nodes.parent_node_id` for hierarchy
- Unique constraints on: kpi_parameters (tenant_id, standard, code), kpi_values (tenant_id, param_id, node_id, period_id), peer_kpi_values (tenant_id, peer_id, param_id, fiscal_year), metric_aliases (param_id, alias_text)
- Auth.js compatible tables (users, accounts, sessions, verification_tokens with composite PK)
- `rawPayload` marked as JSONB with immutability documented via comments
- RLS helper `setTenantContext()` uses `set_config('app.current_tenant_id', ...)` with transaction scope
- Zod schemas generated for all key domain tables using `createInsertSchema`/`createSelectSchema`
- Migration SQL generated and valid — covers all 20+ tables with proper FKs and constraints

### Change Log
- 2026-05-05: Story completed — all tasks verified and marked done

### File List
- `greenmeter/drizzle.config.ts` (new)
- `greenmeter/src/db/index.ts` (new)
- `greenmeter/src/db/schema/index.ts` (new)
- `greenmeter/src/db/schema/tenants.ts` (new)
- `greenmeter/src/db/schema/auth.ts` (new)
- `greenmeter/src/db/schema/kpi.ts` (new)
- `greenmeter/src/db/schema/extraction.ts` (new)
- `greenmeter/src/db/schema/mapping.ts` (new)
- `greenmeter/src/db/schema/peers.ts` (new)
- `greenmeter/src/db/schema/goals.ts` (new)
- `greenmeter/src/db/schema/reports.ts` (new)
- `greenmeter/src/db/schema/supply-chain.ts` (new)
- `greenmeter/src/db/schema/config.ts` (new)
- `greenmeter/src/db/schema/audit.ts` (new)
- `greenmeter/src/schemas/index.ts` (new)
- `greenmeter/src/schemas/kpi.ts` (new)
- `greenmeter/scripts/migrate.ts` (new)
- `greenmeter/drizzle/migrations/0000_gorgeous_cloak.sql` (new)
- `greenmeter/package.json` (modified — added drizzle-orm, postgres, drizzle-zod, drizzle-kit)

## Status Log
- 2026-05-06: Status changed to `complete` — human review approved (batch approval)
