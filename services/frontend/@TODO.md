Frontend TODOs — Tables & Conventions (scoped tasks)

Context: Extracted from your tabular spec to small, incremental tasks. We will implement only after your approval. All tasks follow existing patterns (React + Vite, shared DataTable, CSV modal) and avoid unrelated changes.

General Foundations
 - [x] Limit global search to columns marked `searchable` (no picker UI).
 - [ ] Ensure hidden-but-present ID/Org/Instance fields flow through export payloads even if not rendered.
 - [x] Extend CSV import to support strict update mode (require `id`), and dry-run preview grouping (adds/updates/errors) before commit.
 - [ ] Align CSV export to respect current selection/sort and always include hidden identifiers.
 - [ ] Add Archive pattern (Active/Archived) helpers and UI toggle; prefer archive over delete where specified.

1) Organizations (Tenants)
- [ ] Define `Organization` type with hidden `id`, name, counts, createdAt.
- [ ] Add Organizations table route/view with columns: Org ID (hidden), Name, Instances (#), Users (#), Created At.
- [ ] Add toolbar: Create, Import CSV, Export CSV; default sort Name ↑; search by Name.
- [ ] Row actions: Edit only (no Delete in UI).

2) Instances (Sub-tenants)
- [ ] Define `Instance` type with org linkage, type, durations, status.
- [ ] Table columns: Instance ID (hidden), Name, Org, Type, Default Loan Duration, Reservation Duration, Status (hidden by default).
- [ ] Row actions: Edit, Delete with guards (no items, no open borrowings/reservations).
- [ ] Searchable: Name, Type, Org; default sort Name ↑.

3) Users
- [x] Define `User` type with roles, contact, optional externalId, blacklistUntil (demo data).
- [x] Table columns: User ID (hidden), Full Name, External ID, Contact, Roles, Blacklisted Until badge.
- [x] Row actions: Edit, View, Delete (no deactivate yet).
- [x] Add View drawer with: Overview, Eligibility, KPIs (Current Loans, Overdue, Penalties), recent borrow history (last 10).
- [x] Searchable: Name, External ID, Contact; default sort enabled on Name.

4) Items (Assets)
- [x] Define `Item` type with category, counts, attachmentsCount, updatedAt (demo data).
- [x] Table columns: Item ID (hidden), Name, Category, Available/Total, Attachments (#), Updated At.
- [x] Row actions: Borrow, Edit, Delete (Reserve pending RBAC/policy wiring).
- [x] Searchable: Name, Category; sort enabled on Name and Updated At.

5) Borrowings (Loans)
- [x] Define `Borrowing` type with item, user, dates, status (derived), penalty, handledBy (demo data).
- [x] Table columns: Item, User, Start Date, Due Date (overdue highlight), Returned At, Status, Penalty, Handled By.
- [x] Row actions: Return, Edit, Delete (Extend/Lost/Waive pending policy/RBAC).
- [ ] Toolbar: Export CSV only with presets Monthly by Item/User (pending wiring).
- [ ] Default sort modes by view (pending segregation of views).

6) Reservations
- [x] Define `Reservation` type with item, user, date range, status, createdAt (demo data).
- [x] Table columns: Item, User, Reserved From/To, Status, Created At.
- [x] Row actions: Fulfill, Extend, Cancel (stubs).
- [ ] Toolbar: Export CSV; Search; Default sort (pending wiring).

7) Blacklist / Penalty Records
- [x] Define `PenaltyRecord` type with user, optional item, reason, untilDate, severity, status, notes (demo data).
- [x] Table columns: User, Item, Reason, Created At, Until Date, Severity, Status, Notes.
- [x] Row actions: Edit, Remove (stubs).
- [ ] Toolbar: Export CSV; Search; Default sort (pending wiring).

8) Roles / Role Assignments
- [x] Define `RoleAssignment` type with user, role, org, instance, createdAt (demo data).
- [x] Table columns: User, Role, Org, Instance, Created At.
- [x] Row actions: Edit (stub).
- [ ] Toolbar: Export CSV; optional Import CSV; Search; Default sort Created At ↓ (pending wiring).

9) Categories (optional)
- [x] Define `Category` type with optional parent, itemsCount, status (demo data).
- [x] Table columns: Name, Parent, Items (#), Status.
- [x] Row actions: Edit, Merge, Delete (stubs).
- [ ] Toolbar: Create/Import/Export; Search; Default sort (pending wiring).

10) Attachments (optional)
- [x] Define `Attachment` type with item, filename, mime, size, uploadedBy, createdAt (demo data).
- [x] Table columns: Item, Filename, Type (MIME), Size, Uploaded By, Created At.
- [x] Row actions: Download, Replace, Delete (stubs).
- [ ] Toolbar: Upload, Export list (CSV); Search; Default sort (pending wiring).

Light Guardrails (cross-cutting)
- [ ] Derive statuses in UI where possible (e.g., Overdue = now > due && !returned) to avoid skew.
- [ ] Enforce student-only visibility for Reserve; staff-only for Borrow/Return/Penalty Waive.
- [ ] Add “Handled By” attribution for checkout/return flows.
- [ ] Ensure soft-delete/archival choices align with spec (prefer Archive for parents; hard-delete guarded elsewhere).

Plumbing & Navigation
- [ ] Expand `Toolbar` entity selector to include all entities (behind feature flags if needed).
- [ ] Add routes/views for new entities using shared `DataTable` patterns.
- [ ] Wire CSV modal/templates per entity (headers, required fields, ID requirement for updates).

Notes / Risks
- [ ] Confirm RBAC sources to gate actions (admin/staff/student).
- [ ] Confirm policies for loan/reservation durations and extension limits per Instance.
- [ ] Validate export formats with ops (include hidden IDs/Org/Instance fields for reconciliation).
