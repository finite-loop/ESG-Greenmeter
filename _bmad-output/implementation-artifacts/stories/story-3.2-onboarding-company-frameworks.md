# Story 3.2: Onboarding Wizard — Company Profile & Frameworks

Status: complete

## Story

As a new tenant administrator,
I want to configure my company profile and select ESG frameworks,
so that the platform is pre-configured for my reporting requirements.

## Acceptance Criteria

1. Onboarding wizard renders at /(auth)/onboarding with step indicators
2. Step 1 (Company Profile): company name, sector, country, base currency, logo upload
3. Step 2 (Framework Selection): checkboxes for BRSR, ESRS, GRI, IFRS S2 (minimum 1)
4. Confirming frameworks activates relevant parameter subsets for the tenant
5. Progress preserved if user navigates away (stored in tenant_config)
6. Wizard uses React Hook Form + Zod for validation

## Tasks / Subtasks

- [x] Create WizardStepper component (AC: #1)
  - [x] Build `/src/app/(auth)/onboarding/page.tsx` as wizard container
  - [x] Create reusable stepper UI showing current step, completed steps, and remaining steps
  - [x] Support navigation between completed steps
- [x] Build CompanyProfile step (AC: #2, #6)
  - [x] Create `/src/app/(auth)/onboarding/steps/CompanyProfile.tsx`
  - [x] Form fields: company name (required), sector (dropdown), country (dropdown), base currency (dropdown)
  - [x] Validate with Zod schema via React Hook Form
  - [x] Sectors: predefined list (Energy, IT & Technology, Manufacturing, Financial Services, Healthcare, etc.)
  - [x] Countries: predefined list of common countries
  - [x] Currencies: INR, USD, EUR, GBP
  - [x] Logo upload uses blobStorage client
- [x] Build FrameworkSelection step (AC: #3, #6)
  - [x] Create `/src/app/(auth)/onboarding/steps/FrameworkSelection.tsx`
  - [x] Render checkboxes for BRSR, ESRS, GRI, IFRS S2
  - [x] Validate minimum 1 framework selected via Zod
- [x] Create API endpoints for tenant profile update and framework activation (AC: #4, #5)
  - [x] POST /api/onboarding/profile — save company profile to tenant_config
  - [x] POST /api/onboarding/frameworks — activate selected frameworks and mark onboarding complete
  - [x] Framework activation: sets activeFrameworks on tenant record
- [x] Persist progress (AC: #5)
  - [x] Save partial wizard state to tenant_config on each step completion
  - [x] Client-side state preserves profile data when navigating between steps

## Dev Notes

- Onboarding page: `/src/app/(auth)/onboarding/page.tsx`
- Step components: `/src/app/(auth)/onboarding/steps/CompanyProfile.tsx`, `FrameworkSelection.tsx`
- API: POST /api/onboarding/profile, POST /api/onboarding/frameworks
- Framework activation: copy relevant platform-seed parameters (tenant_id=NULL) reference for this tenant
- Logo upload uses blobStorage client from Story 1.7
- Sectors: predefined list (Energy, IT, Manufacturing, Financial Services, Healthcare, etc.)
- Countries: predefined list or ISO 3166
- Currencies: INR, USD, EUR, GBP (common ones)

### Depends On
- Story 3.1 (user must be authenticated)
- Story 2.5 (form infrastructure)
- Story 1.7 (blob storage for logo upload)

### References
- [Source: architecture.md#Complete Project Directory Structure — onboarding steps]
- [Source: decisions-log.md#D12]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- All 514 tests pass (46 test files), zero regressions
- 11 new onboarding schema tests pass

### Completion Notes List
- Created onboarding schemas (companyProfileSchema, frameworkSelectionSchema) with Zod validation
- Built WizardStepper component with step indicators, completed/current/remaining states, and back-navigation
- Built CompanyProfile step with React Hook Form + Zod: company name, sector dropdown, country dropdown, currency dropdown
- Built FrameworkSelection step with checkboxes for BRSR/ESRS/GRI/IFRS_S2, minimum 1 validation
- Created POST /api/onboarding/profile API — updates tenant record and saves progress to tenant_config
- Created POST /api/onboarding/frameworks API — sets activeFrameworks and marks onboarding complete
- Wizard persists profile state client-side and saves to tenant_config server-side per step
- Logo upload implemented: file input with drag-style button, image preview, size/type validation (2 MB, PNG/JPEG/WebP/SVG), uploads to Azure Blob Storage at `{tenantId}/logos/logo.{ext}`, saves URL to `tenants.logo_url` column

### File List
- `src/app/(auth)/onboarding/page.tsx` — modified (wizard container with step routing)
- `src/app/(auth)/onboarding/WizardStepper.tsx` — new (reusable step indicator component)
- `src/app/(auth)/onboarding/steps/CompanyProfile.tsx` — new (step 1 form with logo upload)
- `src/app/(auth)/onboarding/steps/FrameworkSelection.tsx` — new (step 2 form)
- `src/app/api/onboarding/profile/route.ts` — new (profile save API)
- `src/app/api/onboarding/frameworks/route.ts` — new (framework activation API)
- `src/app/api/onboarding/logo/route.ts` — new (logo upload via blobStorage)
- `src/app/api/onboarding/logo/route.test.ts` — new (logo upload tests)
- `src/schemas/onboarding.ts` — new (Zod schemas for onboarding)
- `src/schemas/onboarding.test.ts` — new (schema validation tests)
- `src/db/schema/tenants.ts` — modified (added logoUrl column)

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `review` — all tasks complete, tests passing, ready for human review
- 2026-05-06: Status changed to `in-progress` — logo upload implementation required before approval
- 2026-05-06: Status changed to `review` — logo upload implemented, all 537 tests passing, ready for human review
- 2026-05-06: Status changed to `complete` — human review approved
