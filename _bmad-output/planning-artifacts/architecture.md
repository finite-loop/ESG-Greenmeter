---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-05-04'
inputDocuments:
  - GreenMeter_AI_Requirements_v1.md
  - _bmad-output/planning-artifacts/product-brief.md
  - _bmad-output/planning-artifacts/storage-schema-design.md
  - _bmad-output/planning-artifacts/decisions-log.md
workflowType: 'architecture'
project_name: 'ESG_ReportingV2'
user_name: 'GYFL'
date: '2026-05-04'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

| Category | Count | Key Items |
|---|---|---|
| Data Management | 12+ | KPI CRUD, verification workflow, Excel import, API sync, manual entry, rollup computation |
| Document Processing | 6+ | PDF ingestion, OCR, LLM extraction, metric mapping, confidence scoring, human review queue |
| Analytics & Intelligence | 10+ | ESG scoring, peer benchmarking, MDS positioning, correlation analysis, forecasting, AI recommendations |
| Reporting | 5+ | Template-based generation (BRSR/GRI/ESRS/IFRS), PDF/XBRL output, coverage tracking, section completion |
| Administration | 8+ | User management, parameter library, threshold config, integration config, org hierarchy, audit logs, system health |
| Supply Chain | 4+ | Supplier scorecards, Scope 3 Cat 1, survey portal, risk scoring |

**Non-Functional Requirements:**

| NFR | Requirement | Architectural Impact |
|---|---|---|
| Multi-tenancy | Single instance, strict RLS | PostgreSQL RLS policies on every table; session-level tenant_id |
| Data integrity | Immutable audit log, no data loss | Append-only audit table, write-once privileges, JSONB old/new values |
| Security | OAuth, encrypted credentials, RBAC | Auth middleware, role-based route guards, encrypted credential storage |
| Performance | Dashboard < 2s, report gen < 30s | Materialized views for scoring, async report generation, caching strategy |
| Scalability | Multi-tenant, growing peer corpus | Connection pooling, index strategy on tenant_id, blob storage for documents |
| Compliance | SEBI, CSRD, ISSB regulatory standards | Framework-aware parameter seeding, report template compliance |
| Extensibility | Pluggable scoring, configurable LLM | Strategy pattern for scoring, abstract LLM interface, config-driven behavior |
| Auditability | Every data change tracked | Database triggers or application-level middleware for audit_logs |

**Scale & Complexity:**

- Primary domain: Full-stack web + async data pipeline + analytics engine
- Complexity level: Enterprise
- Estimated architectural components: 15-20 distinct services/modules
- Data entities: 20+ tables
- API endpoints: 60-80 estimated
- External integrations: 4+ (Document Intelligence, LLM, SAP, Darwinbox)

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|---|---|---|
| Next.js 16 (fullstack) | User decision (D3) | API routes co-located with frontend; server actions available; no separate backend service |
| Azure deployment | User decision (D10) | App Service, PostgreSQL Flexible Server, Blob Storage, Document Intelligence |
| PostgreSQL with RLS | Requirements spec | Row-level security policies; session config for tenant isolation |
| Node.js runtime only | Environment (no Python) | Analytics computations (MDS, regression, correlation) must use Node.js libraries |
| Existing UI prototype | greenmeter/ codebase | 10 screens already built with Chart.js + Radix UI + Tailwind 4; must integrate, not rewrite |
| Free-text extraction | User decision (D15) | Fuzzy mapping layer required post-extraction; alias table grows over time |
| OAuth | User decision (D2) | Auth provider needed (NextAuth.js / Azure AD B2C / Auth0) |
| Enterprise LLM | User decision (D4) | Configurable endpoint (paid API or localhost); must abstract provider |

### Cross-Cutting Concerns Identified

1. **Multi-tenancy isolation** — affects every table, every query, every API route. Must be systematic, not per-endpoint.
2. **Audit trail generation** — every write to kpi_values, goals, config, users creates an audit_logs entry. Must be automatic, not manually coded per operation.
3. **Configuration resolution** — platform_seed → tenant_override pattern repeats across scoring weights, thresholds, display preferences. Needs a reusable resolver.
4. **Score/coverage recomputation** — triggered by KPI value changes, threshold changes, weight changes. Needs event-driven invalidation.
5. **Currency normalization** — applies at rollup boundaries when child nodes have different currencies. Must be consistent across all rollup computations.
6. **File storage lifecycle** — uploaded PDFs, generated reports, Excel templates. Blob storage with tenant-scoped access.
7. **Background job processing** — document extraction, API sync, LLM recommendations, report generation. All long-running, all need progress tracking.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack Next.js 16 web application with async data pipeline + analytics engine.
Project already initialized — evaluating additions to existing foundation.

### Existing Foundation (greenmeter/)

The project already provides:
- **Runtime:** Next.js 16.2.4, React 19.2.4, TypeScript 5.x (strict)
- **Styling:** Tailwind CSS 4 + custom CSS design system
- **UI:** Radix UI primitives + Lucide icons + Chart.js
- **Build:** Next.js built-in (Turbopack dev, Webpack prod)
- **Structure:** App Router, single-page pattern in AppShell.tsx

### Additions Needed — Evaluation

#### 1. ORM: Drizzle ORM (Selected)

| Factor | Drizzle | Prisma |
|---|---|---|
| Bundle size | ~35KB | ~500KB+ |
| SQL control | SQL-like TypeScript API — stays close to raw SQL | Abstracted query language |
| RLS compatibility | Better — can set session vars, use raw SQL for RLS | Possible but requires workarounds |
| Complex queries (percentiles, rollups) | Native SQL expressions | Requires $queryRaw for advanced |
| Migration workflow | Code-first, drizzle-kit push/generate | Schema-first, prisma migrate |
| Edge/serverless | Smaller cold start | Larger cold start |

**Rationale:** This project has complex PostgreSQL features (RLS, SKIP LOCKED for pg-boss, percentile_cont, array operations, JSONB). Drizzle keeps us close to SQL while providing full type safety. The smaller bundle matters for Azure App Service cold starts.

#### 2. Auth: Auth.js v5 (Selected)

**Rationale:** Native Next.js 16 integration, built-in Azure AD provider, automatic environment variable inference (AUTH_AZURE_AD_*), and established ecosystem. Supports the OAuth requirement with minimal configuration.

**Setup:** `auth.config.ts` + `/app/api/auth/[...nextauth]/route.ts` + middleware for session checking.

#### 3. Background Jobs: pg-boss (Selected)

**Rationale:** Already using PostgreSQL — no need to introduce Redis infrastructure. pg-boss uses PostgreSQL's SKIP LOCKED for reliable job processing. Covers all async needs:
- Document extraction pipeline (multi-stage)
- API sync (scheduled cron)
- LLM recommendation generation (nightly)
- Report generation (on-demand, long-running)
- Score recomputation (event-triggered)

**Trade-off:** BullMQ is more feature-rich (rate limiting, priority queues) but requires Redis. For our scale, pg-boss is sufficient and simplifies Azure deployment.

#### 4. API Pattern: Next.js API Routes (REST) (Selected)

**Rationale:** With 60-80 endpoints, complex middleware chains (auth, tenant context, audit logging), and external consumers (supplier portal, integration webhooks), REST API routes are the pragmatic choice.
- Server Actions for simple client-side mutations where appropriate
- API routes for everything else (CRUD operations, external integrations, background job triggers)
- Service layer pattern: route handler → service → repository → database

**Why not tRPC:** Adds indirection without benefit when we also need REST for external integrations and webhooks. Type safety achieved via shared TypeScript types between client and server in the same monorepo.

#### 5. Testing: Vitest + Playwright (Selected)

- **Vitest** — Unit and integration tests. Faster than Jest, native ESM, compatible with Next.js 16.
- **Playwright** — E2E tests for critical flows (onboarding, data entry, report generation).
- **No Storybook in v1** — component extraction is incremental; Storybook adds overhead before components stabilize.

### Selected Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.2.4 |
| Language | TypeScript | 5.x (strict) |
| UI | React 19 + Radix UI + Chart.js | Current |
| Styling | Tailwind CSS 4 | Current |
| ORM | Drizzle ORM | Latest |
| Database | PostgreSQL (Azure Flexible Server) | 16 |
| Auth | Auth.js v5 | Latest |
| Background Jobs | pg-boss | Latest |
| File Storage | Azure Blob Storage | — |
| Document Processing | Azure Document Intelligence | — |
| LLM | Configurable (Azure OpenAI / self-hosted) | — |
| Unit Tests | Vitest | Latest |
| E2E Tests | Playwright | Latest |
| Deployment | Azure App Service | — |

**Note:** Project initialization is NOT needed — project exists. First implementation step is adding these dependencies and configuring the backend layer.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data validation: Zod (with drizzle-zod integration)
- RBAC enforcement: Middleware chain (auth → tenant → role → handler)
- Tenant isolation: Session-based tenant_id → PostgreSQL RLS
- State management: TanStack Query (server state) + Zustand (UI state)
- Routing: Convert to Next.js App Router file-based routes

**Important Decisions (Shape Architecture):**
- Caching: Materialized views (server) + React Query (client), no Redis
- Connection pooling: Azure PgBouncer (built-in)
- Credential storage: Azure Key Vault for secrets
- CI/CD: GitHub Actions → Azure App Service
- Monitoring: Azure Application Insights

**Deferred Decisions (Post-MVP):**
- CDN/edge caching for static assets
- Horizontal scaling (multiple App Service instances)
- Database read replicas
- WebSocket for real-time notifications (v2)

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| ORM | Drizzle ORM | SQL-like API, small bundle, RLS-compatible, drizzle-zod integration |
| Validation | Zod + drizzle-zod | Single schema definition serves DB types + API validation + form validation |
| Caching (server) | Materialized views + LRU in-memory | No Redis dependency; MVs for expensive computations (scores, benchmarks); LRU for config resolution |
| Caching (client) | TanStack Query | Automatic refetching, cache invalidation, optimistic updates, stale-while-revalidate |
| Connection pooling | Azure PgBouncer (built-in) | No external pooler needed; enabled at Azure Flexible Server level |
| Migrations | drizzle-kit generate + push | Code-first migrations; version-controlled SQL files for production deploys |

**Data flow pattern:**
```
Client (React Query cache)
  ↔ API Route (Zod validation)
    → Service Layer (business logic)
      → Repository (Drizzle queries)
        → PostgreSQL (RLS enforced)
```

**Materialized views (refreshed on data change):**
- `esg_scores` — per node, per period (refresh on kpi_value write or threshold change)
- `peer_metrics_unified` — combined mapped + unmapped peer data (refresh on extraction completion)
- `coverage_summary` — per framework, per period (refresh on kpi_value verification)

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Auth provider | Auth.js v5 + Azure AD | Native Next.js 16 integration; built-in Azure AD provider; OAuth requirement met |
| Session strategy | JWT (stateless) | No session store needed; tenant_id + role embedded in token |
| RBAC enforcement | Middleware chain | Systematic: auth → tenant → role → handler. Not per-route ad-hoc checks. |
| Tenant isolation | PostgreSQL RLS via session var | `SET app.current_tenant_id` at connection time; RLS policies enforce at DB level |
| Credential storage | Azure Key Vault | Integration credentials (SAP, Darwinbox, LLM API keys) stored encrypted; never in env vars |
| API security | Rate limiting (per-tenant) + CORS whitelist | Prevent abuse; tenant-scoped limits on document processing and API calls |

**Middleware chain (executed in order on every API request):**
```
1. Auth middleware     → Verify JWT, extract session { userId, tenantId, role }
2. Tenant middleware   → Set PostgreSQL session variable for RLS
3. Role guard          → Check role permission against route's required role
4. Audit middleware    → Log request metadata for write operations
5. Route handler       → Execute business logic
```

**Role permissions matrix:**

| Route Category | Admin | Analyst | Department | Viewer |
|---|---|---|---|---|
| KPI read | ✓ | ✓ | Own dept | ✓ |
| KPI write | ✓ | ✓ | Own dept | ✗ |
| KPI verify | ✓ | ✓ | Own dept | ✗ |
| Settings | ✓ | Read-only | ✗ | ✗ |
| User management | ✓ | ✗ | ✗ | ✗ |
| Report generation | ✓ | ✓ | ✗ | ✗ |
| Document upload | ✓ | ✓ | ✗ | ✗ |
| Goal management | ✓ | ✓ | ✗ | Read-only |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| API style | REST (Next.js API routes) | 60-80 endpoints; external consumers (supplier portal, webhooks); middleware chains |
| Request validation | Zod schemas per route | Type-safe, composable, auto-generated from Drizzle schema where applicable |
| Error handling | Structured error responses | `{ error: { code, message, details? } }` with HTTP status codes |
| API versioning | None in v1 | Single consumer (own frontend); versioning adds complexity before product-market fit |
| Background communication | pg-boss queues | Job types: extraction, sync, recommendations, reports, score-recompute |
| Client ↔ Server mutations | Server Actions for forms; fetch for complex operations | Server Actions for simple CRUD; API routes when middleware chain is needed |

**Error response standard:**
```typescript
// Success
{ data: T, meta?: { page, total, ... } }

// Error
{ error: { code: string, message: string, details?: Record<string, string[]> } }

// Codes: AUTH_REQUIRED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR,
//        TENANT_MISMATCH, RATE_LIMITED, PROCESSING_ERROR
```

**Background job types:**
| Queue | Priority | Concurrency | Retry |
|---|---|---|---|
| extraction-pipeline | normal | 2 per tenant | 3 retries, exponential backoff |
| api-sync | low | 1 per integration | 3 retries |
| llm-recommendations | low | 1 global | 1 retry |
| report-generation | normal | 2 per tenant | 2 retries |
| score-recompute | high | 5 global | immediate retry |
| metric-mapping | normal | 3 global | 3 retries |

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Server state | TanStack Query v5 | Cache, refetch, optimistic updates, mutation invalidation |
| Client state | Zustand | Lightweight; sidebar state, active filters, modal state, command palette |
| Routing | Next.js App Router (file-based) | Replace AppShell state switching; enables code splitting, layouts, loading states |
| Data fetching | Server Components (initial) + React Query (interactive) | SSR for first paint; client-side for mutations and real-time updates |
| Forms | React Hook Form + Zod resolver | Type-safe forms with same Zod schemas used in API validation |
| Bundle optimization | Next.js built-in code splitting per route | Each screen lazy-loaded; Chart.js dynamically imported |

**Route structure:**
```
/app
├── (auth)/
│   ├── login/page.tsx
│   └── onboarding/page.tsx
├── (dashboard)/
│   ├── layout.tsx              ← Sidebar + TopBar + RollupBar
│   ├── page.tsx                ← Dashboard (default)
│   ├── console/page.tsx
│   ├── rollup/page.tsx
│   ├── analytics/page.tsx
│   ├── goals/page.tsx
│   ├── reports/page.tsx
│   ├── supply-chain/page.tsx
│   ├── knowledge/page.tsx
│   └── settings/
│       ├── page.tsx            ← Settings overview
│       ├── users/page.tsx
│       ├── parameters/page.tsx
│       ├── integrations/page.tsx
│       ├── documents/page.tsx
│       ├── audit/page.tsx
│       └── health/page.tsx
└── api/
    ├── auth/[...nextauth]/route.ts
    ├── kpi/route.ts
    ├── kpi/[paramId]/route.ts
    ├── peers/route.ts
    ├── extraction/route.ts
    ├── goals/route.ts
    ├── reports/route.ts
    ├── scores/route.ts
    └── ...
```

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | Azure App Service (Linux, Node.js 22) | Managed, autoscale, deployment slots, built-in SSL |
| Database | Azure PostgreSQL Flexible Server (v16) | Managed, PgBouncer built-in, automated backups, RLS support |
| File storage | Azure Blob Storage | PDFs, generated reports, Excel templates; tenant-scoped containers |
| Document AI | Azure Document Intelligence | OCR + layout extraction from BRSR/ESG PDFs |
| CI/CD | GitHub Actions | Build → Test → Deploy to staging → Manual promote to prod |
| Environments | dev (local) → staging → production | Staging shares schema, separate data; prod isolated |
| Monitoring | Azure Application Insights | APM, request tracing, error tracking, custom metrics |
| Logging | Structured JSON → Application Insights | Correlation IDs per request; tenant_id in every log entry |
| Secrets | Azure Key Vault | Integration credentials, LLM API keys, DB connection strings |
| DNS/SSL | Azure App Service managed SSL | Custom domain with auto-renewed certificates |

**Deployment pipeline:**
```
Push to main
  → GitHub Actions: lint + typecheck + vitest
  → Build Next.js (standalone output)
  → Deploy to staging slot
  → Run Playwright E2E against staging
  → Manual approval gate
  → Swap staging → production
```

**Database migration strategy:**
```
drizzle-kit generate → SQL migration files (version controlled)
  → CI runs migrations against staging DB
  → On prod deploy: migrations run before app starts (via startup script)
  → Rollback: reverse migration file (manual, tested in staging first)
```

### Decision Impact Analysis

**Implementation Sequence (dependencies flow downward):**
1. Database schema + Drizzle setup + RLS policies
2. Auth.js v5 + Azure AD configuration
3. Middleware chain (auth → tenant → role → audit)
4. Core API routes (KPI CRUD, parameters, org hierarchy)
5. pg-boss setup + extraction pipeline jobs
6. Frontend routing conversion + TanStack Query integration
7. Advanced features (scoring engine, benchmarking, forecasting)

**Cross-Component Dependencies:**
- Auth.js session → Tenant middleware → RLS → All queries (foundational; must be first)
- Drizzle schema → Zod schemas (drizzle-zod) → API validation + form validation (schema is source of truth)
- pg-boss → extraction pipeline → mapping layer → peer_kpi_values (sequential pipeline)
- TanStack Query cache keys → API route structure → must be stable before frontend integration
- Materialized views → score recomputation triggers → depends on kpi_values write path being complete

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

26 areas where AI agents could make different choices, resolved below.

### Naming Patterns

**Database Naming Conventions:**

| Element | Convention | Example |
|---|---|---|
| Tables | snake_case, plural | `kpi_parameters`, `peer_kpi_values`, `raw_extractions` |
| Columns | snake_case | `tenant_id`, `canonical_name`, `mapping_confidence` |
| Primary keys | `{singular}_id` | `param_id`, `extraction_id`, `value_id` |
| Foreign keys | Match referenced column name | `tenant_id`, `param_id`, `peer_id` |
| Indexes | `idx_{table}_{columns}` | `idx_kpi_values_tenant_param_period` |
| Unique constraints | `uq_{table}_{columns}` | `uq_kpi_parameters_tenant_standard_code` |
| Enums | Stored as TEXT with CHECK or application-level validation | `'BRSR' \| 'ESRS' \| 'GRI' \| 'IFRS_S2'` |
| Boolean columns | Positive phrasing | `verified`, `active`, `not_applicable` (not `is_verified`) |
| Timestamps | `{action}_at` | `created_at`, `verified_at`, `mapped_at` |

**API Naming Conventions:**

| Element | Convention | Example |
|---|---|---|
| Route paths | kebab-case, plural nouns | `/api/kpi-values`, `/api/peer-organisations` |
| Route parameters | camelCase | `/api/kpi-values/[paramId]` |
| Query parameters | camelCase | `?fiscalYear=2024&standard=BRSR` |
| Request body fields | camelCase | `{ tenantId, paramId, value }` |
| Response body fields | camelCase | `{ paramId, canonicalName, mappingConfidence }` |
| Action routes | verb prefix | `/api/extraction/trigger`, `/api/scores/recompute` |
| Nested resources | max 2 levels | `/api/peers/[peerId]/values` |

**Code Naming Conventions:**

| Element | Convention | Example |
|---|---|---|
| React components | PascalCase | `KpiConsole`, `PeerBenchmark`, `GoalTracker` |
| Component files | PascalCase.tsx | `KpiConsole.tsx`, `ScoreCard.tsx` |
| Utility files | camelCase.ts | `formatCurrency.ts`, `computeScore.ts` |
| Hooks | use- prefix, camelCase | `useKpiValues`, `usePeerData`, `useTenantConfig` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE`, `MAPPING_CONFIDENCE_THRESHOLD` |
| TypeScript types/interfaces | PascalCase, no `I` prefix | `KpiParameter`, `ExtractionResult`, `TenantConfig` |
| Zod schemas | camelCase + Schema suffix | `kpiValueSchema`, `extractionPayloadSchema` |
| Drizzle tables | camelCase variable, snake_case SQL | `export const kpiParameters = pgTable('kpi_parameters', ...)` |
| Service functions | verb + noun | `createKpiValue`, `mapExtractedMetric`, `computeEsgScore` |
| Repository functions | CRUD verbs | `findByTenantAndPeriod`, `insertKpiValue`, `updateMapping` |

### Structure Patterns

**Project Organization:**

| Concern | Pattern | Rationale |
|---|---|---|
| Tests | Co-located `*.test.ts` for unit; `/tests/e2e/` for E2E | Unit tests close to code; E2E tests are cross-cutting |
| Components | By feature (screen), shared in `/components/ui/` | Feature cohesion over technical categorization |
| Services | One file per domain | `kpiService.ts`, `extractionService.ts`, `scoringService.ts` |
| Repositories | One file per table/domain | `kpiRepository.ts`, `peerRepository.ts` |
| Types | Co-located where used; shared in `/types/` | Avoid circular imports; centralize cross-cutting types |

**File Structure Patterns:**

| File Type | Location | Naming |
|---|---|---|
| API routes | `/src/app/api/{resource}/route.ts` | Next.js convention |
| Page components | `/src/app/(dashboard)/{screen}/page.tsx` | Next.js App Router |
| Shared UI components | `/src/components/ui/` | Reusable, domain-agnostic |
| Feature components | `/src/components/{feature}/` | Screen-specific compositions |
| Database schema | `/src/db/schema/` | One file per domain: `kpi.ts`, `extraction.ts`, `auth.ts` |
| Service layer | `/src/services/` | Business logic |
| Repository layer | `/src/db/repositories/` | Data access |
| Middleware | `/src/middleware/` | Auth, tenant, audit |
| Config | `/src/config/` | Environment, constants, feature flags |
| Zod schemas | `/src/schemas/` | Shared validation schemas |

### Format Patterns

**API Response Formats:**

```typescript
// Success (single item)
{ data: T }

// Success (list with pagination)
{ data: T[], meta: { page: number, pageSize: number, total: number } }

// Error
{ error: { code: string, message: string, details?: Record<string, string[]> } }

// HTTP Status Codes Used:
// 200 - OK (read, update)
// 201 - Created (insert)
// 204 - No Content (delete)
// 400 - Validation Error (VALIDATION_ERROR)
// 401 - Unauthorized (AUTH_REQUIRED)
// 403 - Forbidden (FORBIDDEN)
// 404 - Not Found (NOT_FOUND)
// 409 - Conflict (DUPLICATE_ENTRY)
// 429 - Rate Limited (RATE_LIMITED)
// 500 - Internal Error (PROCESSING_ERROR)
```

**Data Exchange Formats:**

| Format | Convention | Example |
|---|---|---|
| Dates in JSON | ISO 8601 string | `"2024-03-15T10:30:00Z"` |
| Dates in DB | TIMESTAMPTZ | PostgreSQL native |
| Money/numeric | Number (not string) | `1234.56` |
| Percentages | Decimal (0-100) | `85.5` (not `0.855`) |
| Null handling | Explicit `null` in JSON, not omitted | `{ "verifiedAt": null }` |
| Arrays | Always return `[]`, never `null` | `{ "depts": [] }` |
| Enums in JSON | String literals (camelCase) | `"lowerIsBetter"`, `"pending"` |
| IDs | UUID v4 strings | `"550e8400-e29b-41d4-a716-446655440000"` |

### Communication Patterns

**Background Job Patterns:**

| Element | Convention | Example |
|---|---|---|
| Queue names | kebab-case, domain-prefixed | `extraction-pipeline`, `score-recompute` |
| Job data payload | camelCase fields, minimal (IDs + params) | `{ tenantId, extractionId, standard }` |
| Job result | `{ success: boolean, result?: T, error?: string }` | Standard result wrapper |
| Progress events | `{ stage: string, progress: number, message: string }` | For UI progress tracking |

**State Management Patterns (Zustand):**

```typescript
// Store naming: use{Domain}Store
export const useFilterStore = create<FilterState>((set) => ({
  // State fields: plain values
  activePeriod: null,
  selectedStandard: 'BRSR',

  // Actions: set- prefix for setters, verb for operations
  setActivePeriod: (period) => set({ activePeriod: period }),
  resetFilters: () => set({ activePeriod: null, selectedStandard: 'BRSR' }),
}))
```

**TanStack Query Patterns:**

```typescript
// Query key convention: [domain, ...params]
queryKey: ['kpi-values', { tenantId, periodId, standard }]
queryKey: ['peer-benchmarks', { peerId, canonicalId }]
queryKey: ['esg-scores', { nodeId, periodId }]

// Mutation invalidation: invalidate parent list on create/update/delete
onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpi-values'] })
```

### Process Patterns

**Multi-Tenancy Enforcement:**

Every API route handler MUST:
1. Extract `tenantId` from session (never from request body)
2. Set PostgreSQL session variable: `SET app.current_tenant_id = '{tenantId}'`
3. All subsequent queries automatically filtered by RLS
4. Log `tenantId` in every structured log entry

```typescript
// Middleware pattern — applied to all /api/ routes
export async function tenantMiddleware(req: NextRequest) {
  const session = await getSession(req)
  // tenantId comes from JWT, never from request
  const tenantId = session.user.tenantId
  // DB connection sets session variable for RLS
  await db.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
}
```

**Audit Logging:**

Every write operation (POST, PUT, PATCH, DELETE) MUST:
1. Capture `old_value` (for updates/deletes) as JSONB
2. Capture `new_value` (for creates/updates) as JSONB
3. Record `user_id`, `tenant_id`, `action`, `entity_type`, `entity_id`, `timestamp`
4. Audit log writes are append-only; never updateable

**Configuration Resolution:**

Config values resolve in order: `platform_seed → tenant_override → user_preference`

```typescript
// Pattern: resolve config cascading
function resolveConfig<T>(key: string, tenantId: string): T {
  const platformDefault = getPlatformConfig(key)
  const tenantOverride = getTenantConfig(key, tenantId)
  return tenantOverride ?? platformDefault
}
// Used for: scoring weights, thresholds, display prefs, mapping confidence cutoffs
```

**Error Handling:**

```typescript
// Service layer: throw typed errors
class AppError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: Record<string, string[]>) {
    super(message)
  }
}

// API route: catch and format
try {
  const result = await service.doThing(input)
  return NextResponse.json({ data: result })
} catch (e) {
  if (e instanceof AppError) {
    return NextResponse.json({ error: { code: e.code, message: e.message, details: e.details } }, { status: e.status })
  }
  // Unexpected errors: log full stack, return generic message
  logger.error('Unhandled error', { error: e, requestId })
  return NextResponse.json({ error: { code: 'PROCESSING_ERROR', message: 'An unexpected error occurred' } }, { status: 500 })
}
```

### Anti-Patterns (Explicitly Forbidden)

| Anti-Pattern | Correct Approach |
|---|---|
| Passing `tenantId` in request body | Always extract from session JWT |
| Raw SQL without parameterization | Always use Drizzle parameterized queries |
| Storing secrets in `.env` files in production | Use Azure Key Vault |
| `any` type in TypeScript | Define proper types; use `unknown` + narrowing if needed |
| Catching errors silently (empty catch) | Always log or re-throw |
| Direct DB access in route handlers | Route → Service → Repository → DB |
| Mixing UI state and server state | Zustand for UI only; TanStack Query for server state |
| Hardcoding tenant-specific values | Use configuration resolution pattern |
| Skipping audit log for "minor" writes | ALL writes to business entities are logged |
| Using `console.log` in production code | Use structured logger with correlation IDs |

## Project Structure & Boundaries

### Complete Project Directory Structure

```
greenmeter/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + typecheck + vitest on PR
│       └── deploy.yml                      # Build → staging → E2E → prod swap
├── .env.example                            # Template with all required env vars
├── .env.local                              # Local dev overrides (git-ignored)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── drizzle.config.ts
├── package.json
├── package-lock.json
│
├── drizzle/
│   └── migrations/                         # Generated SQL migration files (version controlled)
│       ├── 0001_initial_schema.sql
│       └── meta/
│
├── public/
│   ├── fonts/
│   │   └── DMSans/
│   └── assets/
│       ├── logos/
│       └── icons/
│
├── seed_data/
│   ├── BRSR_Seed_Data.xlsx
│   ├── ESRS_Seed_Data.xlsx
│   ├── GRI_Seed_Data.xlsx
│   └── seed.ts                             # Seed script: parse Excel → insert into DB
│
├── scripts/
│   ├── migrate.ts                          # Run drizzle migrations
│   ├── seed-parameters.ts                  # Seed kpi_parameters from Excel
│   ├── seed-canonical-metrics.ts           # Seed canonical_metrics cross-ref
│   └── setup-rls.ts                        # Apply RLS policies post-migration
│
├── src/
│   ├── app/
│   │   ├── globals.css                     # Tailwind directives + design system tokens
│   │   ├── layout.tsx                      # Root layout (providers, fonts)
│   │   │
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                  # Auth layout (centered, no sidebar)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── onboarding/
│   │   │       ├── page.tsx                # Onboarding wizard entry
│   │   │       └── steps/
│   │   │           ├── CompanyProfile.tsx
│   │   │           ├── FrameworkSelection.tsx
│   │   │           ├── OrgHierarchy.tsx
│   │   │           └── FiscalYearSetup.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                  # Sidebar + TopBar + RollupBar
│   │   │   ├── page.tsx                    # Dashboard (home)
│   │   │   ├── console/
│   │   │   │   └── page.tsx               # KPI Console
│   │   │   ├── rollup/
│   │   │   │   └── page.tsx               # Org hierarchy rollup view
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx               # Benchmarking + MDS + Correlation
│   │   │   ├── goals/
│   │   │   │   └── page.tsx               # Goal management + forecasting
│   │   │   ├── reports/
│   │   │   │   └── page.tsx               # Report generation
│   │   │   ├── supply-chain/
│   │   │   │   └── page.tsx               # Supplier scorecards + Scope 3
│   │   │   ├── knowledge/
│   │   │   │   └── page.tsx               # ESG knowledge base
│   │   │   ├── materiality/
│   │   │   │   └── page.tsx               # Materiality assessment
│   │   │   ├── industry-data/
│   │   │   │   └── page.tsx               # Industry data explorer
│   │   │   └── settings/
│   │   │       ├── page.tsx               # Settings overview
│   │   │       ├── users/page.tsx
│   │   │       ├── parameters/page.tsx
│   │   │       ├── integrations/page.tsx
│   │   │       ├── documents/page.tsx      # Document processing + mapping review
│   │   │       ├── thresholds/page.tsx
│   │   │       ├── audit/page.tsx
│   │   │       └── health/page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts               # Auth.js v5 handler
│   │       ├── kpi/
│   │       │   ├── route.ts               # GET list, POST create
│   │       │   ├── [valueId]/route.ts     # GET, PUT, DELETE single value
│   │       │   ├── import/route.ts        # POST Excel import
│   │       │   └── verify/route.ts        # POST batch verify
│   │       ├── parameters/
│   │       │   ├── route.ts               # GET list (filterable by standard)
│   │       │   └── [paramId]/route.ts     # GET, PUT single param
│   │       ├── peers/
│   │       │   ├── route.ts               # GET list, POST create peer org
│   │       │   ├── [peerId]/route.ts      # GET, PUT, DELETE
│   │       │   └── [peerId]/values/route.ts  # GET peer KPI values
│   │       ├── extraction/
│   │       │   ├── route.ts               # GET extractions list
│   │       │   ├── trigger/route.ts       # POST trigger extraction job
│   │       │   ├── [extractionId]/route.ts     # GET extraction detail
│   │       │   └── [extractionId]/mappings/route.ts  # GET/PUT mapping review
│   │       ├── scores/
│   │       │   ├── route.ts               # GET current scores
│   │       │   └── recompute/route.ts     # POST trigger recompute
│   │       ├── benchmarks/
│   │       │   ├── route.ts               # GET benchmark data (percentiles, quartiles)
│   │       │   ├── mds/route.ts           # GET MDS positioning data
│   │       │   └── correlations/route.ts  # GET correlation matrix
│   │       ├── goals/
│   │       │   ├── route.ts               # GET list, POST create
│   │       │   ├── [goalId]/route.ts      # GET, PUT, DELETE
│   │       │   └── [goalId]/forecast/route.ts  # GET forecast scenarios
│   │       ├── reports/
│   │       │   ├── route.ts               # GET generated reports
│   │       │   └── generate/route.ts      # POST trigger report generation
│   │       ├── org-hierarchy/
│   │       │   ├── route.ts               # GET tree, POST create node
│   │       │   └── [nodeId]/route.ts      # GET, PUT, DELETE node
│   │       ├── supply-chain/
│   │       │   ├── suppliers/route.ts     # GET list, POST create
│   │       │   └── suppliers/[supplierId]/route.ts
│   │       ├── users/
│   │       │   ├── route.ts               # GET list, POST invite
│   │       │   └── [userId]/route.ts      # GET, PUT, DELETE
│   │       ├── config/
│   │       │   ├── thresholds/route.ts    # GET/PUT scoring thresholds
│   │       │   └── weights/route.ts       # GET/PUT category weights
│   │       ├── audit/
│   │       │   └── route.ts               # GET audit logs (filterable)
│   │       └── health/
│   │           └── route.ts               # GET system health status
│   │
│   ├── components/
│   │   ├── ui/                            # Shared, domain-agnostic UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── DropdownMenu.tsx
│   │   │   └── index.ts                   # Barrel export
│   │   ├── charts/                        # Chart.js wrapper components
│   │   │   ├── RadarChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── LineChart.tsx
│   │   │   ├── DoughnutChart.tsx
│   │   │   └── MdsScatterPlot.tsx
│   │   ├── layout/                        # Layout structural components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── RollupBar.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── dashboard/                     # Dashboard-specific compositions
│   │   │   ├── ScoreOverview.tsx
│   │   │   ├── CoverageWidget.tsx
│   │   │   ├── AlertsPanel.tsx
│   │   │   └── PeerComparisonMini.tsx
│   │   ├── console/                       # KPI Console compositions
│   │   │   ├── KpiTable.tsx
│   │   │   ├── KpiEntryForm.tsx
│   │   │   ├── VerificationBadge.tsx
│   │   │   └── ExcelImportModal.tsx
│   │   ├── analytics/                     # Analytics compositions
│   │   │   ├── BenchmarkView.tsx
│   │   │   ├── MdsPositioning.tsx
│   │   │   ├── CorrelationMatrix.tsx
│   │   │   └── PeerSelector.tsx
│   │   ├── goals/                         # Goal compositions
│   │   │   ├── GoalCard.tsx
│   │   │   ├── ForecastChart.tsx
│   │   │   ├── MilestoneTracker.tsx
│   │   │   └── GoalForm.tsx
│   │   ├── extraction/                    # Document processing compositions
│   │   │   ├── ExtractionStatus.tsx
│   │   │   ├── MappingReviewTable.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   └── DocumentUpload.tsx
│   │   └── onboarding/                    # Onboarding wizard compositions
│   │       ├── WizardStepper.tsx
│   │       └── FrameworkCard.tsx
│   │
│   ├── services/                          # Business logic layer
│   │   ├── kpiService.ts                  # KPI CRUD, verification, import
│   │   ├── scoringService.ts              # ESG score computation, threshold normalization
│   │   ├── extractionService.ts           # Extraction pipeline orchestration
│   │   ├── mappingService.ts              # Fuzzy match + LLM mapping logic
│   │   ├── benchmarkService.ts            # Percentiles, quartiles, sector medians
│   │   ├── mdsService.ts                  # Multi-dimensional scaling computation
│   │   ├── correlationService.ts          # Feature-selected correlation analysis
│   │   ├── forecastService.ts             # Linear regression, scenario generation
│   │   ├── reportService.ts              # Template rendering, PDF generation
│   │   ├── rollupService.ts              # Org hierarchy aggregation (SUM, AVG, WEIGHTED_AVG)
│   │   ├── configService.ts              # Configuration resolution (platform → tenant)
│   │   ├── auditService.ts              # Audit log recording
│   │   └── supplierService.ts           # Supplier scorecards, Scope 3 tracking
│   │
│   ├── db/
│   │   ├── index.ts                       # Drizzle client initialization + RLS setup
│   │   ├── schema/
│   │   │   ├── index.ts                   # Barrel export of all schemas
│   │   │   ├── tenants.ts                 # tenants, org_nodes
│   │   │   ├── auth.ts                    # users, sessions, accounts (Auth.js tables)
│   │   │   ├── kpi.ts                     # kpi_parameters, kpi_values, canonical_metrics
│   │   │   ├── extraction.ts             # raw_extractions, extracted_metrics, peer_kpi_values, unmapped_metrics
│   │   │   ├── mapping.ts                # metric_mapping_rules, metric_aliases
│   │   │   ├── peers.ts                  # peer_organisations
│   │   │   ├── goals.ts                  # goals, goal_components, milestones
│   │   │   ├── reports.ts               # report_templates, generated_reports
│   │   │   ├── supply-chain.ts          # suppliers, supplier_assessments
│   │   │   ├── config.ts               # tenant_config, scoring_weights, thresholds
│   │   │   └── audit.ts                # audit_logs
│   │   └── repositories/
│   │       ├── kpiRepository.ts
│   │       ├── parameterRepository.ts
│   │       ├── extractionRepository.ts
│   │       ├── peerRepository.ts
│   │       ├── goalRepository.ts
│   │       ├── reportRepository.ts
│   │       ├── configRepository.ts
│   │       ├── auditRepository.ts
│   │       └── userRepository.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts                        # JWT verification, session extraction
│   │   ├── tenant.ts                      # Set RLS session var, validate tenant access
│   │   ├── roleGuard.ts                   # RBAC enforcement per route
│   │   └── audit.ts                       # Write-operation audit logging
│   │
│   ├── schemas/                           # Zod validation schemas (shared API + forms)
│   │   ├── kpi.ts                         # kpiValueSchema, kpiImportSchema
│   │   ├── extraction.ts                  # extractionTriggerSchema, mappingUpdateSchema
│   │   ├── goals.ts                       # goalCreateSchema, forecastParamsSchema
│   │   ├── reports.ts                     # reportGenerateSchema
│   │   ├── users.ts                       # userInviteSchema, userUpdateSchema
│   │   ├── config.ts                      # thresholdSchema, weightSchema
│   │   └── common.ts                      # paginationSchema, filterSchema, uuidSchema
│   │
│   ├── lib/
│   │   ├── auth.ts                        # Auth.js v5 configuration
│   │   ├── auth.config.ts                 # Auth providers config (Azure AD)
│   │   ├── pgBoss.ts                      # pg-boss client initialization
│   │   ├── blobStorage.ts                 # Azure Blob Storage client
│   │   ├── documentIntelligence.ts        # Azure Document Intelligence client
│   │   ├── llm.ts                         # LLM client abstraction (configurable provider)
│   │   ├── logger.ts                      # Structured logger (Application Insights)
│   │   └── utils.ts                       # General utilities (formatCurrency, formatDate, etc.)
│   │
│   ├── jobs/                              # pg-boss job handlers
│   │   ├── index.ts                       # Register all job handlers
│   │   ├── extractionPipeline.ts          # PDF → Document Intelligence → LLM → parse → map
│   │   ├── metricMapping.ts               # Fuzzy + LLM mapping for extracted metrics
│   │   ├── scoreRecompute.ts              # Refresh materialized views + scores
│   │   ├── reportGeneration.ts           # Template fill → PDF generation
│   │   ├── apiSync.ts                    # ERP/HRMS scheduled sync
│   │   └── llmRecommendations.ts         # Nightly AI recommendation generation
│   │
│   ├── config/
│   │   ├── constants.ts                   # App-wide constants
│   │   ├── frameworks.ts                  # BRSR/ESRS/GRI/IFRS framework metadata
│   │   └── env.ts                         # Typed environment variable access (Zod-validated)
│   │
│   ├── types/
│   │   ├── api.ts                         # API request/response types
│   │   ├── domain.ts                      # Domain entity types (inferred from Drizzle schema)
│   │   ├── scoring.ts                     # Scoring engine types (strategies, thresholds)
│   │   └── extraction.ts                  # Extraction pipeline types (raw payload, mapping)
│   │
│   ├── hooks/                             # Custom React hooks
│   │   ├── useKpiValues.ts
│   │   ├── usePeerBenchmarks.ts
│   │   ├── useEsgScores.ts
│   │   ├── useGoals.ts
│   │   ├── useExtractionStatus.ts
│   │   └── useTenantConfig.ts
│   │
│   ├── stores/                            # Zustand stores (UI state only)
│   │   ├── filterStore.ts                 # Active period, standard, department filters
│   │   ├── sidebarStore.ts               # Sidebar collapse/expand state
│   │   └── modalStore.ts                 # Global modal state
│   │
│   └── middleware.ts                      # Next.js middleware entry (route protection)
│
├── tests/
│   ├── e2e/
│   │   ├── onboarding.spec.ts
│   │   ├── kpi-entry.spec.ts
│   │   ├── report-generation.spec.ts
│   │   └── fixtures/
│   │       └── test-data.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── kpi.test.ts
│   │   │   ├── extraction.test.ts
│   │   │   └── scores.test.ts
│   │   └── services/
│   │       ├── scoringService.test.ts
│   │       ├── mappingService.test.ts
│   │       └── rollupService.test.ts
│   └── helpers/
│       ├── testDb.ts                      # Test database setup/teardown
│       ├── testAuth.ts                    # Mock auth session helpers
│       └── factories.ts                   # Test data factories
│
└── docs/
    ├── extraction-prompts/
    │   ├── ExtractionPrompt_BRSR.txt
    │   ├── ExtractionPrompt_ESRS.txt
    │   └── ExtractionPrompt_GRI.txt
    └── api/                               # Auto-generated API docs (future)
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Enforcement | Rule |
|---|---|---|
| Auth boundary | `middleware.ts` (Next.js root) | All `/api/*` and `/(dashboard)/*` routes require valid session |
| Tenant boundary | `middleware/tenant.ts` | RLS session variable set; query results auto-filtered |
| Role boundary | `middleware/roleGuard.ts` | Route-level permission check before handler executes |
| Service boundary | Service layer pattern | Route handlers NEVER access DB directly; always via service → repository |
| External API boundary | `/src/lib/` clients | All external calls (Azure, LLM) go through typed client abstractions |

**Data Boundaries:**

| Boundary | Tables Affected | Rule |
|---|---|---|
| Tenant data vs Peer data | `kpi_values` vs `peer_kpi_values` | NEVER merge; separate tables, separate write paths, RLS-isolated |
| Raw vs Mapped extraction | `raw_extractions` vs `extracted_metrics` | Raw is immutable; metrics are parsed copies with mapping status |
| Platform vs Tenant config | `kpi_parameters` (tenant_id NULL vs set) | NULL tenant_id = platform seed; set = tenant override |
| Scored vs Raw values | Materialized views vs base tables | Views are computed artifacts; never write to them directly |

**Component Boundaries (Frontend):**

| Layer | Talks To | Pattern |
|---|---|---|
| Page components | Hooks (data) + Feature components (UI) | Pages are thin orchestrators |
| Feature components | Props only | No direct data fetching inside feature components |
| Hooks | TanStack Query → API routes | All server state flows through hooks |
| Zustand stores | UI state only (never server data) | Filters, sidebar, modals — ephemeral UI state |
| UI components (`/components/ui/`) | Props only, no side effects | Pure presentation, reusable across features |

### Requirements to Structure Mapping

| Feature Domain | Pages | Services | API Routes | DB Schema |
|---|---|---|---|---|
| KPI Data Management | `console/`, `rollup/` | `kpiService`, `rollupService` | `/api/kpi/`, `/api/org-hierarchy/` | `kpi.ts`, `tenants.ts` |
| Document Extraction | `settings/documents/` | `extractionService`, `mappingService` | `/api/extraction/` | `extraction.ts`, `mapping.ts` |
| Peer Benchmarking | `analytics/` | `benchmarkService`, `mdsService`, `correlationService` | `/api/benchmarks/`, `/api/peers/` | `extraction.ts`, `peers.ts` |
| ESG Scoring | `(dashboard)/page.tsx` | `scoringService` | `/api/scores/` | `kpi.ts`, `config.ts` |
| Goal Forecasting | `goals/` | `forecastService` | `/api/goals/` | `goals.ts` |
| Report Generation | `reports/` | `reportService` | `/api/reports/` | `reports.ts` |
| Supply Chain | `supply-chain/` | `supplierService` | `/api/supply-chain/` | `supply-chain.ts` |
| Auth & Users | `(auth)/`, `settings/users/` | Auth.js + `userRepository` | `/api/auth/`, `/api/users/` | `auth.ts` |
| Configuration | `settings/thresholds/`, `settings/parameters/` | `configService` | `/api/config/`, `/api/parameters/` | `config.ts`, `kpi.ts` |
| Audit & Compliance | `settings/audit/` | `auditService` | `/api/audit/` | `audit.ts` |

### Cross-Cutting Concerns Mapping

| Concern | Files |
|---|---|
| Multi-tenancy | `middleware/tenant.ts`, `db/index.ts` (RLS setup), all schema files (tenant_id column) |
| Audit logging | `middleware/audit.ts`, `services/auditService.ts`, `db/schema/audit.ts` |
| Config resolution | `services/configService.ts`, `db/repositories/configRepository.ts` |
| Background processing | `lib/pgBoss.ts`, `jobs/*` (all handlers) |
| Error handling | `services/*` (throw AppError), API routes (catch + format) |
| Authentication | `lib/auth.ts`, `middleware/auth.ts`, `middleware.ts` (root) |

### Integration Points

**External Integrations:**

| Integration | Client File | Used By | Data Flow |
|---|---|---|---|
| Azure Document Intelligence | `lib/documentIntelligence.ts` | `jobs/extractionPipeline.ts` | PDF → OCR → structured text |
| Enterprise LLM | `lib/llm.ts` | `jobs/extractionPipeline.ts`, `jobs/metricMapping.ts`, `jobs/llmRecommendations.ts` | Text → JSON metrics / mapping decisions |
| Azure Blob Storage | `lib/blobStorage.ts` | `extractionService.ts`, `reportService.ts` | Upload/download PDFs, generated reports |
| Azure Key Vault | via env at startup | All credential access | Secrets → environment variables |
| SAP / Darwinbox (future) | `jobs/apiSync.ts` | `kpiService.ts` | ERP data → kpi_values |

**Internal Data Flow:**

```
User → Page → Hook → API Route → Middleware Chain → Service → Repository → PostgreSQL (RLS)
                                                         ↓
                                                    pg-boss queue
                                                         ↓
                                                    Job Handler → External APIs → DB write
```

### Frontend Refactoring Strategy

The current V2 frontend has features and chart integration but lacks architectural discipline. The migration to target structure follows decision D11 (incremental, not big-bang):

**Phase 1 — Extract UI Primitives:**
Pull Button, Card, Badge, Table, Select, Input, Modal patterns from existing screens into `/components/ui/`. Match existing design system tokens (DM Sans, teal/indigo/amber palette).

**Phase 2 — Extract Layout Shell:**
Pull Sidebar, TopBar, RollupBar into `/components/layout/` and wire into `(dashboard)/layout.tsx`.

**Phase 3 — Refactor Per-Screen:**
As each screen gets backend wiring, replace inline component patterns with imports from `/components/ui/` and extract feature-specific compositions into `/components/{feature}/`.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices verified compatible:
- Next.js 16 + Drizzle ORM + Auth.js v5 + pg-boss + PostgreSQL 16 — all Node.js ecosystem
- pg-boss requires SKIP LOCKED — supported in PostgreSQL 16
- Auth.js v5 has native Next.js 16 App Router support
- TanStack Query v5 + React 19 + Zustand — compatible frontend composition
- Chart.js + Radix UI + Tailwind CSS 4 — no conflicts

**Pattern Consistency:** Database (snake_case) → API (camelCase) → Components (PascalCase) documented without ambiguity. Service layer pattern uniformly applied. Error handling consistent across all services.

**Structure Alignment:** Every architectural decision has a clear home in the project tree. Boundaries enforced at correct layers.

### Requirements Coverage Validation

**Functional Requirements Coverage:**

| FR Category | Architectural Support | Status |
|---|---|---|
| KPI Data Management | `kpiService` + `/api/kpi/` + `kpi.ts` schema | Covered |
| Document Extraction Pipeline | `extractionService` + `jobs/extractionPipeline.ts` + `lib/documentIntelligence.ts` + `lib/llm.ts` | Covered |
| Metric Mapping (fuzzy + LLM + manual) | `mappingService` + `jobs/metricMapping.ts` + `mapping.ts` schema | Covered |
| Peer Benchmarking | `benchmarkService` + `/api/benchmarks/` | Covered |
| MDS Competitive Positioning | `mdsService` + `/api/benchmarks/mds/` | Covered |
| Correlation Analysis | `correlationService` + `/api/benchmarks/correlations/` | Covered |
| ESG Scoring Engine | `scoringService` + `/api/scores/` + materialized view | Covered |
| Goal Forecasting | `forecastService` + `/api/goals/[goalId]/forecast/` | Covered |
| Report Generation | `reportService` + `jobs/reportGeneration.ts` + `/api/reports/generate/` | Covered |
| Org Hierarchy Rollup | `rollupService` + `/api/org-hierarchy/` | Covered |
| Supply Chain & Scope 3 | `supplierService` + `/api/supply-chain/` | Covered |
| User Management & RBAC | Auth.js + `middleware/roleGuard.ts` + `/api/users/` | Covered |
| Configuration Management | `configService` + `/api/config/` | Covered |
| Audit Trail | `auditService` + `middleware/audit.ts` + `audit.ts` schema | Covered |
| Knowledge Base | `knowledge/page.tsx` | Covered (static v1) |
| AI Recommendations | `jobs/llmRecommendations.ts` | Covered |
| Onboarding Wizard | `(auth)/onboarding/` + step components | Covered |
| Notifications | — | Deferred (D5) |

**Non-Functional Requirements Coverage:**

| NFR | How Addressed | Status |
|---|---|---|
| Multi-tenancy | PostgreSQL RLS + session var + middleware | Covered |
| Performance (dashboard < 2s) | Materialized views + TanStack Query cache | Covered |
| Report gen < 30s | pg-boss async job + Blob Storage | Covered |
| Security (OAuth, RLS, RBAC) | Auth.js + RLS + middleware chain | Covered |
| Auditability | Append-only audit_logs, middleware-enforced | Covered |
| Extensibility | Strategy pattern (scoring), abstract LLM interface | Covered |
| Compliance (multi-framework) | Per-standard parameters + canonical_id linkage | Covered |

### Implementation Readiness Validation

**Decision Completeness:** All critical technology decisions documented with version, rationale, and trade-off analysis. No ambiguous choices remain.

**Structure Completeness:** Full directory tree with every file explained. Feature-to-structure mapping covers all domains.

**Pattern Completeness:** 26 conflict points identified and resolved. Naming, structure, format, communication, and process patterns all specified with concrete examples and anti-patterns.

### Gap Analysis Results

**Critical Gaps:** None.

**Important Gaps (non-blocking):**

| Gap | Impact | Resolution Path |
|---|---|---|
| Notification system (D5) | No user alerts in v1 | Deferred; architecture supports future addition via pg-boss + WebSocket |
| Onboarding wizard UX | Structure defined, detailed UX not spec'd | UX spec needed before implementation |
| Materiality / Industry Data pages | Placeholder pages | Awaiting mockups; architecture supports any data-driven page |

**Nice-to-Have Gaps:**
- API documentation generation (OpenAPI/Swagger)
- Load testing configuration
- Database seeding automation (scripts defined, not yet implemented)

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Complete technology stack with no unresolved dependencies
- Systematic multi-tenancy enforcement (RLS + middleware, not ad-hoc)
- Clear service layer boundaries prevent spaghetti architecture
- Three-layer extraction pipeline (raw → mapping → structured) handles document variability
- Incremental frontend migration preserves working UI throughout
- Cross-standard analytics via canonical_id without losing standard-specific nuance

**Areas for Future Enhancement:**
- Notification system (v2 — WebSocket + pg-boss event triggers)
- Horizontal scaling (multiple App Service instances + read replicas)
- API versioning (when external consumers appear)
- CDN for static assets (when global traffic justifies it)
- XBRL output for regulatory filing (v2)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt about naming, formatting, or structure, check the Patterns section

**First Implementation Priority (sequence):**
1. Drizzle schema definition + migration generation
2. RLS policy setup
3. Auth.js v5 configuration + Azure AD
4. Middleware chain (auth → tenant → role → audit)
5. Core API routes (parameters, KPI CRUD)
6. UI component extraction (Button, Card, Badge → `/components/ui/`)
7. Frontend routing conversion (AppShell → App Router)

