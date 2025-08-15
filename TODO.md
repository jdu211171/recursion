■ New Tasks
・Subtasks
○ In Progress Tasks
◑ Half-Completed Tasks
● Under Review Tasks
※ Development Rules and Notes
✓ Task Completion Reports
- SRS: Defined multi-tenant user/org model
  - Single global user; per-org `OrgMembership` and per-instance `InstanceAssignment`
  - Clarified borrowing constraints and blacklist scoping
  - Added data isolation, deactivation, and guest borrower guidance
 - SRS: Simplified identity model wording for clarity (concept-only)
 - Auth service: Align with Role/Access model
   - Added env-based SuperAdmin (SUPERADMINS=email1,email2) surfaced as `isSuperAdmin` in JWT/`/me`
   - New endpoints: `GET /auth/contexts` (list org+instances), `POST /auth/context` (switch instance, new JWT)
   - `requireRole` now allows SuperAdmin override inside auth service
   - Staff can create only Borrowers in their instance; Admin cannot create Admins (SuperAdmin only)
   - Added OrgMembership + InstanceAssignment + UserOrgProfile to Prisma schema; kept legacy User.orgId/instanceId/role for compatibility
   - JWTs now include `memberships` and `assignments` arrays; `orgId`/`instanceId` remain selected context for compatibility
   - `register`, `login`, `refresh`, `me`, and `context` endpoints now derive and return contexts from memberships/assignments (with on-the-fly backfill from legacy fields)
   - Access management APIs: `GET/POST/PATCH/DELETE /access/memberships`, `GET/POST/PATCH/DELETE /access/assignments` with org-admin and staff guardrails
   - Minimal seed script: `services/auth/prisma/seed-minimal.ts` and `bun run seed:minimal` to create Demo Org, Default instance, and an Admin user
 - Business Logic: Adjusted auth middleware to accept new JWT shape (string roles, memberships/assignments) and tenant validation
- Docs: Unified Redocly styles in Business Logic and File Storage to match Auth; removed dark theme overrides and aligned fallback loader.
- Auth service: Added API docs via Redocly Elements
  - New `services/auth/openapi.yaml` covering core auth endpoints
  - `/docs` serves interactive docs with Try It; `/openapi.yaml` serves the spec
  - No new dependencies; CDN assets used per project proxy guidance
 - Business Logic service: Added `/docs` and `/openapi.yaml`
   - New `services/business-logic/openapi.yaml` with Items, Lending, Reservations, Orgs basics
   - Relative spec URL ensures Vite proxy compatibility
 - File Storage service: Added `/docs` and `/openapi.yaml`
   - New `services/file-storage/openapi.yaml` covering uploads, listing, metadata, download URL
   - Uses Redocly Elements with fallback to Redoc if CDN fails
  - Dark mode: Applied dark theme to Business Logic and File Storage docs pages for visual consistency
> Task Fixes
- RBAC: Align role checks with SRS
  - Disallow Admin creating Borrowers; restrict to Staff in own instance
  - Require `instanceId` when Admin creates Staff; validate org ownership
  - Auth middleware tenant check respects memberships/assignments arrays
  - SuperAdmin no longer manages instance assignments (only org Admins)
  - Removed invalid `User.orgId/instanceId/role` references in users routes
~ Bugs and Issues
✅ Completed Tasks

---

■ New Tasks (High-Level Architectural Suggestions)
- Implement a Comprehensive Testing Strategy: Your SRS mentions testing, but the project lacks test files. A scalable application requires a strong safety net.
  ・Subtasks
  - Add unit tests for critical logic within each microservice (e.g., auth token generation, business logic calculations).
  - Create integration tests (`infrastructure/integration-test.sh`) to verify interactions between services (e.g., does creating a user in `auth` correctly link to `business-logic`?).
  - Write end-to-end (E2E) tests to simulate user flows through the UI (e.g., logging in, borrowing an item, and seeing it in the borrowings list).
- Establish a CI/CD Pipeline: Your SRS mentions a goal for automated deployment, but the design is not yet decided. This is a core DevOps practice.
  ・Subtasks
  - Create a basic CI workflow in GitHub Actions (or your preferred provider).
  - The workflow should automatically run linting and all tests on every push to the main branch.
  - Add a step to build Docker images for each service upon a successful test run.
  - Plan for a CD (Continuous Deployment) step to automatically deploy to a staging or production environment.
- Implement Centralized Logging and Monitoring: Your SRS mentions this as a requirement. For a microservices architecture, it's crucial for debugging and observing system health.
  ・Subtasks
  - Choose a logging stack (e.g., ELK Stack, Grafana Loki).
  - Instrument each service to send structured logs (e.g., JSON format) to the centralized logging service.
  - Set up basic monitoring dashboards to track key metrics like API response times, error rates, and database connections per service.
- Formalize Configuration and Secrets Management: You have a good start with `.env.example`.
  ・Subtasks
  - Ensure all environment-specific variables are documented in `.env.example` for each service.
  - For production, use a secure secret management tool (e.g., Docker Secrets, HashiCorp Vault, or cloud provider's secret manager) instead of environment variables for sensitive data like database passwords and JWT secrets.

---

■ New Tasks
- Frontend redesign (no MUI): Replace Material UI and router with an in-page SPA using custom components and styles derived from root `index.html`.
- Design tokens: Extract fonts, colors, borders, shadows, and motion from root `index.html` and define global CSS variables in `services/frontend/src/index.css`.
- SPA structure: Build a single-page, in-page navigation (no router). Core UX is the One‑Screen Table Console with an optional Settings section.
- UI components: Create minimal, accessible primitives (button, input, card, modal, select, checkbox, toast) with consistent spacing, radii, and focus outlines.
- Responsiveness: Implement a fluid layout that degrades gracefully from desktop to mobile; test at 360px, 768px, 1200px.
- Service integration: Reuse existing service functions via Vite proxy; avoid absolute URLs with ports; keep auth+tenant contexts.
- Progressive migration: Remove MUI imports incrementally while keeping TypeScript green and the app buildable on Bun.

- Borrowing UX: Flexible due-date presets
  - Allow users to choose from presets, create/delete presets, and set a default
  - Persist presets per org in localStorage; seed with org default (via configurationsService) when available
  - Add preset chips under date picker (+7d, +14d default, +30d) and a Manage Presets inline editor

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
- Items > Borrow flow lacked a borrower selector; only free-text fields were present, making it unclear whom the item is assigned to.

> Task Fixes
- Auth service: Fixed users controller and tests
  - Completed `services/auth/src/routes/users.ts` (constructor injection for bcrypt, finished methods, added router export)
  - `updateUser` now returns only updated fields; added bcrypt fallback to avoid undefined in tests
  - Removed duplicate property in `services/auth/src/routes/users.test.ts`
  - Verified all auth tests pass via `bun test`
 - Frontend: Added borrower Autocomplete to Borrow modal (Items flow), wired to `usersService.getUsers`, prefills name/ID, and passes `userId` to `lendingService.checkout`. Preset quick dates and DatePicker remain intact.
- Frontend: Implemented non‑MUI `BorrowConfirmModal` used by the new Console Confirm Borrow flow in `App.tsx`: includes borrower search+select, due date with preset chips (+7,+14 default,+30), validates inputs, and calls `lendingService.checkout`.
- Frontend: Added reusable `Combobox` primitive with keyboard navigation, async search, and accessible listbox; integrated into `BorrowConfirmModal` for a better Select Borrower experience.
- Frontend: Added `ReturnConfirmModal` for Borrowings entity. Allows selecting an existing penalty reason or creating one inline, persists reasons per-org in localStorage, appends penalty record to a local penalties list, and calls `lendingService.return` with notes.
 - Frontend: Borrowings table now always shows a Return action for every row; ReturnConfirmModal lets Admin/Staff choose between normal return or return with penalty.

✓ Task Completion Reports
- Enhanced preset management in BorrowConfirmModal:
  - Added last used preset tracking with localStorage persistence
  - Visual indicators show active preset (solid button)
  - Added confirmation dialog for preset deletion
- Simplified preset management UI:
  - Removed manage section for direct inline editing
  - Added × remove icons on custom preset buttons
  - Inline number input + button for adding new presets
  - Removed unnecessary default/star indicators (active state is enough)
- Made presets fully optional:
  - Removed all built-in presets (7, 14, 30 days)
  - Users manually select due date or create their own presets
  - Empty preset state handled gracefully
- Implemented flexible due-date presets in borrow modal:
  - Added localStorage-backed presets with default selection and per-org key
  - Seeded with org default (maxLendingDays) when available; fallback to 14d
  - Added preset chips and an inline manager to add/remove/set default
  - Applied preset choice to initialize due date on open
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
- Flattened DataTable surface styling: removed elevation, applied flat translucent glass panel consistent with theme switcher; added clearer row hover and selection states.

✅ Completed Tasks
- Repository status reviewed; initial plan drafted.
