# GreenMeter AI — Story Implementation Sequence & Parallelism Guide

> This document defines the strict implementation order for the dev agent.
> Follow this sequence to avoid dependency conflicts between stories.

---

## Dependency Graph (Visual)

```
PHASE 1: Foundation (Sequential core + parallel infra)
═══════════════════════════════════════════════════════
  1.1 Database Schema & Drizzle
    → 1.2 RLS Policies
      → 1.3 Auth.js Configuration
        → 1.4 Middleware Chain
          → 1.5 Audit Service

  Parallel track (startable after 1.1 completes):
  ├── 1.6 pg-boss Infrastructure
  ├── 1.7 External Service Clients
  ├── 1.8 Structured Logging
  └── 1.9 CI/CD Pipeline

PHASE 2: Frontend Shell (startable after 1.3 + 1.4)
════════════════════════════════════════════════════════
  2.1 UI Primitives
    → 2.2 Layout Components
      → 2.3 App Router Conversion

  Parallel track (startable after 2.3 completes):
  ├── 2.4 State Management (TanStack Query + Zustand)
  └── 2.5 Form Infrastructure (React Hook Form + Zod)

PHASE 3: Auth & Users (startable after 2.3 + 2.4)
═══════════════════════════════════════════════════════
  3.1 Login Page + OAuth Flow
    → 3.2 Onboarding: Company + Frameworks
      → 3.3 Onboarding: Org Hierarchy + Fiscal Year
        → 3.4 User Management

PHASE 4: Core Data (startable after 3.3)
═════════════════════════════════════════════
  4.1 Parameter Seed Pipeline
    → 4.2 Parameters API + UI
      → 4.3 KPI Console (CRUD)
        → 4.4 Verification Workflow

  Parallel track (startable after 4.2 completes):
  ├── 4.5 Excel Import
  └── 4.6 Org Hierarchy Management → 4.7 Rollup Computation

PHASE 5: Document Pipeline (startable after 4.1)
══════════════════════════════════════════════════════
  5.1 Peer Organisation Management
    → 5.2 Document Upload + Storage
      → 5.3 Extraction Pipeline Job
        → 5.4 Mapping Layer
          → 5.5 Mapping Review + Alias Learning

PHASE 6: Analytics & Scoring (startable after 4.3 + 5.4)
══════════════════════════════════════════════════════════════
  6.1 Scoring Engine + Materialized Views
    → 6.2 Threshold/Weight Configuration

  Parallel track (startable after 6.1 + 5.4):
  ├── 6.3 Peer Benchmarking → 6.4 Radar Chart
  ├── 6.5 MDS Positioning
  └── 6.6 Correlation Analysis (after 6.5)

PHASE 7: Goals & Reports ──────────┐
════════════════════════════════════ │  CAN RUN FULLY IN PARALLEL
  (startable after 4.3)            │
  7.1 Goal Management              │
    → 7.2 Milestone Tracking       │
      → 7.3 Forecasting            │
                                   │
  (startable after 6.1)            │
  8.1 Report Template Engine       │
    → 8.2 Coverage Tracking        │
      → 8.3 PDF Generation         │
                                   │
PHASE 8: Supply Chain & Knowledge ─┘
═══════════════════════════════════
  (startable after 4.2)
  9.1 Supplier Management
    → 9.2 Scope 3 + Portal

  Parallel track (startable after 4.2):
  ├── 9.3 Knowledge Base
  └── 9.4 AI Recommendations (rule-based after 6.1)

PHASE 9: Dashboard & Operations (startable after 6.1 + 9.4)
══════════════════════════════════════════════════════════════════
  10.1 Executive Dashboard

  Parallel track (various start points):
  ├── 10.2 Audit Log Viewer (after 1.5)
  ├── 10.3 System Health (after 1.6)
  ├── 10.4 Integration Config (after 3.4)
  │     → 10.5 API Sync Jobs
  └── 10.6 Placeholder Pages (after 2.3)
```

---

## Critical Path (Longest Dependency Chain)

The critical path determines the minimum sequential work:

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 3.3
  → 4.1 → 4.2 → 4.3 → 5.1 → 5.2 → 5.3 → 5.4 → 6.1 → 6.3 → 10.1
```

**20 stories on the critical path** — everything else can be parallelized around this.

---

## Strict Sequential Order (Single-Agent Execution)

If implementing with a **single dev agent** (no parallelism), follow this exact order:

| # | Story | Depends On | Phase |
|---|---|---|---|
| 1 | 1.1 Database Schema & Drizzle | — | 1 |
| 2 | 1.2 RLS Policies | 1.1 | 1 |
| 3 | 1.3 Auth.js Configuration | 1.1 | 1 |
| 4 | 1.4 Middleware Chain | 1.3 | 1 |
| 5 | 1.5 Audit Service | 1.4 | 1 |
| 6 | 1.6 pg-boss Infrastructure | 1.1 | 1 |
| 7 | 1.7 External Service Clients | 1.1 | 1 |
| 8 | 1.8 Structured Logging | 1.1 | 1 |
| 9 | 1.9 CI/CD Pipeline | 1.1 | 1 |
| 10 | 2.1 UI Primitives | — | 2 |
| 11 | 2.2 Layout Components | 2.1 | 2 |
| 12 | 2.3 App Router Conversion | 2.2, 1.3 | 2 |
| 13 | 2.4 State Management | 2.3 | 2 |
| 14 | 2.5 Form Infrastructure | 2.3 | 2 |
| 15 | 3.1 Login Page + OAuth | 2.3, 2.4, 1.4 | 3 |
| 16 | 3.2 Onboarding: Company + Frameworks | 3.1 | 3 |
| 17 | 3.3 Onboarding: Org + Fiscal | 3.2 | 3 |
| 18 | 3.4 User Management | 3.3 | 3 |
| 19 | 4.1 Parameter Seed Pipeline | 1.1 | 4 |
| 20 | 4.2 Parameters API + UI | 4.1, 3.3 | 4 |
| 21 | 4.3 KPI Console (CRUD) | 4.2 | 4 |
| 22 | 4.4 Verification Workflow | 4.3 | 4 |
| 23 | 4.5 Excel Import | 4.2 | 4 |
| 24 | 4.6 Org Hierarchy Management | 3.3 | 4 |
| 25 | 4.7 Rollup Computation | 4.6, 4.3 | 4 |
| 26 | 5.1 Peer Organisation Management | 4.1 | 5 |
| 27 | 5.2 Document Upload + Storage | 5.1, 1.7 | 5 |
| 28 | 5.3 Extraction Pipeline Job | 5.2, 1.6 | 5 |
| 29 | 5.4 Mapping Layer | 5.3 | 5 |
| 30 | 5.5 Mapping Review + Alias Learning | 5.4 | 5 |
| 31 | 6.1 Scoring Engine + MVs | 4.3 | 6 |
| 32 | 6.2 Threshold/Weight Config | 6.1 | 6 |
| 33 | 6.3 Peer Benchmarking | 6.1, 5.4 | 6 |
| 34 | 6.4 Radar Chart | 6.3 | 6 |
| 35 | 6.5 MDS Positioning | 5.4, 6.1 | 6 |
| 36 | 6.6 Correlation Analysis | 6.5 | 6 |
| 37 | 7.1 Goal Management | 4.3 | 7 |
| 38 | 7.2 Milestone Tracking | 7.1 | 7 |
| 39 | 7.3 Forecasting | 7.2 | 7 |
| 40 | 8.1 Report Template Engine | 6.1 | 7 |
| 41 | 8.2 Coverage Tracking | 8.1 | 7 |
| 42 | 8.3 PDF Generation | 8.2, 1.7 | 7 |
| 43 | 9.1 Supplier Management | 4.2 | 8 |
| 44 | 9.2 Scope 3 + Portal | 9.1 | 8 |
| 45 | 9.3 Knowledge Base | 4.2 | 8 |
| 46 | 9.4 AI Recommendations | 6.1, 1.6 | 8 |
| 47 | 10.1 Executive Dashboard | 6.1, 9.4 | 9 |
| 48 | 10.2 Audit Log Viewer | 1.5 | 9 |
| 49 | 10.3 System Health | 1.6 | 9 |
| 50 | 10.4 Integration Config | 3.4 | 9 |
| 51 | 10.5 API Sync Jobs | 10.4, 1.6 | 9 |
| 52 | 10.6 Placeholder Pages | 2.3 | 9 |

---

## Parallelism Opportunities (Multi-Agent Execution)

### Maximum Parallel Tracks at Each Phase

| Phase | Parallel Streams | Stories Running Simultaneously |
|---|---|---|
| Phase 1 (after 1.1) | 2 streams | Stream A: 1.2→1.3→1.4→1.5 / Stream B: 1.6, 1.7, 1.8, 1.9 |
| Phase 2 (after 2.3) | 2 streams | 2.4 + 2.5 simultaneously |
| Phase 4 (after 4.2) | 3 streams | Stream A: 4.3→4.4 / Stream B: 4.5 / Stream C: 4.6→4.7 |
| Phase 5+7+8 | 3 streams | Stream A: 5.x pipeline / Stream B: 7.x goals / Stream C: 9.x supply chain |
| Phase 6 (after 6.1) | 3 streams | Stream A: 6.2 / Stream B: 6.3→6.4 / Stream C: 6.5→6.6 |
| Phase 9 | 5 streams | 10.1 / 10.2 / 10.3 / 10.4→10.5 / 10.6 all independent |

### Optimal 2-Agent Split

**Agent A (Critical Path + Backend):**
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 4.3 → 4.4 → 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 6.1 → 6.2 → 6.3 → 6.5 → 6.6 → 9.4 → 10.1

**Agent B (Frontend + Parallel Features):**
1.7 → 1.8 → 1.9 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 3.4 → 4.5 → 4.6 → 4.7 → 6.4 → 7.1 → 7.2 → 7.3 → 8.1 → 8.2 → 8.3 → 9.1 → 9.2 → 9.3 → 10.2 → 10.3 → 10.4 → 10.5 → 10.6

### Earliest Start Times (Dependency Unlocks)

| Story | Can Start As Soon As... |
|---|---|
| 1.6, 1.7, 1.8, 1.9 | 1.1 is complete |
| 2.1 | No dependency (existing prototype) |
| 2.4, 2.5 | 2.3 is complete |
| 3.1 | 1.4 + 2.4 are complete |
| 4.1 | 1.1 is complete (seed scripts only need DB schema) |
| 4.5, 4.6 | 4.2 is complete |
| 5.1 | 4.1 is complete (needs parameters to exist) |
| 7.1 | 4.3 is complete (needs KPI values for goal linking) |
| 8.1 | 6.1 is complete (needs scores for report content) |
| 9.1, 9.3 | 4.2 is complete (needs parameters API) |
| 10.2 | 1.5 is complete (needs audit service) |
| 10.3 | 1.6 is complete (needs pg-boss to monitor) |
| 10.6 | 2.3 is complete (only needs routing shell) |

---

## Phase Gate Checklist

Before moving to next phase, verify:

### Phase 1 → Phase 2 Gate
- [ ] Database schema applied and migrations run
- [ ] RLS policies active
- [ ] Auth.js responds to OAuth flows
- [ ] Middleware chain rejects unauthenticated requests
- [ ] pg-boss processes a test job
- [ ] Logger outputs structured JSON

### Phase 2 → Phase 3 Gate
- [ ] UI primitives render in isolation
- [ ] Dashboard layout shell renders (sidebar + topbar + content area)
- [ ] All route pages exist (even if empty)
- [ ] TanStack Query provider wraps the app
- [ ] A test form validates with Zod

### Phase 3 → Phase 4 Gate
- [ ] User can sign in via Azure AD and reach dashboard
- [ ] Onboarding wizard creates tenant + org nodes + periods
- [ ] User management CRUD works with RBAC enforced
- [ ] Session contains tenantId and role

### Phase 4 → Phase 5 Gate
- [ ] Seed data populates 260+ parameters across 3 standards
- [ ] KPI Console displays parameters and accepts value entry
- [ ] Verification workflow changes status with audit trail
- [ ] Excel import processes a file and creates values
- [ ] Rollup computation aggregates child values to parent

### Phase 5 → Phase 6 Gate
- [ ] Peer orgs can be created
- [ ] PDF upload stores in Blob Storage
- [ ] Extraction pipeline produces raw_extractions + extracted_metrics
- [ ] Mapping layer auto-maps >50% of test metrics
- [ ] Review UI allows manual mapping with alias learning

### Phase 6 → Phases 7/8/9 Gate
- [ ] ESG scores compute from KPI values
- [ ] Scores refresh when values change
- [ ] Benchmarks compute percentiles from peer data
- [ ] MDS produces 2D positioning data
- [ ] Correlation matrix generates for sufficient data

---

## Story File Naming Convention

All story files are in: `_bmad-output/implementation-artifacts/stories/`

Format: `story-{epic}.{story}-{kebab-title}.md`

Example: `story-1.1-database-schema-drizzle-setup.md`
