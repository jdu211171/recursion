■ New Tasks
・Subtasks
○ In Progress Tasks
◑ Half-Completed Tasks
● Under Review Tasks
※ Development Rules and Notes
✓ Task Completion Reports
> Task Fixes
~ Bugs and Issues
✅ Completed Tasks

---

■ New Tasks
- Frontend redesign (no MUI): Replace Material UI and router with an in-page SPA using custom components and styles derived from root `index.html`.
- Design tokens: Extract fonts, colors, borders, shadows, and motion from root `index.html` and define global CSS variables in `services/frontend/src/index.css`.
- SPA structure: Build a single-page, in-page navigation (no router). Core UX is the One‑Screen Table Console with an optional Settings section.
- UI components: Create minimal, accessible primitives (button, input, card, modal, select, checkbox, toast) with consistent spacing, radii, and focus outlines.
- Responsiveness: Implement a fluid layout that degrades gracefully from desktop to mobile; test at 360px, 768px, 1200px.
- Service integration: Reuse existing service functions via Vite proxy; avoid absolute URLs with ports; keep auth+tenant contexts.
- Progressive migration: Remove MUI imports incrementally while keeping TypeScript green and the app buildable on Bun.

- One‑Screen Table Console Plan
  - Central table for Users, Items, Orgs, Instances, Roles, Blacklists, Borrowings/Returns, Reservations, Categories, Attachments.
  - Toolbar: entity selector, search (debounced), filters, bulk actions, CSV import/export, contextual Borrow/Return.
  - Row selection via left checkboxes; inline actions per row (edit/delete/borrow/return).
  - UnifiedForm modal per-entity schema for create/edit (same component).
  - Table: pagination, sortable columns; client-side first, server params later.
  - Header: org/instance selectors; block actions until both selected; role-based admin-only actions.

・Subtasks
- Plan and document redesign approach in TODO.md
- Scaffold new `App.tsx` with header, toolbar, and central table slot
- Import global theme variables and base styles into `index.css`
- Update `services/frontend/index.html` to load Inter font and set meta/title
- Create table-centric placeholders for core entities (Items, Users, Borrowings)
- Wire existing contexts (`TenantProvider`, `ConfigProvider`) around the new app shell
- Provide temporary lite context providers (no MUI deps) to keep build green
- Defer MUI-dependent pages; ensure they are not imported to avoid TS errors
- Audit MUI usage and list removal phases (icons, pickers, components)
- Replace a first MUI widget with custom styles in a follow-up pass

- Components/Modules to Create
  - primitives: Button, Input, Select, Checkbox, Modal, Card, Toast
  - table: DataTable, Column, useTableState (sorting, pagination, selection)
  - forms: UnifiedForm (schema-driven), field-controls
  - layout: Header (tenant selectors), Toolbar (entity/actions)
  - contexts: TenantContext, AuthContext, ConfigContext
  - api: http, endpoints, clients (stubs for items/users/...)
  - utils: csv, validators, a11y
  - types: domain, api
  - pages: Overview (optional), Settings

○ In Progress Tasks
- Wire advanced filters + presets (next)

◑ Half-Completed Tasks
- N/A

● Under Review Tasks
- N/A

※ Development Rules and Notes
- Use Bun for all package operations.
- Do not use Material UI; implement custom, minimal components.
- Keep a single-page, in-page navigation (no router, no stacked pages).
- Base fonts, borders, colors, and overall styling on root `index.html`.
- Keep changes incremental and type-safe; fix TS errors after each step.
- Do not hardcode service ports; rely on Vite proxy in dev and Nginx in prod.
- Remove debug logs before finalizing; ensure accessibility (focus states, labels).

~ Bugs and Issues
- Extensive MUI usage across many files; importing any of them into the new entry breaks the "no MUI" constraint. Mitigation: keep legacy files but avoid importing them.
- Current `src/main.tsx` does not import `index.css`. Fix by importing global CSS explicitly.

> Task Fixes
- N/A

✓ Task Completion Reports
- Extracted ConsoleTable into own component at `src/components/table/ConsoleTable.tsx` and updated `App.tsx` to use it.
- Fixed DataTable controlled search to apply pre-pagination via `useTableState` externalSearch option; result count now reflects total filtered rows.
- Migrated toast system to Sonner: added `<Toaster />`, replaced local toast state with `toast.*` calls, imported `sonner/dist/styles.css`, and removed old `src/components/primitives/Toast.tsx`.
- Implemented new in-page SPA shell without router in `src/App.tsx`.
- Added global theme and responsive styles in `src/index.css` based on root `index.html`.
- Updated `services/frontend/index.html` to load Inter font and set metadata/title.
- Ensured build succeeds by narrowing `tsconfig.app.json` includes to the new shell (temporary during migration).
- Verified production build with Bun + Vite; output generated in `services/frontend/dist/`.
- Added non-MUI `AppHeaderSimple` and wrapped app with lite `TenantProvider` and `ConfigProvider`.
- Added UI primitives (Button, Input, Modal), new Feedback modal, and integrated into Overview.
- Implemented non-MUI table console (Header, Toolbar, DataTable, Overview) and lite contexts.
- Added CSV utilities and CsvImportModal; wired toolbar actions for create/import/export with UnifiedForm schemas (Items/Users/Borrowings) and toasts.

✅ Completed Tasks
- Repository status reviewed; initial plan drafted.
