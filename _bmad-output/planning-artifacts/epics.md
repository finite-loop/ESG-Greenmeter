---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/storage-schema-design.md
  - _bmad-output/planning-artifacts/decisions-log.md
---

# ESG_ReportingV2 (GreenMeter AI) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for GreenMeter AI, decomposed from the Product Brief and Architecture decisions into implementable stories. Stories are ordered as a dependency-safe roadmap — each story assumes only prior stories are complete.

## Requirements Inventory

### Functional Requirements

FR1: Multi-tenant platform with tenant isolation via PostgreSQL Row-Level Security
FR2: OAuth authentication with role-based access control (Admin, Analyst, Department, Viewer roles)
FR3: Onboarding wizard — company profile, framework selection, org hierarchy setup, fiscal year configuration
FR4: KPI Console — CRUD operations for sustainability metrics with filtering by standard, pillar, department, and period
FR5: KPI manual data entry with form validation and source tracking
FR6: KPI Excel import — upload, parse, and validate spreadsheet data into kpi_values
FR7: KPI API sync — scheduled connectors for SAP and Darwinbox ERP/HRMS integration
FR8: Pre-seeded parameter library covering BRSR (80+ params), ESRS (100+ params), GRI (80+ params) with per-standard entries linked by canonical_id
FR9: Verification workflow — unverified → verified / not applicable — with RAG status indicators and department assignments
FR10: ESG scoring engine — weighted average computation with threshold-based normalization and pluggable scoring strategy
FR11: Peer document ingestion — PDF upload to Azure Blob Storage with metadata capture
FR12: Document extraction pipeline — Azure Document Intelligence OCR → enterprise LLM → free-text JSON output using standard-specific prompts (BRSR, ESRS, GRI)
FR13: Post-extraction mapping layer — exact alias → pattern → fuzzy (trigram) → LLM-assisted → manual review queue
FR14: Mapping confidence scoring with configurable thresholds (auto-accept > 85, flagged review 60-85, unmatched < 60)
FR15: Peer benchmarking — sector median, quartile position, percentile rank computation from mapped peer data
FR16: Radar chart and visual comparison for peer benchmarking
FR17: Multi-dimensional scaling (MDS) for competitive positioning across ESG metrics
FR18: Industry-wise feature-selected correlation analysis across extracted metrics
FR19: Goal management — create goals with weighted component decomposition and target setting
FR20: Milestone tracking for goals with progress indicators
FR21: Linear regression forecasting — BAU, moderate, and aggressive intervention scenarios with probability estimates
FR22: Org hierarchy management — tree structure (company → subsidiaries → facilities → departments) with CRUD operations
FR23: Org hierarchy rollup computation — configurable methods (SUM, AVERAGE, WEIGHTED_AVG) per parameter
FR24: Currency normalization at rollup boundaries using admin-entered period-average exchange rates
FR25: Report generation — template-based output for BRSR, GRI, ESRS, IFRS S2 frameworks
FR26: Report coverage tracking — completion percentage per section, missing data indicators
FR27: PDF output generation for regulatory filing
FR28: Supply chain ESG — supplier scorecard system with ESG assessment criteria
FR29: Scope 3 Category 1 data tracking via supplier self-service portal
FR30: Knowledge base — ESG standards reference content and intervention strategy library
FR31: AI recommendations — rule-based alerts + LLM-generated action items (nightly batch)
FR32: User management — invite users, assign roles, manage permissions per tenant
FR33: Parameter configuration — tenant overrides for platform-seeded parameters
FR34: Threshold and scoring weight configuration per tenant
FR35: Integration configuration management (API keys, endpoints, sync schedules)
FR36: System health monitoring dashboard (job queue status, API health, storage usage)
FR37: Immutable audit log — every write operation tracked with user, action, entity, old/new JSONB values
FR38: Executive dashboard — ESG score overview, coverage widgets, alerts panel, peer comparison summary
FR39: Cross-standard canonical metric registry enabling unified analytics across BRSR/ESRS/GRI
FR40: Background job processing with progress tracking for long-running operations (extraction, report gen, sync, scoring)
FR41: Materiality assessment page (placeholder — design TBD)
FR42: Industry data explorer page (placeholder — design TBD)
FR43: Unmapped metrics retention for exploratory MDS analysis
FR44: Metric alias accumulation — system learns new name variants over time from successful mappings

### NonFunctional Requirements

NFR1: Multi-tenancy — single-instance deployment with strict PostgreSQL RLS; session-level tenant_id enforcement on every query
NFR2: Data integrity — immutable append-only audit log; no UPDATE or DELETE on audit_logs table
NFR3: Security — OAuth via Auth.js v5 + Azure AD; credentials in Azure Key Vault (never in env vars); RBAC middleware chain
NFR4: Performance — dashboard load < 2 seconds (materialized views + TanStack Query client cache)
NFR5: Performance — report generation < 30 seconds (async via pg-boss background job)
NFR6: Performance — ESG score computation < 2 seconds on dashboard load
NFR7: Scalability — Azure PgBouncer connection pooling; composite indexes on (tenant_id, ...) for all tenant-scoped tables
NFR8: Compliance — full regulatory fidelity for SEBI BRSR, EU CSRD/ESRS, GRI Universal Standards, ISSB IFRS S1/S2
NFR9: Extensibility — strategy pattern for scoring algorithms; abstract LLM interface for provider swapping; config-driven behavior
NFR10: Auditability — every write operation to business entities recorded automatically via middleware
NFR11: Reliability — background jobs with retry policies (exponential backoff) and dead-letter handling
NFR12: Type safety — strict TypeScript throughout; Zod validation at API boundaries; drizzle-zod for schema-to-validation generation
NFR13: Observability — structured JSON logging with correlation IDs; Azure Application Insights APM; tenant_id in every log entry

### Additional Requirements

- Project already initialized with Next.js 16.2.4 + React 19 + TypeScript (strict) + Tailwind CSS 4 + Radix UI + Chart.js
- Existing frontend prototype has 10 screens with mock data (0 API routes, 0 database, 0 auth)
- ORM: Drizzle ORM with drizzle-kit for code-first migrations
- Auth: Auth.js v5 with Azure AD provider, JWT session strategy
- Background jobs: pg-boss (PostgreSQL SKIP LOCKED)
- State management: TanStack Query v5 (server) + Zustand (UI)
- Forms: React Hook Form + Zod resolver
- Frontend routing: Convert AppShell to App Router file-based routing
- Incremental refactoring: extract UI primitives → layout shell → per-screen wiring
- CI/CD: GitHub Actions → lint + typecheck + vitest → staging → Playwright E2E → prod
- Materialized views refreshed on data change triggers
- Seed data: Parse BRSR/ESRS/GRI Excel files → kpi_parameters + canonical_metrics
- Deployment: Azure App Service (Linux, Node.js 22) + PostgreSQL Flexible v16 + Blob Storage

### UX Design Requirements

No UX Design document — UX derived from existing prototype screens and product brief.

### FR Coverage Map

| FR | Epic.Story | Status |
|---|---|---|
| FR1 | 1.1, 1.2 | Covered |
| FR2 | 1.3, 1.4 | Covered |
| FR3 | 3.1, 3.2 | Covered |
| FR4 | 4.3 | Covered |
| FR5 | 4.3 | Covered |
| FR6 | 4.5 | Covered |
| FR7 | 10.5 | Covered |
| FR8 | 4.1, 4.2 | Covered |
| FR9 | 4.4 | Covered |
| FR10 | 6.1 | Covered |
| FR11 | 5.2 | Covered |
| FR12 | 5.3 | Covered |
| FR13 | 5.4 | Covered |
| FR14 | 5.4 | Covered |
| FR15 | 6.3 | Covered |
| FR16 | 6.4 | Covered |
| FR17 | 6.5 | Covered |
| FR18 | 6.6 | Covered |
| FR19 | 7.1 | Covered |
| FR20 | 7.2 | Covered |
| FR21 | 7.3 | Covered |
| FR22 | 4.6 | Covered |
| FR23 | 4.7 | Covered |
| FR24 | 4.7 | Covered |
| FR25 | 8.1 | Covered |
| FR26 | 8.2 | Covered |
| FR27 | 8.3 | Covered |
| FR28 | 9.1 | Covered |
| FR29 | 9.2 | Covered |
| FR30 | 9.3 | Covered |
| FR31 | 9.4 | Covered |
| FR32 | 3.3 | Covered |
| FR33 | 4.2 | Covered |
| FR34 | 6.2 | Covered |
| FR35 | 10.4 | Covered |
| FR36 | 10.3 | Covered |
| FR37 | 1.5 | Covered |
| FR38 | 10.1 | Covered |
| FR39 | 4.1 | Covered |
| FR40 | 1.6 | Covered |
| FR41 | 10.6 | Covered |
| FR42 | 10.6 | Covered |
| FR43 | 5.4 | Covered |
| FR44 | 5.5 | Covered |

## Epic List

| Epic | Title | Dependencies |
|---|---|---|
| Epic 1 | Project Foundation & Infrastructure | None |
| Epic 2 | Frontend Architecture Migration | Epic 1 |
| Epic 3 | Authentication, Onboarding & User Management | Epic 1, Epic 2 |
| Epic 4 | Parameter Library & KPI Data Management | Epic 3 |
| Epic 5 | Document Extraction & Mapping Pipeline | Epic 4 |
| Epic 6 | ESG Scoring & Peer Analytics | Epic 4, Epic 5 |
| Epic 7 | Goals & Forecasting | Epic 4 |
| Epic 8 | Report Generation | Epic 4, Epic 6 |
| Epic 9 | Supply Chain & Knowledge Features | Epic 4 |
| Epic 10 | Executive Dashboard & System Operations | Epic 6 |

---

## Epic 1: Project Foundation & Infrastructure

**Goal:** Establish the complete backend foundation — database schema, authentication skeleton, middleware chain, background job system, external service clients, and observability — so that all subsequent epics can build on a stable, production-grade infrastructure layer.

**Covers:** FR1, FR2, FR37, FR40 | NFR1-3, NFR7, NFR10-13

---

### Story 1.1: Database Schema & Drizzle ORM Setup

As a developer,
I want the complete PostgreSQL database schema defined via Drizzle ORM with migrations generated,
So that all subsequent features have a type-safe, version-controlled data layer to build on.

**Acceptance Criteria:**

**Given** the project has Drizzle ORM and drizzle-kit installed
**When** I run `drizzle-kit generate`
**Then** SQL migration files are produced in `/drizzle/migrations/` covering all tables defined in the storage schema design

**Given** the schema files exist in `/src/db/schema/`
**When** I inspect the exported tables
**Then** the following domain schemas are defined: `tenants.ts` (tenants, org_nodes, reporting_periods), `auth.ts` (users, sessions, accounts), `kpi.ts` (kpi_parameters, kpi_values, canonical_metrics), `extraction.ts` (raw_extractions, extracted_metrics, peer_kpi_values, unmapped_metrics), `mapping.ts` (metric_mapping_rules, metric_aliases), `peers.ts` (peer_organisations), `goals.ts` (goals, goal_components, milestones), `reports.ts` (report_templates, generated_reports), `supply-chain.ts` (suppliers, supplier_assessments), `config.ts` (tenant_config, scoring_weights, thresholds), `audit.ts` (audit_logs)

**Given** the schema is applied to a PostgreSQL database
**When** I inspect column types and constraints
**Then** all naming conventions match architecture spec (snake_case tables, `{singular}_id` PKs, TIMESTAMPTZ for all timestamps, UUID v4 for IDs)

**Given** `/src/db/index.ts` exists
**When** the Drizzle client is initialized
**Then** it connects via the DATABASE_URL environment variable and exports a typed `db` instance

**Given** `drizzle.config.ts` exists at project root
**When** drizzle-kit commands are run
**Then** they use the correct schema path and output directory

---

### Story 1.2: Row-Level Security Policies

As a platform operator,
I want PostgreSQL RLS policies enforced on all tenant-scoped tables,
So that data isolation between tenants is guaranteed at the database level regardless of application bugs.

**Acceptance Criteria:**

**Given** the migration has been applied
**When** the RLS setup script (`/scripts/setup-rls.ts`) is executed
**Then** RLS is enabled on every table that has a `tenant_id` column

**Given** RLS is enabled on a table
**When** a query is executed without `app.current_tenant_id` set
**Then** zero rows are returned (default-deny policy)

**Given** a session sets `app.current_tenant_id = 'tenant-A'`
**When** a SELECT is executed on `kpi_values`
**Then** only rows where `tenant_id = 'tenant-A'` are returned

**Given** RLS policies are defined
**When** I inspect the policy definitions
**Then** each policy uses `current_setting('app.current_tenant_id', true)` for tenant filtering

**Given** platform-seed rows exist (e.g., `kpi_parameters` with `tenant_id IS NULL`)
**When** any tenant session queries `kpi_parameters`
**Then** platform-seed rows (NULL tenant_id) are visible alongside tenant-specific overrides

---

### Story 1.3: Auth.js v5 Configuration & Azure AD Provider

As a user,
I want to authenticate via Azure AD OAuth,
So that I can securely access the platform with my organization's identity provider.

**Acceptance Criteria:**

**Given** Auth.js v5 is installed and configured in `/src/lib/auth.ts` and `/src/lib/auth.config.ts`
**When** the `/api/auth/[...nextauth]/route.ts` handler receives a request
**Then** it processes OAuth flows (sign-in, sign-out, callback, session)

**Given** Azure AD environment variables are set (AUTH_AZURE_AD_CLIENT_ID, AUTH_AZURE_AD_CLIENT_SECRET, AUTH_AZURE_AD_TENANT_ID)
**When** a user clicks "Sign in"
**Then** they are redirected to Azure AD consent screen and returned with a valid session on success

**Given** a successful OAuth callback
**When** the JWT is generated
**Then** it contains `userId`, `tenantId`, `role`, and `email` claims

**Given** no valid session exists
**When** a user attempts to access any `/(dashboard)/*` or `/api/*` route (except `/api/auth`)
**Then** they receive a 401 response or are redirected to `/login`

**Given** the root `middleware.ts` file exists
**When** any request hits the Next.js server
**Then** protected routes are enforced before reaching page/API handlers

---

### Story 1.4: Middleware Chain (Tenant, Role, Audit)

As a platform architect,
I want a systematic middleware chain that enforces tenant context, role permissions, and audit logging on every API request,
So that security policies are applied uniformly without per-route ad-hoc implementation.

**Acceptance Criteria:**

**Given** an authenticated API request arrives
**When** the tenant middleware (`/src/middleware/tenant.ts`) executes
**Then** it extracts `tenantId` from the JWT session (never from request body) and calls `SET app.current_tenant_id` on the database connection

**Given** the tenant middleware has set context
**When** the role guard middleware (`/src/middleware/roleGuard.ts`) executes
**Then** it checks the user's `role` against the route's required permission level and returns 403 if insufficient

**Given** a write operation (POST, PUT, PATCH, DELETE) completes successfully
**When** the audit middleware (`/src/middleware/audit.ts`) executes
**Then** it inserts a row into `audit_logs` with `user_id`, `tenant_id`, `action`, `entity_type`, `entity_id`, `old_value` (JSONB), `new_value` (JSONB), and `timestamp`

**Given** a route handler needs the middleware chain
**When** it imports and composes the chain
**Then** execution order is: auth → tenant → role → handler → audit (on write success)

**Given** the role permissions matrix from architecture
**When** routes are configured
**Then** Admin has full access, Analyst has read+write (no user management), Department has own-dept read+write, Viewer has read-only

---

### Story 1.5: Audit Logging Service

As a compliance officer,
I want every data modification automatically recorded in an immutable audit trail,
So that I can trace any change back to a specific user, time, and action for assurance purposes.

**Acceptance Criteria:**

**Given** `auditService.ts` exists in `/src/services/`
**When** called with action metadata (entity_type, entity_id, old_value, new_value)
**Then** it inserts an append-only record into `audit_logs` with the current user and tenant from context

**Given** the audit_logs table
**When** any INSERT is attempted via the application
**Then** it succeeds

**Given** the audit_logs table
**When** any UPDATE or DELETE is attempted
**Then** it fails (enforced via database permissions or application-level guard)

**Given** an audit log entry exists
**When** queried via the API (`GET /api/audit`)
**Then** results are filterable by entity_type, user_id, date range, and action type with pagination

---

### Story 1.6: Background Job Infrastructure (pg-boss)

As a developer,
I want a reliable background job system using pg-boss,
So that long-running operations (extraction, report generation, scoring, sync) execute asynchronously with progress tracking and retry logic.

**Acceptance Criteria:**

**Given** pg-boss is installed and `/src/lib/pgBoss.ts` initializes the client
**When** the application starts
**Then** pg-boss connects to PostgreSQL and creates its required schema tables (if not exist)

**Given** job handlers are registered in `/src/jobs/index.ts`
**When** the application starts
**Then** handlers for queues `extraction-pipeline`, `metric-mapping`, `score-recompute`, `report-generation`, `api-sync`, `llm-recommendations` are registered

**Given** a job is submitted to a queue
**When** it completes
**Then** the result follows the standard shape: `{ success: boolean, result?: T, error?: string }`

**Given** a job fails
**When** retry policy allows
**Then** it is retried with exponential backoff (configurable per queue as specified in architecture)

**Given** a long-running job is in progress
**When** the handler emits progress
**Then** progress is stored as `{ stage: string, progress: number, message: string }` queryable by job ID

---

### Story 1.7: External Service Clients (Blob Storage, Document Intelligence, LLM)

As a developer,
I want typed client abstractions for Azure Blob Storage, Azure Document Intelligence, and the LLM provider,
So that all external integrations go through a consistent interface that can be swapped or mocked.

**Acceptance Criteria:**

**Given** `/src/lib/blobStorage.ts` exists
**When** called with tenant-scoped container operations
**Then** it provides `upload(tenantId, path, buffer)`, `download(tenantId, path)`, `delete(tenantId, path)`, and `getUrl(tenantId, path)` methods

**Given** `/src/lib/documentIntelligence.ts` exists
**When** called with a PDF buffer
**Then** it returns structured text output from Azure Document Intelligence (layout model)

**Given** `/src/lib/llm.ts` exists
**When** called with a prompt and input text
**Then** it sends to the configured LLM endpoint (Azure OpenAI or localhost) and returns the response

**Given** the LLM client
**When** provider configuration changes
**Then** the abstract interface remains stable (provider-agnostic consumption by services)

**Given** any external client
**When** the external service is unavailable
**Then** a typed `AppError` is thrown with appropriate error code (`PROCESSING_ERROR`)

---

### Story 1.8: Structured Logging & Observability

As an operations engineer,
I want structured JSON logging with correlation IDs and Azure Application Insights integration,
So that I can trace requests across the system and diagnose issues in production.

**Acceptance Criteria:**

**Given** `/src/lib/logger.ts` exists
**When** any log call is made (info, warn, error)
**Then** output is structured JSON with fields: `timestamp`, `level`, `message`, `correlationId`, `tenantId`, `userId`, `extra`

**Given** a request enters the system
**When** processed through middleware
**Then** a unique `correlationId` is generated and propagated to all log entries and downstream calls for that request

**Given** Application Insights SDK is configured
**When** the app runs in staging/production
**Then** all structured logs, request traces, and exceptions are forwarded to Azure Application Insights

**Given** `/src/config/env.ts` exists
**When** the application starts
**Then** all required environment variables are validated via Zod and the app fails fast with clear error messages if any are missing

---

### Story 1.9: CI/CD Pipeline

As a developer,
I want a GitHub Actions pipeline that runs lint, typecheck, and tests on every PR, and deploys to staging with E2E verification,
So that code quality is enforced and deployments are safe.

**Acceptance Criteria:**

**Given** `.github/workflows/ci.yml` exists
**When** a PR is opened or updated
**Then** the pipeline runs: install → lint (ESLint) → typecheck (tsc --noEmit) → vitest (unit/integration tests)

**Given** `.github/workflows/deploy.yml` exists
**When** code is merged to main
**Then** it builds Next.js (standalone output) → deploys to Azure App Service staging slot → runs Playwright E2E against staging

**Given** E2E tests pass on staging
**When** a manual approval is granted
**Then** the staging slot is swapped to production

**Given** the pipeline configuration
**When** migrations exist
**Then** they are applied to the target database before the app starts (startup script)

---

## Epic 2: Frontend Architecture Migration

**Goal:** Convert the existing single-page AppShell prototype into a proper Next.js App Router architecture with extracted shared components, state management infrastructure, and form handling — creating the shell that all feature screens will plug into.

**Covers:** NFR4, NFR12 | Architecture decisions D11 (incremental refactoring)

**Depends on:** Epic 1 (auth middleware must exist for route protection)

---

### Story 2.1: Extract UI Primitives to /components/ui/

As a developer,
I want reusable UI primitives (Button, Card, Badge, Table, Select, Input, Modal, Tabs, ProgressBar, Tooltip, DropdownMenu) extracted from the existing prototype into `/src/components/ui/`,
So that all feature screens use a consistent component library matching the existing design system.

**Acceptance Criteria:**

**Given** the existing prototype screens use inline component patterns
**When** I extract them to `/src/components/ui/`
**Then** each component is a standalone TypeScript file (PascalCase.tsx) with typed props

**Given** the design system uses DM Sans font, teal/indigo/amber palette
**When** components are extracted
**Then** they preserve the existing visual design tokens (CSS custom properties or Tailwind classes)

**Given** `/src/components/ui/index.ts` exists
**When** feature code imports from it
**Then** all primitives are available via barrel export

**Given** extracted components
**When** rendered in isolation
**Then** they have no dependencies on domain logic, API calls, or global state

---

### Story 2.2: Extract Layout Components (Sidebar, TopBar, RollupBar)

As a developer,
I want the layout shell components extracted and wired into the App Router `(dashboard)/layout.tsx`,
So that the persistent navigation frame is shared across all dashboard screens.

**Acceptance Criteria:**

**Given** `/src/components/layout/Sidebar.tsx` is extracted
**When** rendered
**Then** it displays navigation links matching the route structure (Dashboard, Console, Rollup, Analytics, Goals, Reports, Supply Chain, Knowledge, Settings)

**Given** `/src/components/layout/TopBar.tsx` is extracted
**When** rendered
**Then** it shows the current user info, tenant name, and a sign-out action

**Given** `/src/components/layout/RollupBar.tsx` is extracted
**When** rendered
**Then** it shows the active org node context and period selector

**Given** `/src/app/(dashboard)/layout.tsx` exists
**When** any dashboard page is rendered
**Then** it wraps content with Sidebar + TopBar + RollupBar layout

---

### Story 2.3: Convert to App Router File-Based Routing

As a developer,
I want the application converted from the AppShell state-switching pattern to Next.js App Router file-based routing,
So that each screen is code-split, has proper URL paths, and supports loading/error states.

**Acceptance Criteria:**

**Given** the route structure from architecture (`/(auth)/login`, `/(auth)/onboarding`, `/(dashboard)/page`, `/(dashboard)/console`, etc.)
**When** all page.tsx files are created
**Then** each screen is accessible at its designated URL path

**Given** the `(auth)` route group
**When** pages within it are rendered
**Then** they use a centered layout without sidebar (auth layout)

**Given** the `(dashboard)` route group
**When** pages within it are rendered
**Then** they use the full layout with Sidebar + TopBar + RollupBar

**Given** existing screen components from the prototype
**When** migrated to page files
**Then** they render the same visual output as before (content preserved, shell changed)

---

### Story 2.4: State Management Setup (TanStack Query + Zustand)

As a developer,
I want TanStack Query v5 configured for server state and Zustand stores created for UI state,
So that data fetching has caching/refetching/optimistic updates and ephemeral UI state is cleanly separated.

**Acceptance Criteria:**

**Given** TanStack Query is installed
**When** the `QueryClientProvider` is added to the root layout
**Then** all pages and components can use `useQuery` and `useMutation` hooks

**Given** query key conventions are established
**When** hooks are implemented
**Then** they follow the pattern `['domain', { ...params }]` (e.g., `['kpi-values', { tenantId, periodId }]`)

**Given** `/src/stores/filterStore.ts` exists
**When** used by console/analytics pages
**Then** it manages active period, selected standard, selected department as UI-only state

**Given** `/src/stores/sidebarStore.ts` exists
**When** the sidebar collapse button is clicked
**Then** it toggles the collapsed state persisted in Zustand

---

### Story 2.5: Form Infrastructure (React Hook Form + Zod)

As a developer,
I want React Hook Form configured with Zod resolver and shared schemas,
So that all forms in the application have consistent validation matching the API schemas.

**Acceptance Criteria:**

**Given** React Hook Form and @hookform/resolvers are installed
**When** a form component uses `useForm` with `zodResolver`
**Then** validation errors are displayed inline using the same Zod schema that validates the API request

**Given** shared Zod schemas exist in `/src/schemas/`
**When** used in both API route validation and form validation
**Then** the same schema instance is shared (single source of truth)

**Given** `/src/schemas/common.ts` exists
**When** imported
**Then** it exports `paginationSchema`, `filterSchema`, `uuidSchema` for reuse across domains

---

## Epic 3: Authentication, Onboarding & User Management

**Goal:** Implement the complete authentication flow, tenant onboarding wizard, and user management — enabling multi-tenant access with proper role assignment from first login through team setup.

**Covers:** FR2, FR3, FR32 | NFR1, NFR3

**Depends on:** Epic 1 (auth + middleware), Epic 2 (routing + layout)

---

### Story 3.1: Login Page & OAuth Flow

As a new user,
I want to sign in with my organization's Azure AD credentials,
So that I can access the platform without creating a separate account.

**Acceptance Criteria:**

**Given** the `/login` page is rendered
**When** I click "Sign in with Microsoft"
**Then** I am redirected to the Azure AD OAuth consent flow

**Given** Azure AD returns a successful callback
**When** the user exists in the `users` table
**Then** a session is created and I am redirected to the dashboard

**Given** Azure AD returns a successful callback
**When** the user does NOT exist in the system
**Then** they are redirected to the onboarding flow (first-time tenant setup) or an "access denied" page if invites are required

**Given** a session exists
**When** I click "Sign out"
**Then** the session is destroyed and I am redirected to `/login`

---

### Story 3.2: Onboarding Wizard — Company Profile & Frameworks

As a new tenant administrator,
I want to configure my company profile and select applicable ESG frameworks during onboarding,
So that the platform is pre-configured for my organization's reporting requirements.

**Acceptance Criteria:**

**Given** the onboarding wizard is rendered at `/(auth)/onboarding`
**When** Step 1 (Company Profile) is shown
**Then** I can enter: company name, sector/industry, country, base currency, and logo upload

**Given** Step 1 is completed
**When** Step 2 (Framework Selection) is shown
**Then** I can select one or more frameworks from: BRSR, ESRS, GRI, IFRS S2

**Given** frameworks are selected
**When** I confirm
**Then** the tenant record is created/updated and the appropriate parameter library subsets are activated for this tenant

**Given** the wizard is in progress
**When** I navigate away and return
**Then** my progress is preserved (stored in tenant_config with onboarding_step)

---

### Story 3.3: Onboarding Wizard — Org Hierarchy & Fiscal Year

As a tenant administrator,
I want to define my organization's hierarchy and fiscal year during onboarding,
So that data collection is structured by entity and reporting periods are correctly configured.

**Acceptance Criteria:**

**Given** Step 3 (Org Hierarchy) is shown
**When** I add nodes
**Then** I can create a tree: Company (root) → Subsidiaries → Facilities → Departments with name, type, and currency per node

**Given** Step 4 (Fiscal Year) is shown
**When** I configure the fiscal year
**Then** I can set start month (e.g., April for Indian FY), and reporting periods are auto-generated (FY2023-24, FY2024-25, etc.)

**Given** all 4 onboarding steps are completed
**When** I click "Complete Setup"
**Then** the tenant is marked as onboarded, and I am redirected to the main dashboard

**Given** org nodes are created
**When** I view them later in settings
**Then** each node has: name, type (company/subsidiary/facility/department), parent_node_id, currency, and status

---

### Story 3.4: User Management

As a tenant administrator,
I want to invite team members, assign roles, and manage user access,
So that the right people have the right level of access to the platform.

**Acceptance Criteria:**

**Given** I am an Admin on the `/settings/users` page
**When** I click "Invite User"
**Then** I can enter an email address and assign a role (Admin, Analyst, Department, Viewer)

**Given** an invitation is created
**When** the invited user signs in via Azure AD with that email
**Then** they are automatically assigned to my tenant with the specified role

**Given** I am an Admin viewing the user list
**When** I click edit on a user
**Then** I can change their role or deactivate their account

**Given** I am an Admin
**When** I view user list via `GET /api/users`
**Then** results are scoped to my tenant only (RLS enforced) with pagination

**Given** I am not an Admin
**When** I attempt to access user management API
**Then** I receive a 403 Forbidden response

---

## Epic 4: Parameter Library & KPI Data Management

**Goal:** Implement the core data management capability — seed the parameter library, build the KPI Console for data entry/import/verification, and implement org hierarchy with rollup computation — enabling tenants to collect and organize their ESG data.

**Covers:** FR4, FR5, FR6, FR8, FR9, FR22, FR23, FR24, FR33, FR39 | NFR1, NFR8, NFR12

**Depends on:** Epic 3 (auth + onboarding must exist; users must be assignable)

---

### Story 4.1: Parameter Seed Data Pipeline

As a platform operator,
I want scripts that parse the BRSR/ESRS/GRI Excel seed files and insert parameters + canonical metrics into the database,
So that new tenants immediately have a comprehensive parameter library available.

**Acceptance Criteria:**

**Given** seed Excel files exist in `/seed_data/` (BRSR_Seed_Data.xlsx, ESRS_Seed_Data.xlsx, GRI_Seed_Data.xlsx)
**When** `/scripts/seed-parameters.ts` is executed
**Then** all parameters are inserted into `kpi_parameters` with `tenant_id = NULL` (platform-seed) and correct standard-specific fields

**Given** `/scripts/seed-canonical-metrics.ts` is executed
**When** cross-standard equivalences are defined
**Then** `canonical_metrics` entries are created and matching `kpi_parameters` rows have their `canonical_id` populated

**Given** seed scripts run against a fresh database
**When** I query `kpi_parameters` grouped by standard
**Then** I see: BRSR (80+), ESRS (100+), GRI (80+) parameters with proper pillar, category, unit, and direction values

**Given** seed scripts are idempotent
**When** run multiple times
**Then** they upsert without creating duplicates (keyed on standard + code)

---

### Story 4.2: Parameters API & Configuration UI

As a tenant administrator,
I want to view the parameter library and optionally override platform defaults for my tenant,
So that I can customize parameter names, thresholds, or department assignments to match my organization.

**Acceptance Criteria:**

**Given** `GET /api/parameters` is called with query params `?standard=BRSR&pillar=E`
**When** the request is authenticated
**Then** it returns platform-seed parameters merged with any tenant-specific overrides, sorted by priority_order

**Given** `PUT /api/parameters/[paramId]` is called by an Admin
**When** the parameter is a platform-seed (tenant_id NULL)
**Then** a tenant-specific override copy is created (not modifying the platform seed)

**Given** the `/settings/parameters` page is rendered
**When** I browse parameters
**Then** I can filter by standard, pillar, category, and search by name

**Given** I edit a parameter
**When** I change department assignment or display name
**Then** the override is saved and the audit log records the change

---

### Story 4.3: KPI Console — Data Entry & CRUD

As an ESG analyst,
I want to enter and manage KPI values through the Console interface,
So that I can capture my organization's sustainability metrics for the current reporting period.

**Acceptance Criteria:**

**Given** the `/console` page is rendered
**When** I select a reporting period, standard, and optionally filter by pillar/category/department
**Then** I see a table of parameters with their current values (or empty) for the selected context

**Given** I click on a parameter row to enter data
**When** I submit a value via the entry form
**Then** a `kpi_value` is created with `source_type = 'MANUAL'`, linked to the current org_node and period

**Given** `POST /api/kpi` is called with a valid payload
**When** validated against `kpiValueSchema` (Zod)
**Then** the value is inserted, an audit log entry is created, and the response returns the created record

**Given** `PUT /api/kpi/[valueId]` is called
**When** the value is updated
**Then** both old and new values are captured in the audit log

**Given** `DELETE /api/kpi/[valueId]` is called
**When** the user has sufficient permissions
**Then** the value is soft-deleted (or removed) and audit logged

**Given** the console table is rendered
**When** values exist for a parameter
**Then** RAG status indicators show: green (verified), amber (entered but unverified), red (missing/empty)

---

### Story 4.4: KPI Verification Workflow

As a department manager,
I want to verify or mark KPI values as not-applicable through a structured workflow,
So that submitted data is quality-controlled before inclusion in scores and reports.

**Acceptance Criteria:**

**Given** a KPI value exists with `verified = false`
**When** an authorized user (Admin, Analyst, or owning Department) clicks "Verify"
**Then** the value is updated to `verified = true`, `verified_by = userId`, `verified_at = now()`

**Given** a parameter is not relevant for a specific node/period
**When** the user marks it "Not Applicable"
**Then** `not_applicable = true` is set, and the parameter is excluded from coverage calculations

**Given** `POST /api/kpi/verify` is called with an array of value IDs
**When** the user has permission for all specified values
**Then** batch verification is applied and audit logged

**Given** a value is verified
**When** it appears in the console
**Then** it shows a green verified badge with verifier name and timestamp

---

### Story 4.5: KPI Excel Import

As an ESG analyst,
I want to upload an Excel file to bulk-import KPI values,
So that I can migrate existing data without manual re-entry of hundreds of values.

**Acceptance Criteria:**

**Given** the Excel import modal is opened on the Console page
**When** I upload a .xlsx file
**Then** the system parses it and shows a preview of detected parameters and values with match status

**Given** the preview shows matched parameters
**When** I confirm the import
**Then** `kpi_values` are created with `source_type = 'IMPORT'` and `source_ref` pointing to the upload record

**Given** some rows don't match known parameters
**When** the preview is shown
**Then** unmatched rows are highlighted with an option to skip or manually map them

**Given** `POST /api/kpi/import` is called with a multipart file
**When** processed
**Then** the file is validated (max size, correct format), parsed, and results returned with success/error counts

**Given** an import completes
**When** values are created
**Then** each value is individually audit-logged with source_type = 'IMPORT'

---

### Story 4.6: Org Hierarchy Management

As a tenant administrator,
I want to manage my organization's hierarchical structure (add/edit/remove nodes),
So that data collection and rollup computation reflect my actual corporate structure.

**Acceptance Criteria:**

**Given** `GET /api/org-hierarchy` is called
**When** authenticated
**Then** it returns the full tree structure for the current tenant with node metadata (name, type, currency, parent)

**Given** `POST /api/org-hierarchy` is called with node details
**When** valid (name, type, parent_node_id)
**Then** a new org_node is created under the specified parent

**Given** `PUT /api/org-hierarchy/[nodeId]` is called
**When** I update a node's name or reparent it
**Then** the change is persisted and audit logged

**Given** `DELETE /api/org-hierarchy/[nodeId]` is called
**When** the node has no child nodes and no KPI values
**Then** it is removed

**Given** the node has children or data
**When** deletion is attempted
**Then** a 409 Conflict is returned with an appropriate message

---

### Story 4.7: Org Hierarchy Rollup Computation

As a finance director,
I want KPI values to automatically aggregate up the org hierarchy using configurable rollup methods,
So that I can view consolidated metrics at any level without manual calculation.

**Acceptance Criteria:**

**Given** `rollupService.ts` exists
**When** called for a parent node and period
**Then** it computes aggregated values from all child nodes using the parameter's `rollup_method` (SUM, AVERAGE, WEIGHTED_AVG)

**Given** child nodes have different currencies
**When** rollup is computed for a parent node
**Then** values are converted using admin-entered period-average exchange rates before aggregation

**Given** a KPI value is created or updated at a leaf node
**When** the score-recompute job runs
**Then** rollup values at parent levels are recalculated

**Given** the `/rollup` page is rendered
**When** I select a parent node
**Then** I see both the aggregated value and a breakdown by child nodes

**Given** a parameter has `rollup_method = 'WEIGHTED_AVG'`
**When** rollup is computed
**Then** weights are derived from the child node's configured weight factor (e.g., revenue share or headcount)

---

## Epic 5: Document Extraction & Mapping Pipeline

**Goal:** Implement the AI-powered peer intelligence engine — from PDF upload through OCR, LLM extraction, metric parsing, fuzzy mapping, and human review — creating the structured peer data that feeds benchmarking and analytics.

**Covers:** FR11, FR12, FR13, FR14, FR43, FR44 | NFR5, NFR9, NFR11

**Depends on:** Epic 4 (parameter library must be seeded for mapping targets)

---

### Story 5.1: Peer Organisation Management

As an ESG analyst,
I want to manage a list of peer companies for benchmarking,
So that extracted document data is attributed to specific organizations for comparison.

**Acceptance Criteria:**

**Given** `GET /api/peers` is called
**When** authenticated
**Then** it returns all peer organisations for the current tenant with name, sector, country, and document count

**Given** `POST /api/peers` is called with peer details
**When** name, sector, and country are provided
**Then** a new `peer_organisations` record is created

**Given** `PUT /api/peers/[peerId]` is called
**When** sector or metadata is updated
**Then** the change is persisted and audit logged

**Given** `GET /api/peers/[peerId]/values` is called
**When** the peer has mapped KPI values
**Then** it returns all `peer_kpi_values` for that peer, filterable by standard and fiscal year

---

### Story 5.2: Document Upload & Storage

As an ESG analyst,
I want to upload peer companies' sustainability reports (PDFs) and have them stored securely,
So that documents are available for the extraction pipeline to process.

**Acceptance Criteria:**

**Given** the document upload interface at `/settings/documents`
**When** I upload a PDF with metadata (peer company, standard, fiscal year)
**Then** the file is stored in Azure Blob Storage under the tenant-scoped container with a unique path

**Given** `POST /api/extraction/trigger` is called with document ID
**When** validated
**Then** a job is enqueued to the `extraction-pipeline` pg-boss queue with the document reference

**Given** document upload
**When** file size exceeds maximum (configurable, default 50MB)
**Then** the upload is rejected with a clear error

**Given** the documents settings page
**When** I view the documents list
**Then** I see all uploaded documents with status (pending, processing, completed, failed), peer name, standard, and upload date

---

### Story 5.3: Extraction Pipeline Job (OCR → LLM → Parse)

As the system,
I want to process uploaded PDFs through Document Intelligence and LLM extraction,
So that peer sustainability reports are converted into structured metric data.

**Acceptance Criteria:**

**Given** an `extraction-pipeline` job is dequeued
**When** the handler executes
**Then** it: (1) downloads PDF from Blob Storage, (2) sends to Azure Document Intelligence for OCR/layout extraction, (3) sends extracted text + standard-specific prompt to LLM, (4) parses LLM JSON response

**Given** LLM returns a valid JSON payload
**When** parsed
**Then** a `raw_extractions` record is created (immutable, full payload) and individual `extracted_metrics` rows are parsed out

**Given** the extraction uses standard-specific prompts
**When** processing a BRSR document
**Then** it uses the BRSR extraction prompt; likewise ESRS and GRI prompts for their respective documents

**Given** the job progresses through stages
**When** each stage completes
**Then** progress is reported: `{ stage: 'ocr'|'llm'|'parsing'|'complete', progress: 0-100, message: string }`

**Given** any stage fails
**When** retries are exhausted
**Then** the extraction record is marked `status = 'failed'` and the error is logged with full context

**Given** extraction completes
**When** metrics are parsed
**Then** `raw_extractions.metric_count` is updated and `status` is set to `'pending_mapping'`

---

### Story 5.4: Mapping Layer (Fuzzy + LLM + Manual)

As the system,
I want extracted metrics to be automatically mapped to known parameters using a multi-stage matching algorithm,
So that peer data becomes structured and comparable without requiring manual mapping for every metric.

**Acceptance Criteria:**

**Given** a `metric-mapping` job is triggered after extraction
**When** it processes each `extracted_metrics` row
**Then** it executes the mapping cascade: exact alias match → pattern rule match → trigram fuzzy match → LLM-assisted classification

**Given** an exact alias match is found in `metric_aliases`
**When** the alias matches the extracted `metric_name`
**Then** `mapping_confidence = 100`, `mapping_method = 'exact'`, `mapping_status = 'auto_mapped'`

**Given** a fuzzy match scores above 80% similarity
**When** no exact or pattern match exists
**Then** `mapping_confidence` is set proportionally, `mapping_method = 'fuzzy'`

**Given** confidence > 85 (configurable threshold)
**When** mapping completes
**Then** a `peer_kpi_values` record is created automatically from the mapped metric

**Given** confidence is between 60-85
**When** mapping completes
**Then** the metric is marked `auto_mapped` but flagged for human review

**Given** confidence < 60
**When** no match is found
**Then** the metric is inserted into `unmapped_metrics` for MDS analysis and added to the human review queue

**Given** mapping completes for all metrics in an extraction
**When** results are tallied
**Then** `raw_extractions.mapped_count` is updated and `status` changes to `'mapped'` or `'partially_mapped'`

---

### Story 5.5: Mapping Review UI & Alias Learning

As an ESG analyst,
I want to review low-confidence mappings and manually confirm or reassign them,
So that mapping accuracy improves over time and no data is lost due to extraction variability.

**Acceptance Criteria:**

**Given** `/settings/documents` shows a "Mapping Review" section
**When** I view it
**Then** I see metrics with `mapping_status = 'auto_mapped'` and confidence 60-85, plus all `unmapped` metrics

**Given** I review a flagged metric
**When** I confirm the auto-mapping is correct
**Then** `mapping_status` changes to `'manual_mapped'`, `mapped_by = userId`, and if it was a new name variant, a `metric_aliases` entry is created

**Given** I review an unmapped metric
**When** I manually assign it to a known parameter
**Then** `mapping_status = 'manual_mapped'`, a `peer_kpi_values` record is created, and a new alias is learned

**Given** I reject a metric
**When** it has no valid parameter match (noise/irrelevant)
**Then** `mapping_status = 'rejected'` and it remains in `extracted_metrics` but does not flow to `peer_kpi_values`

**Given** a new alias is learned via manual mapping
**When** future extractions encounter the same metric name
**Then** it matches via exact alias lookup at confidence 100

---

## Epic 6: ESG Scoring & Peer Analytics

**Goal:** Implement the scoring engine, benchmarking computations, and advanced analytics (MDS, correlation) — transforming raw data into strategic intelligence about competitive ESG positioning.

**Covers:** FR10, FR15, FR16, FR17, FR18, FR34 | NFR4, NFR6, NFR9

**Depends on:** Epic 4 (KPI values must exist), Epic 5 (peer data must exist for benchmarking)

---

### Story 6.1: ESG Scoring Engine & Materialized Views

As a sustainability director,
I want an automated ESG score computed from my KPI data using configurable weights and thresholds,
So that I have a single metric representing my organization's ESG performance.

**Acceptance Criteria:**

**Given** `scoringService.ts` implements the scoring algorithm
**When** called for a tenant, node, and period
**Then** it computes a weighted average ESG score using: value normalization (threshold-based, direction-aware) → category scores → pillar scores → overall score

**Given** the scoring strategy is pluggable
**When** the default strategy normalizes values
**Then** it uses threshold bands (excellent/good/fair/poor) with direction (`lower_is_better` vs `higher_is_better`) from the parameter definition

**Given** the `esg_scores` materialized view is defined
**When** refreshed
**Then** it pre-computes scores per (tenant, node, period) for dashboard performance

**Given** a KPI value is written or a threshold is changed
**When** the `score-recompute` job triggers
**Then** the materialized view is refreshed and the new score is available within < 2 seconds of the next dashboard load

**Given** `GET /api/scores` is called
**When** authenticated
**Then** it returns the current ESG score breakdown (overall, per-pillar, per-category) for the selected node and period

---

### Story 6.2: Threshold & Weight Configuration

As a tenant administrator,
I want to configure scoring thresholds and category weights for my organization,
So that the ESG score reflects my industry's benchmarks and strategic priorities.

**Acceptance Criteria:**

**Given** the `/settings/thresholds` page is rendered
**When** I view thresholds
**Then** I see per-parameter threshold bands (excellent/good/fair/poor boundaries) with platform defaults shown

**Given** I update a threshold for a parameter
**When** I save
**Then** a tenant-specific override is created (not modifying platform seed) and audit logged

**Given** `GET /api/config/weights` is called
**When** authenticated
**Then** it returns category and pillar weights (platform defaults merged with tenant overrides)

**Given** `PUT /api/config/weights` is called by an Admin
**When** new weights are submitted (summing to 100% within each level)
**Then** the override is saved and a score-recompute job is triggered

---

### Story 6.3: Peer Benchmarking Engine

As an ESG analyst,
I want my KPI values compared against peer data to see sector medians, quartile positions, and percentile ranks,
So that I understand where my organization stands relative to industry peers.

**Acceptance Criteria:**

**Given** `benchmarkService.ts` exists
**When** called for a set of canonical metrics and a tenant's peer group
**Then** it computes: sector median, Q1/Q2/Q3/Q4 boundaries, and the tenant's percentile rank per metric

**Given** `GET /api/benchmarks` is called with `?canonicalId=X&fiscalYear=2024`
**When** peer data exists
**Then** it returns `{ sectorMedian, q1, q2, q3, q4, tenantValue, percentileRank, peerCount }`

**Given** fewer than 3 peers have data for a metric
**When** benchmarking is computed
**Then** results are flagged as "insufficient peer data" rather than showing misleading statistics

**Given** the `coverage_summary` materialized view exists
**When** refreshed
**Then** it tracks per-framework, per-period: total parameters, parameters with values, parameters verified

---

### Story 6.4: Peer Comparison Visualization (Radar Chart)

As a financial decision-maker,
I want to see a radar chart comparing my organization's ESG metrics against peer averages and sector leaders,
So that I can quickly identify strengths and gaps visually.

**Acceptance Criteria:**

**Given** the `/analytics` page is rendered
**When** the benchmark view is active
**Then** a radar chart displays selected metrics with my organization's values overlaid on peer median/top quartile

**Given** the peer selector component
**When** I choose specific peer companies
**Then** the chart updates to show those peers' data alongside mine

**Given** the chart data
**When** metrics have different units/scales
**Then** values are normalized (0-100) for radar chart display using the scoring threshold bands

**Given** `GET /api/benchmarks` returns data
**When** rendered in the chart
**Then** I can toggle between pillar views (E, S, G) or see all categories combined

---

### Story 6.5: Multi-Dimensional Scaling (MDS) Positioning

As a C-suite executive,
I want to see my company's position on a 2D competitive map relative to all peers,
So that I can understand overall ESG positioning at a glance without analyzing individual metrics.

**Acceptance Criteria:**

**Given** `mdsService.ts` exists
**When** called with the `peer_metrics_unified` view data for a sector
**Then** it performs multi-dimensional scaling to reduce N metrics to 2D coordinates for each company

**Given** `GET /api/benchmarks/mds` is called with `?sector=X&fiscalYear=2024`
**When** sufficient peer data exists (>= 4 peers)
**Then** it returns `[{ peerId, peerName, x, y, isCurrentTenant }]` coordinates

**Given** the MDS scatter plot on `/analytics`
**When** rendered
**Then** my organization is highlighted distinctly, peers are labeled, and axes represent composite ESG dimensions

**Given** MDS computation
**When** a new extraction completes and peer_metrics_unified is refreshed
**Then** MDS coordinates are recomputed on next request (cached via TanStack Query with appropriate staleTime)

---

### Story 6.6: Correlation Analysis

As a sustainability strategist,
I want to see which ESG metrics are correlated within my industry,
So that I can identify which improvements will have compound effects on overall positioning.

**Acceptance Criteria:**

**Given** `correlationService.ts` exists
**When** called with sector data from `peer_metrics_unified`
**Then** it computes pairwise Pearson correlation coefficients across all metrics with sufficient data points

**Given** `GET /api/benchmarks/correlations` is called with `?sector=X`
**When** processed
**Then** it returns a correlation matrix `{ metrics: string[], matrix: number[][] }` filtered to statistically significant correlations

**Given** the correlation matrix visualization on `/analytics`
**When** rendered
**Then** it displays a heatmap with color intensity representing correlation strength (positive = green, negative = red)

**Given** feature selection is applied
**When** metrics have too few data points (< 5 peers reporting)
**Then** they are excluded from the correlation matrix with a note

---

## Epic 7: Goals & Forecasting

**Goal:** Implement goal management with component decomposition, milestone tracking, and linear regression forecasting — enabling organizations to set targets and assess probability of achievement.

**Covers:** FR19, FR20, FR21 | NFR4

**Depends on:** Epic 4 (KPI values provide historical data for regression)

---

### Story 7.1: Goal Management CRUD

As a sustainability director,
I want to create ESG goals with weighted component decomposition and target values,
So that I can formally track organizational commitments with clear accountability.

**Acceptance Criteria:**

**Given** `GET /api/goals` is called
**When** authenticated
**Then** it returns all goals for the current tenant with status, target date, current progress, and component count

**Given** `POST /api/goals` is called
**When** a goal is created with name, target_value, target_date, and linked canonical_metric or param_id
**Then** a `goals` record is created and audit logged

**Given** a goal exists
**When** `POST /api/goals/[goalId]/components` is called
**Then** weighted components are added (each with a sub-target that contributes to the overall goal by weight)

**Given** the `/goals` page is rendered
**When** goals are displayed
**Then** each shows: name, target, current value, % progress (computed from weighted components), and target date

**Given** components have weights
**When** progress is computed
**Then** overall progress = sum of (component_progress × component_weight)

---

### Story 7.2: Milestone Tracking

As a project manager,
I want to define milestones within each goal and track completion,
So that long-term goals have intermediate checkpoints for accountability.

**Acceptance Criteria:**

**Given** a goal exists
**When** I add milestones via the UI
**Then** each milestone has: description, target_date, target_value, and status (pending/achieved/missed)

**Given** the goal detail view
**When** milestones are displayed
**Then** they appear as a timeline with visual indicators for achieved (green), upcoming (gray), and missed (red)

**Given** a KPI value changes
**When** it meets or exceeds a milestone's target_value
**Then** the milestone is automatically marked as achieved (or flagged for manual confirmation based on config)

---

### Story 7.3: Linear Regression Forecasting

As a CFO,
I want to see forecasted trajectories for ESG goals based on historical trends,
So that I can assess probability of meeting our sustainability commitments and justify intervention investments.

**Acceptance Criteria:**

**Given** `forecastService.ts` exists
**When** called with historical KPI values (minimum 3 data points) and a goal target
**Then** it performs linear regression and produces three scenarios: BAU (current trend), moderate intervention (+X%), aggressive intervention (+Y%)

**Given** `GET /api/goals/[goalId]/forecast` is called
**When** sufficient historical data exists
**Then** it returns `{ scenarios: [{ name, slope, intercept, projectedValues, probabilityOfAchievement }] }`

**Given** the forecast chart on `/goals`
**When** rendered
**Then** it shows historical data points + three projected trendlines extending to the target date, with the goal target as a horizontal reference line

**Given** fewer than 3 historical data points
**When** forecasting is requested
**Then** a message indicates "Insufficient data for forecasting" rather than producing unreliable projections

---

## Epic 8: Report Generation

**Goal:** Implement template-based regulatory report generation with coverage tracking and PDF output — enabling tenants to produce compliance-ready BRSR, GRI, ESRS, and IFRS S2 disclosures.

**Covers:** FR25, FR26, FR27 | NFR5, NFR8

**Depends on:** Epic 4 (KPI data), Epic 6 (scoring for report content)

---

### Story 8.1: Report Template Engine

As a developer,
I want a template engine that renders regulatory reports by filling standardized structures with tenant KPI data,
So that report generation is automated and framework-compliant.

**Acceptance Criteria:**

**Given** `reportService.ts` exists
**When** called with a framework (BRSR/GRI/ESRS/IFRS S2), tenant, and period
**Then** it loads the framework template, queries all relevant KPI values, and fills the template sections

**Given** framework templates are defined
**When** a BRSR report is generated
**Then** it follows the 9-principle structure with all required disclosures populated from mapped parameters

**Given** a parameter has no value for the period
**When** the template is rendered
**Then** the field shows "Not Reported" or "Not Applicable" based on the parameter's status

**Given** `POST /api/reports/generate` is called with `{ framework, periodId }`
**When** valid
**Then** a `report-generation` pg-boss job is enqueued and a job ID is returned for progress tracking

---

### Story 8.2: Coverage Tracking & Completeness

As an ESG compliance officer,
I want to see what percentage of required disclosures are complete before generating a report,
So that I can identify data gaps and ensure report quality.

**Acceptance Criteria:**

**Given** the `/reports` page is rendered
**When** I select a framework and period
**Then** I see coverage statistics: total required parameters, entered count, verified count, not-applicable count, and overall % complete

**Given** coverage is computed
**When** broken down by section
**Then** each section (e.g., BRSR Principle 1, 2, ... 9) shows its own completion percentage

**Given** the `coverage_summary` materialized view
**When** refreshed
**Then** it pre-computes coverage per (tenant, framework, period) for fast dashboard access

**Given** coverage is below a configurable threshold (e.g., 80%)
**When** report generation is requested
**Then** a warning is shown (but generation is not blocked)

---

### Story 8.3: PDF Generation & Download

As an ESG analyst,
I want to download a generated report as a PDF file ready for regulatory submission,
So that I can file my compliance disclosures without manual formatting.

**Acceptance Criteria:**

**Given** the `report-generation` job completes
**When** the template is fully rendered
**Then** it generates a PDF and uploads it to Azure Blob Storage under the tenant's container

**Given** `GET /api/reports` is called
**When** reports exist
**Then** it returns a list of generated reports with framework, period, generation date, and download URL

**Given** a report PDF is available
**When** I click "Download"
**Then** a time-limited signed URL is generated from Blob Storage and the PDF is downloaded

**Given** report generation
**When** the job is in progress
**Then** the UI shows a progress indicator (stage: rendering → generating PDF → uploading)

**Given** the performance requirement
**When** a typical BRSR report is generated
**Then** it completes within 30 seconds (async, user doesn't wait on page)

---

## Epic 9: Supply Chain & Knowledge Features

**Goal:** Implement supplier ESG management, Scope 3 tracking, the knowledge base, and AI recommendation engine — completing the platform's intelligence and accountability capabilities.

**Covers:** FR28, FR29, FR30, FR31 | NFR8, NFR9

**Depends on:** Epic 4 (parameter framework for supplier metrics)

---

### Story 9.1: Supplier Management & Scorecards

As a procurement manager,
I want to manage suppliers and track their ESG performance via scorecards,
So that supply chain ESG risk is monitored and actionable.

**Acceptance Criteria:**

**Given** `GET /api/supply-chain/suppliers` is called
**When** authenticated
**Then** it returns all suppliers for the tenant with name, sector, risk score, and assessment status

**Given** `POST /api/supply-chain/suppliers` is called
**When** supplier details are provided (name, sector, contact, category)
**Then** a `suppliers` record is created

**Given** a supplier scorecard is requested
**When** rendered
**Then** it shows ESG scores across predefined assessment criteria with RAG status per criterion

**Given** `PUT /api/supply-chain/suppliers/[supplierId]` is called
**When** assessment data is submitted
**Then** the scorecard is updated and risk score is recomputed

---

### Story 9.2: Scope 3 Category 1 & Supplier Portal

As a sustainability analyst,
I want suppliers to self-report their emissions data through a portal,
So that I can compute Scope 3 Category 1 (purchased goods) emissions without manual data collection.

**Acceptance Criteria:**

**Given** a supplier portal page exists
**When** a supplier accesses their unique portal link
**Then** they see a simplified interface to enter requested ESG metrics (no full platform access)

**Given** a supplier submits data
**When** entered through the portal
**Then** values are stored as `supplier_assessments` linked to the supplier and period, pending tenant verification

**Given** Scope 3 Cat 1 parameters exist in the library
**When** supplier data is aggregated
**Then** the system computes total Scope 3 Cat 1 from all supplier contributions

**Given** the supply chain page
**When** I view Scope 3 data
**Then** I see a breakdown by supplier with contribution percentages

---

### Story 9.3: Knowledge Base

As a department data owner,
I want to access ESG standards reference material and intervention strategies,
So that I understand what metrics mean and how to improve them.

**Acceptance Criteria:**

**Given** the `/knowledge` page is rendered
**When** accessed
**Then** it displays categorized ESG reference content: framework overviews (BRSR, ESRS, GRI), metric definitions, and best-practice intervention strategies

**Given** knowledge base content is static in v1
**When** pages are rendered
**Then** content is organized by framework and topic with search/filter capability

**Given** a user is on the Console and sees an unfamiliar metric
**When** they click a "Learn more" link on a parameter
**Then** they are navigated to the relevant knowledge base entry

---

### Story 9.4: AI Recommendations Engine

As an ESG analyst,
I want AI-generated recommendations for improving ESG performance,
So that I receive actionable, data-driven suggestions without manual analysis of all metrics.

**Acceptance Criteria:**

**Given** `jobs/llmRecommendations.ts` exists
**When** the nightly `llm-recommendations` job runs
**Then** it analyzes the tenant's KPI data, identifies underperforming metrics, and generates improvement recommendations via LLM

**Given** rule-based recommendations are defined
**When** a metric falls below its threshold's "poor" band
**Then** a rule-based alert is generated (no LLM needed) with the metric name, current value, and threshold

**Given** LLM-generated recommendations are produced
**When** displayed on the dashboard alerts panel
**Then** they show: priority level, affected metric, recommendation text, and confidence

**Given** the recommendation job
**When** the LLM is unavailable
**Then** only rule-based recommendations are generated (graceful degradation, no failure)

---

## Epic 10: Executive Dashboard & System Operations

**Goal:** Assemble the executive dashboard, build administrative tools (audit viewer, health monitor, integration config), and implement API sync connectors — delivering the operational layer that ties all features together for daily use.

**Covers:** FR7, FR35, FR36, FR38, FR41, FR42 | NFR4, NFR13

**Depends on:** Epic 6 (scores and benchmarks for dashboard), Epics 4-9 (features to monitor)

---

### Story 10.1: Executive Dashboard Assembly

As a C-suite stakeholder,
I want a single dashboard view showing ESG score, coverage, alerts, and peer comparison,
So that I get a strategic overview without navigating multiple screens.

**Acceptance Criteria:**

**Given** the `/(dashboard)/page.tsx` is rendered
**When** the user has the dashboard role access
**Then** it displays: ScoreOverview (overall + per-pillar), CoverageWidget (per-framework %), AlertsPanel (top recommendations), PeerComparisonMini (percentile rank + trend)

**Given** the ScoreOverview component
**When** rendered
**Then** it shows the current period ESG score (overall, E, S, G) with trend arrows vs. previous period

**Given** the CoverageWidget component
**When** rendered
**Then** it shows a progress bar per active framework with percentage of verified data

**Given** the AlertsPanel component
**When** rendered
**Then** it shows the top 5 highest-priority recommendations (rule-based + AI)

**Given** the PeerComparisonMini component
**When** rendered
**Then** it shows the tenant's percentile rank within their sector with a small sparkline trend

**Given** performance requirements
**When** the dashboard loads
**Then** all data appears within 2 seconds (materialized views + React Query cache)

---

### Story 10.2: Audit Log Viewer

As a compliance auditor,
I want to browse and filter the complete audit trail of all data changes,
So that I can verify data integrity and trace any modification to its source.

**Acceptance Criteria:**

**Given** the `/settings/audit` page is rendered
**When** I access it as an Admin or Analyst
**Then** I see a paginated table of audit log entries (newest first)

**Given** the audit log table
**When** I apply filters (entity_type, user, date range, action)
**Then** results are filtered server-side and returned with pagination

**Given** an audit log entry
**When** I expand it
**Then** I see: full old_value and new_value JSON, user who made the change, exact timestamp, and the entity link

**Given** `GET /api/audit` is called
**When** with filter query parameters
**Then** it returns paginated results respecting RLS (only current tenant's logs)

---

### Story 10.3: System Health Monitoring

As a platform administrator,
I want a health dashboard showing job queue status, API health, and storage usage,
So that I can proactively identify operational issues before they impact users.

**Acceptance Criteria:**

**Given** the `/settings/health` page is rendered
**When** accessed by an Admin
**Then** it shows: pg-boss queue depths (per queue), failed job count, storage usage (Blob Storage), database connection pool status

**Given** `GET /api/health` is called
**When** the system is healthy
**Then** it returns 200 with `{ status: 'healthy', checks: { database: 'ok', blobStorage: 'ok', pgBoss: 'ok' } }`

**Given** a component is unhealthy
**When** the health check fails
**Then** the specific check shows the failure reason and the overall status degrades

**Given** the job queue display
**When** viewed
**Then** it shows per queue: active jobs, completed (24h), failed (24h), and average processing time

---

### Story 10.4: Integration Configuration

As a tenant administrator,
I want to configure external integration settings (API endpoints, sync schedules),
So that automated data sync is set up for my organization's systems.

**Acceptance Criteria:**

**Given** the `/settings/integrations` page is rendered
**When** accessed by an Admin
**Then** it shows available integrations: SAP, Darwinbox, LLM endpoint, with their configuration status

**Given** I configure an integration
**When** I provide API endpoint, authentication details, and sync schedule (cron)
**Then** the configuration is saved to `tenant_config` (credentials via Key Vault reference) and audit logged

**Given** a configured integration
**When** I click "Test Connection"
**Then** the system attempts to connect and reports success/failure without saving data

**Given** `GET /api/config/integrations` is called
**When** authenticated as Admin
**Then** configurations are returned with credentials masked (only last 4 chars shown)

---

### Story 10.5: API Sync Jobs (SAP, Darwinbox)

As a platform,
I want scheduled sync jobs that pull data from configured ERP/HRMS systems,
So that KPI values are automatically updated without manual re-entry.

**Acceptance Criteria:**

**Given** an integration is configured with a cron schedule
**When** the schedule triggers
**Then** a `api-sync` pg-boss job is created for that integration

**Given** the `api-sync` job handler executes
**When** connecting to the external system
**Then** it fetches relevant metrics, maps them to known parameters, and upserts `kpi_values` with `source_type = 'API'`

**Given** sync completes
**When** new values are written
**Then** each is individually audit-logged with `source_ref` pointing to the integration and batch reference

**Given** sync fails
**When** the external system is unreachable or returns errors
**Then** the job retries per policy, and on final failure, logs the error and updates integration status to "sync_failed"

---

### Story 10.6: Placeholder Pages (Materiality, Industry Data)

As a developer,
I want placeholder pages for Materiality Assessment and Industry Data Explorer,
So that the navigation is complete and these features can be implemented when designs are ready.

**Acceptance Criteria:**

**Given** `/materiality/page.tsx` exists
**When** navigated to
**Then** it renders a placeholder with "Materiality Assessment — Coming Soon" and a brief description of planned functionality

**Given** `/industry-data/page.tsx` exists
**When** navigated to
**Then** it renders a placeholder with "Industry Data Explorer — Coming Soon" and a brief description

**Given** both pages
**When** rendered
**Then** they use the standard dashboard layout and are accessible from the sidebar navigation

---

## Implementation Roadmap (Dependency-Safe Sequence)

The following is the **strict implementation order** for a dev agent. Each story can be implemented immediately after its predecessors complete. Stories within the same group can be parallelized if desired.

### Phase 1: Foundation (No Dependencies)
| Order | Story | What it enables |
|---|---|---|
| 1 | 1.1 | Database schema — everything depends on this |
| 2 | 1.2 | RLS policies — security foundation |
| 3 | 1.3 | Auth.js — needed before any protected route |
| 4 | 1.4 | Middleware chain — needed before any API route |
| 5 | 1.5 | Audit service — used by all subsequent write operations |
| 6 | 1.6 | pg-boss — needed before any background job |
| 7 | 1.7 | External clients — needed before extraction/reports |
| 8 | 1.8 | Logging — all subsequent code uses the logger |
| 9 | 1.9 | CI/CD — validates all subsequent PRs |

### Phase 2: Frontend Shell (Depends on Phase 1)
| Order | Story | What it enables |
|---|---|---|
| 10 | 2.1 | UI primitives — all screens use these |
| 11 | 2.2 | Layout shell — dashboard frame for all pages |
| 12 | 2.3 | App Router conversion — URL-based navigation |
| 13 | 2.4 | State management — data fetching for all features |
| 14 | 2.5 | Form infrastructure — all data entry forms |

### Phase 3: Auth & User Management (Depends on Phase 2)
| Order | Story | What it enables |
|---|---|---|
| 15 | 3.1 | Login page — gated access |
| 16 | 3.2 | Onboarding (company + frameworks) — tenant exists |
| 17 | 3.3 | Onboarding (org + fiscal) — nodes and periods exist |
| 18 | 3.4 | User management — team collaboration |

### Phase 4: Core Data (Depends on Phase 3)
| Order | Story | What it enables |
|---|---|---|
| 19 | 4.1 | Parameter seed — library available for all features |
| 20 | 4.2 | Parameters API + UI — configuration capability |
| 21 | 4.3 | KPI Console — primary data entry |
| 22 | 4.4 | Verification workflow — data quality control |
| 23 | 4.5 | Excel import — bulk data loading |
| 24 | 4.6 | Org hierarchy management — structural CRUD |
| 25 | 4.7 | Rollup computation — aggregated views |

### Phase 5: Document Pipeline (Depends on Phase 4)
| Order | Story | What it enables |
|---|---|---|
| 26 | 5.1 | Peer organisations — targets for extraction |
| 27 | 5.2 | Document upload — PDFs stored for processing |
| 28 | 5.3 | Extraction pipeline — raw metrics produced |
| 29 | 5.4 | Mapping layer — structured peer data |
| 30 | 5.5 | Mapping review + alias learning — accuracy improvement |

### Phase 6: Analytics & Scoring (Depends on Phases 4 + 5)
| Order | Story | What it enables |
|---|---|---|
| 31 | 6.1 | Scoring engine + MVs — ESG scores available |
| 32 | 6.2 | Threshold/weight config — scoring customization |
| 33 | 6.3 | Peer benchmarking — comparative data |
| 34 | 6.4 | Radar chart — visual comparison |
| 35 | 6.5 | MDS positioning — competitive map |
| 36 | 6.6 | Correlation analysis — strategic insight |

### Phase 7: Goals & Reports (Depends on Phases 4 + 6)
| Order | Story | What it enables |
|---|---|---|
| 37 | 7.1 | Goal management — target setting |
| 38 | 7.2 | Milestone tracking — intermediate checkpoints |
| 39 | 7.3 | Forecasting — probability assessment |
| 40 | 8.1 | Report template engine — automated reports |
| 41 | 8.2 | Coverage tracking — completeness visibility |
| 42 | 8.3 | PDF generation — downloadable output |

### Phase 8: Supply Chain & Knowledge (Depends on Phase 4)
| Order | Story | What it enables |
|---|---|---|
| 43 | 9.1 | Supplier management — supply chain tracking |
| 44 | 9.2 | Scope 3 + portal — emissions data collection |
| 45 | 9.3 | Knowledge base — reference content |
| 46 | 9.4 | AI recommendations — automated insights |

### Phase 9: Dashboard & Operations (Depends on Phase 6)
| Order | Story | What it enables |
|---|---|---|
| 47 | 10.1 | Executive dashboard — strategic overview |
| 48 | 10.2 | Audit log viewer — compliance interface |
| 49 | 10.3 | System health — operational monitoring |
| 50 | 10.4 | Integration config — sync setup |
| 51 | 10.5 | API sync jobs — automated data pull |
| 52 | 10.6 | Placeholder pages — navigation completeness |

---

**Note:** Phases 7 and 8 can run in parallel (both depend on Phase 4; Phase 7 also needs Phase 6). Phase 9 depends on Phase 6 being complete.
