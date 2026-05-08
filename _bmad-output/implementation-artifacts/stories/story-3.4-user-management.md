# Story 3.4: User Management

Status: complete

## Story

As a tenant administrator,
I want to invite team members and manage roles,
so that the right people have the right access.

## Acceptance Criteria

1. /settings/users page shows paginated user list (tenant-scoped via RLS)
2. "Invite User" form: email + role selection (Admin, Analyst, Department, Viewer)
3. Inviting creates a user record with status='invited'
4. Editing a user allows role change or deactivation
5. Only Admin role can access user management (403 for others)
6. API: GET/POST /api/users, PUT /api/users/[userId]

## Tasks / Subtasks

- [x] Create users page component (AC: #1, #5)
  - [x] Build `/src/app/(dashboard)/settings/users/page.tsx`
  - [x] Implement paginated table with columns: name, email, role, status (active/invited/deactivated), last_login
  - [x] Tenant scoping enforced via RLS — only show users for current tenant
  - [x] Restrict page access to Admin role (redirect or 403 for others)
- [x] Build invite form (AC: #2, #3)
  - [x] Create "Invite User" dialog/form with email input and role dropdown
  - [x] Role options: Admin, Analyst, Department, Viewer
  - [x] For Department role, include department_id assignment (select from org_nodes)
  - [x] On submit, create user record with status='invited' and tenantId
- [x] Build user table with edit actions (AC: #4)
  - [x] Add edit action per row to change role or deactivate user
  - [x] Deactivation sets status='deactivated' (soft delete)
  - [x] Role change updates the role field
- [x] Create API routes with role guard (AC: #5, #6)
  - [x] `/src/app/api/users/route.ts` — GET (paginated list), POST (invite)
  - [x] `/src/app/api/users/[userId]/route.ts` — GET (single user), PUT (update role/status)
  - [x] Role guard middleware: only 'admin' role can access these endpoints
  - [x] Record all user changes in audit log

### Review Findings

- [x] [Review][Decision] #1 Global email UNIQUE constraint — intentional global uniqueness; fixed error handling to catch DB unique violation (23505) in repository
- [x] [Review][Decision] #3 `active: true` clobbers `invited` status — fixed: edit modal tracks `activeChanged`, only sends `active` when explicitly toggled
- [x] [Review][Decision] #6 Self-modification guard — fixed: block self-modification entirely (`userId === currentUserId` → 403)
- [x] [Review][Decision] #7 Last admin protection — fixed: enforce minimum 1 active admin before demotion/deactivation
- [x] [Review][Patch] #2 TOCTOU race on invite — catch DB unique violation (23505) in repository `create()`, throw `AppError(DUPLICATE_ENTRY)`
- [x] [Review][Patch] #4 `role=department` without `departmentId` — added Zod `.refine()` requiring `departmentId` when `role === 'department'`
- [x] [Review][Patch] #5 Edit modal missing `departmentId` field — added conditional departmentId input in edit modal when role is department
- [x] [Review][Patch] #8 Email enumeration via invite error — generic message: `Unable to invite user. The email may already be in use.`
- [x] [Review][Patch] #9 User ID leaked in NOT_FOUND error — generic message: `User not found` without UUID
- [x] [Review][Patch] #14 Unhandled departmentId FK violation — catch FK violation (23503) in repository, throw `AppError(VALIDATION_ERROR)`
- [x] [Review][Patch] #15 Repository `update()` type accepts `active` but ignores it — removed `{ active?: boolean }` from repository update parameter type
- [x] [Review][Defer] #10 API response exposes `tenantId` to client — `UserRow` includes `tenantId` in response. Pre-existing pattern (peers do the same). Deferred.
- [x] [Review][Defer] #11 Edit modal always sends unchanged fields → noisy audit — Pre-existing pattern. Deferred.
- [x] [Review][Defer] #12 `updatedAt` set by app code not DB trigger — Pre-existing pattern across all repositories. Deferred.
- [x] [Review][Defer] #13 DB `role` column is `text` not enum — No CHECK constraint. Pre-existing schema design. Deferred.
- [x] [Review][Defer] #21 Page-level 403 is client-side only (brief UI flash) — Server-side guard would be better but API-level protection is correct. Deferred.

## Dev Notes

- Page: `/src/app/(dashboard)/settings/users/page.tsx`
- API routes: `/src/app/api/users/route.ts` (GET list, POST invite), `/src/app/api/users/[userId]/route.ts` (GET, PUT)
- Role guard: only 'admin' role can access these endpoints
- Invitation flow: store user with email + role + status='invited' + tenantId. When they OAuth in, auth callback matches email and activates.
- Department role: also needs department_id assignment (which org_node they belong to)
- User list columns: name, email, role, status (active/invited/deactivated), last_login
- Audit log: all changes to users are recorded

### Depends On
- Story 3.3 (org nodes must exist for department assignment)
- Story 1.4 (middleware/role guard)

### References
- [Source: architecture.md#Authentication & Security — Role permissions matrix]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No issues encountered during implementation.

### Completion Notes List
- Updated DB schema (`auth.ts`) to add `departmentId` (FK to org_nodes), `status` (active/invited/deactivated), and `lastLogin` columns, replacing the old `department` text and `active` boolean fields
- Updated `schemas/users.ts` to add `userListFilterSchema` with search/role/status filters, changed `department` to `departmentId` (UUID)
- Created `db/repositories/userRepository.ts` following the peer repository pattern — paginated list with search (name + email), role/status filters; findById; findByEmail; create; update
- Created `services/userService.ts` with list, getById, invite (with duplicate email check), and update (role change or deactivation via active flag)
- Created `app/api/users/route.ts` — GET (paginated list) and POST (invite) with `roles: ['admin']` guard and audit logging on invite
- Created `app/api/users/[userId]/route.ts` — GET (single user) and PUT (update role/status) with `roles: ['admin']` guard and audit logging with old/new value tracking
- Replaced placeholder `settings/users/page.tsx` with full implementation: paginated table, filter controls (search, role, status), Invite User modal with email/name/role/departmentId fields, Edit User modal with role and active/deactivated toggle, pagination controls, unauthorized state for non-admin users
- All 51 new tests pass; full suite of 649 tests pass with zero regressions (post code review patches)

### File List
- `greenmeter/src/db/schema/auth.ts` (modified — added departmentId, status, lastLogin columns)
- `greenmeter/src/schemas/users.ts` (modified — added userListFilterSchema, changed department to departmentId)
- `greenmeter/src/schemas/users.test.ts` (modified — added tests for new schemas and fields)
- `greenmeter/src/db/repositories/userRepository.ts` (new)
- `greenmeter/src/services/userService.ts` (new)
- `greenmeter/src/app/api/users/route.ts` (new)
- `greenmeter/src/app/api/users/route.test.ts` (new)
- `greenmeter/src/app/api/users/[userId]/route.ts` (new)
- `greenmeter/src/app/api/users/[userId]/route.test.ts` (new)
- `greenmeter/src/app/(dashboard)/settings/users/page.tsx` (modified — replaced placeholder with full implementation)

## Change Log
- 2026-05-06: Implemented user management — full backend (repository, service, API routes) and frontend (paginated table, invite modal, edit modal) with admin-only role guard and audit logging

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `review` — all tasks complete, 47 new tests passing, full suite 642/642 passing
- 2026-05-06: Code review completed — 4 decisions resolved, 7 patches applied, 5 deferred. All 649 tests passing
- 2026-05-06: Status changed to `complete` — human review approved
