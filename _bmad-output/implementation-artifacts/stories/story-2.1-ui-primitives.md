# Story 2.1: Extract UI Primitives to /components/ui/

Status: complete

## Story

As a developer,
I want reusable UI primitives extracted from the existing prototype into `/src/components/ui/`,
so that all feature screens use a consistent component library matching the design system.

## Acceptance Criteria

1. Components extracted: Button, Card, Badge, Table, Select, Input, Modal, Tabs, ProgressBar, Tooltip, DropdownMenu
2. Each is a standalone PascalCase.tsx file with typed props
3. Components preserve existing design tokens (DM Sans, teal/indigo/amber palette, Tailwind 4 classes)
4. `/src/components/ui/index.ts` barrel exports all primitives
5. Components have zero domain logic — props-only, no API calls, no global state
6. Radix UI primitives are used as the base where applicable (existing dependency)

## Tasks / Subtasks

- [x] Task 1: Audit existing prototype for component patterns
  - [x] Identify Button variants (primary, secondary, ghost, destructive)
  - [x] Identify Card patterns (header, body, footer)
  - [x] Identify all form inputs used
  - [x] Identify table patterns (sortable, paginated)
- [x] Task 2: Create /src/components/ui/ directory + components (AC: #1, #2, #3)
  - [x] Button.tsx — variants, sizes, loading state, disabled
  - [x] Card.tsx — with CardHeader, CardContent, CardFooter
  - [x] Badge.tsx — variants (success/warning/error/info), RAG colors
  - [x] Table.tsx — headers, rows, sorting indicator, pagination
  - [x] Select.tsx — Radix Select with custom styling
  - [x] Input.tsx — text, number, with label and error state
  - [x] Modal.tsx — Radix Dialog with overlay, title, close
  - [x] Tabs.tsx — Radix Tabs with content panels
  - [x] ProgressBar.tsx — percentage bar with label
  - [x] Tooltip.tsx — Radix Tooltip wrapper
  - [x] DropdownMenu.tsx — Radix DropdownMenu
- [x] Task 3: Barrel export (AC: #4)
  - [x] `/src/components/ui/index.ts`
- [x] Task 4: Verify no domain coupling (AC: #5)
  - [x] No imports from services, hooks, stores, or API

## Dev Notes

### Design System Tokens (from existing prototype)
- Font: DM Sans (loaded from /public/fonts/DMSans/)
- Primary: teal palette (teal-500/600/700)
- Accent: indigo palette
- Warning: amber palette
- Success: green
- Error: red
- Background: slate/gray neutrals
- Styling: Tailwind CSS 4 utility classes + custom CSS variables in globals.css

### Radix UI Components Already Installed
The project already has Radix UI primitives installed. Use these as unstyled bases:
- @radix-ui/react-dialog → Modal
- @radix-ui/react-dropdown-menu → DropdownMenu
- @radix-ui/react-select → Select
- @radix-ui/react-tabs → Tabs
- @radix-ui/react-tooltip → Tooltip

### Component Props Pattern
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
```

### Existing Prototype Location
- Check `greenmeter/` directory for existing screen files
- Extract patterns from AppShell.tsx and screen components
- Match existing visual appearance exactly

### Depends On
- No backend dependency (pure frontend extraction)

### References
- [Source: architecture.md#Project Structure — /src/components/ui/]
- [Source: architecture.md#Component Boundaries — UI components: props only, no side effects]
- [Source: decisions-log.md#D12 — Match existing UI design system]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- TypeScript type check: 0 errors
- Next.js production build: compiled successfully (4.2s), 0 errors
- Domain coupling check: no imports from services/hooks/stores/API

### Completion Notes List
- Audited existing prototype: identified button variants (primary/secondary/ghost), card patterns (card/card-head/cbody), form inputs (inp/sel/lbl/field), table patterns (tbl/th/td with hover states) from globals.css and screen components
- Created `src/lib/utils.ts` with `cn()` utility (clsx + tailwind-merge)
- Created 11 UI primitive components using Radix UI as accessible base where applicable
- Button uses class-variance-authority (CVA) for variant management with 4 variants (primary/secondary/ghost/destructive) and 3 sizes (sm/md/lg)
- Badge uses CVA with 10 color variants matching existing prototype badge classes
- Card split into composable sub-components: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Table split into: Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- Select wraps @radix-ui/react-select with full keyboard navigation and accessibility
- Modal wraps @radix-ui/react-dialog with overlay, close button, header/title/description/footer composition
- Tabs wraps @radix-ui/react-tabs with styled list/trigger/content
- Tooltip wraps @radix-ui/react-tooltip with dark theme styling
- DropdownMenu wraps @radix-ui/react-dropdown-menu with full sub-menu, checkbox, radio support
- ProgressBar is a simple controlled component with optional label and custom color
- Input supports label, error state, and disabled state
- All components use CSS variables from globals.css for consistent theming
- No test framework installed in project yet (Vitest planned but not set up) — component tests deferred to testing infrastructure story
- Full production build passes

### File List
- greenmeter/src/lib/utils.ts (new)
- greenmeter/src/components/ui/Button.tsx (new)
- greenmeter/src/components/ui/Card.tsx (new)
- greenmeter/src/components/ui/Badge.tsx (new)
- greenmeter/src/components/ui/Table.tsx (new)
- greenmeter/src/components/ui/Select.tsx (new)
- greenmeter/src/components/ui/Input.tsx (new)
- greenmeter/src/components/ui/Modal.tsx (new)
- greenmeter/src/components/ui/Tabs.tsx (new)
- greenmeter/src/components/ui/ProgressBar.tsx (new)
- greenmeter/src/components/ui/Tooltip.tsx (new)
- greenmeter/src/components/ui/DropdownMenu.tsx (new)
- greenmeter/src/components/ui/index.ts (new)

## Change Log
- 2026-05-05: Implemented all UI primitives — 11 components extracted from prototype patterns, barrel export created, all ACs satisfied, production build passes

## Status Log
- 2026-05-06: Status changed to `complete` — human review approved (batch approval)
