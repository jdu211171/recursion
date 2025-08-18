# Software Requirements Specification (SRS)

**Flexible, SaaS-Ready Multi-Tenant Lending Platform (Full Version)**

---

## 1) Introduction

### 1.1 Purpose

Define a clear, non-technical specification for a multi-tenant platform that manages borrowing and lending of any item type (books, tools, equipment). The system must be configurable per organization, extensible for future requests, and suitable for operating as a SaaS.

### 1.2 Audience

Product owners, project managers, designers, domain experts, and developers who need a plain-language description of behavior, policies, and boundaries—without infrastructure or tooling details.

### 1.3 Goals

* Hierarchical multi-tenancy with strong data isolation.
* One **global account** per person across the entire SaaS.
* Generalized circulation for any item type.
* Tenant-configurable identity and policy rules.
* Simple, intuitive UI for everyday tasks.
* Extensible foundation to accept new/changed features from future customers.

### 1.4 Non-Goals

* Prescribing specific infrastructure, deployment tools, or technology brands.
* Advanced analytics, payments, or complex third-party integrations (MVP excludes these).

---

## 2) System Overview

### 2.1 Multi-Tenancy Model

* **Organization (Org)**: top-level tenant (e.g., a school or company).
* **Instance**: sub-tenant within an Org (e.g., Library vs Workshop). Instances inherit defaults from the Org but can override selected policies.
* All data access is scoped by Org and, where relevant, Instance.

### 2.2 Global User Account Model

* Each person has exactly **one global Account** created once for the entire SaaS.
* Access to Org/Instance data is granted through **Memberships** that link the global Account to an Org and optionally to Instances, with a role.
* Org-specific details (e.g., local phone, local display name) are stored in an **Org Profile** attached to the same global Account.

### 2.3 Extensibility

* Policies, rules, and small customizations are configuration-driven.
* Safe **extension points** allow adding fields and light custom behavior per tenant without affecting other tenants.
* Feature flags allow enabling tenant-specific capabilities.

### 2.4 High-Level Capabilities

* Item catalog with optional categories and quantity tracking (total/available).
* Borrowing, returning, reservations, and handling lost items.
* Penalties and blacklist rules that each Org can configure.
* Attachments (manuals, PDFs) linked to items.
* Comprehensive audit of important actions and policy changes.

---

## 3) Glossary

* **Account (User)**: A person’s single, global identity in the SaaS.
* **Org**: Top-level tenant.
* **Instance**: Sub-tenant within an Org (e.g., specific collection).
* **Membership**: Link from an Account to an Org and optionally Instances, with a Role.
* **Org Profile**: Per-Org details for a global Account.
* **Local Identifier (Alias)**: Org-scoped login handle mapped to the same global Account.
* **External ID**: Org-issued identifier (optional).
* **Item**: Any asset managed by counts (`total` and `available`).
* **Loan**: A checkout with a due date.
* **Reservation**: A time-boxed hold on availability.
* **Penalty**: Monetary or administrative action (e.g., fees).
* **Blacklist**: Temporary borrowing ban, often scaled by lateness.
* **Roles**: SuperAdmin, Admin, Staff, Borrower.

---

## 4) Stakeholders & Roles

* **SuperAdmin (SaaS operator)**: Manages Orgs, assigns Admins, views system health. No access to tenant data content.
* **Admin (Org)**: Sets policies, manages Instances and memberships, views all data within their Org. An Org Admin implicitly has all Staff capabilities across all Instances in their Org (borrow/return, reservations, manage items, apply/override penalties) in addition to admin functions.
* **Staff (Instance)**: Manages items, borrowers, loans, returns, reservations; can apply and override penalties/blacklists within assigned Instances.
* **Borrower**: Searches, reserves, and borrows items in assigned Instances; views personal history and penalties.

---

## 5) Assumptions & Dependencies

* Users have basic digital literacy.
* Orgs can define and maintain their own policies.
* The platform provides secure sessions, consistent role checks, and tamper-evident audit history.
* File uploads are limited in size and type for reliable performance.

---

## 6) Functional Requirements

### 6.1 Identity & Access (Global Accounts)

1. **Single global Account** per person across all Orgs.
2. **Memberships** grant access to specific Orgs and Instances with roles.
3. **Login options (tenant-configurable)**:

   * Allow **Username**, **Email**, **Local Identifier (Alias, Org-scoped)**, **External ID**—any combination chosen by the Org.
   * Local Identifiers are unique within the Org.
   * External ID can be **Required**, **Optional**, or **Disabled** per Org.
4. **Invitations & onboarding**: Admin/Staff invites existing Accounts, or creates new Accounts, and those Accounts automatically become Members of the Org.
5. **Leaving an Org**: Membership removal is done by Admin/Staff; the global Account remains if there are other active Memberships but access to that Org’s data is revoked.

### 6.2 Tenant & Policy Management

1. **Identity policy**: Which login identifiers are allowed, format rules, uniqueness, and whether External IDs are required.
2. **Circulation policy**:
   * Default loan periods (Org default; Instance override allowed).
   * Renewal limits and conditions (optional).
   * Reservation expiry.
3. **Penalty & Blacklist policy**:
   * Late fee calculation, replacement cost rules, caps, waivers.
   * Blacklist duration formulas (e.g., ratio of overdue days to ban days), minimums/maximums, grace periods.
   * Per-Instance overrides allowed if enabled by the Org.
5. **Custom fields & labels**: Orgs can define additional fields for Items, People, Loans, Reservations and show them in lists and exports.
6. **Policy versioning & audits**: All changes recorded with who/when/what; future-dated changes supported.

### 6.3 Catalog & Inventory

1. **Items**: Create, edit, delete. Optional category.
2. **Counts**: Track `total` and `available`; keep counts consistent across operations.
3. **Search & filter**: By name, category, and custom fields.
4. **Bulk updates**: Optional bulk import/export for Items.

### 6.4 Circulation (Loans & Reservations)

1. **Borrow**:
   * Check Membership, role, and any blacklist.
   * Confirm availability; create Loan; reduce `available`.
   * Set due date from policy; capture borrower contact (in Org Profile).
2. **Return**:
   * Mark returned; increase `available`.
   * If overdue, apply penalties and compute blacklist using policy.
3. **Reservation**:
   * Create hold if available; decrement `available` during the hold.
   * Expire automatically if not claimed; restore `available`.
   * Convert to Loan on claim.
4. **Lost/Damaged**:
   * Mark Loan as lost/damaged; compute replacement or damage cost from policy; optional blacklist according to policy.
5. **Overrides**:
   * Admin/Staff may edit penalties/blacklists with a required reason; all changes are audited.

### 6.5 Files & Attachments

1. Upload files to Item records (e.g., manuals, PDFs) within Org/Instance scope.
2. Enforce size/type limits.
3. Access to attachments respects Roles and Memberships.

### 6.6 Audit & Activity

1. Record important actions: policy changes, membership changes, loans/returns, penalties, overrides, file actions.
2. Provide search and export of audit logs to authorized users.

### 6.7 Extensions & Customizations

1. Tenant-scoped **feature flags** to enable/disable optional features.
2. **Custom fields** visible in forms, lists, and exports.
3. Lightweight hooks or notifications for simple external workflows (where enabled), without changing core behavior.

### 6.8 Admin & Self-Service Portals

1. **Admin**: Configure policies, manage people and memberships, define custom fields, review audits.
2. **Staff**: Everyday operations—items, loans, returns, reservations, attachments, penalties/overrides.
3. **Borrower**: Browse availability, reserve/borrow, view due dates, history, and penalties.

---

## 7) Non-Functional Requirements

### 7.1 Security & Privacy

* Strict Org/Instance scoping on every operation.
* Least-privilege role access.
* Protection of personal contact details; visibility only to authorized roles.
* Tamper-evident audit trail.
* Support for tenant-defined retention and anonymization.

### 7.2 Performance & Scalability

* Responsive experience for typical workloads (e.g., around 100 active users) without noticeable delay in common actions.
* Predictable behavior as tenants and Instances grow, with room to scale service areas independently as needed.

### 7.3 Availability & Reliability

* Safe retries for transient failures and clear, actionable error messages.
* Business-critical operations (borrow/return/reservation) keep counts correct even during failures.

### 7.4 Usability

* Clean, minimal screens with obvious next actions.
* Consistent terminology and in-context help for policies and penalties.
* Accessibility best practices followed.

### 7.5 Maintainability & Extensibility

* Clear separation between identity, policy, catalog, circulation, penalties, files, audits, and extensions.
* New policies and fields can be added without disrupting existing tenants.
* Backward-compatible changes preferred; deprecation windows for breaking changes.

### 7.6 Interoperability (Basic)

* Simple export/import options for items and activity where allowed by tenant policy.
* Optional notifications or webhooks kept lightweight.

---

## 8) Conceptual Information Model (no schemas)

* **Account (global)** ↔ **Memberships** ↔ **Org / Instance**
* **Account (global)** ↔ **Org Profiles (per Org)**
* **Org** → **Instances**
* **Instance** → **Items** (optional **Categories**)
* **Items** ↔ **Loans**, **Reservations**
* **Loans** ↔ **Penalties**, **Blacklists** (policy-driven)
* **Items** ↔ **Attachments**
* **Policies** (Org defaults; Instance overrides)
* **Audit Entries** (across all important actions)

All entities reference the owning Org (and Instance where relevant) for isolation and auditing.

---

## 9) Key Workflows (Narrative)

### 9.1 Onboarding an Organization

1. SuperAdmin creates Org and initial Admin.
2. Admin completes a **policy template**: identity options, circulation defaults, penalties/blacklist formulas, reservation rules, data retention, and any custom fields.
3. Admin sets up Instances (e.g., “Library”, “Workshop”) and optional overrides.

### 9.2 Adding People

1. Admin invites a person by identifier allowed in the identity policy.
2. If the person already has a global Account, the invitation attaches a Membership; otherwise a new global Account is created.
3. Admin assigns roles at Org and relevant Instances; optional Local Identifiers and External IDs are set per policy.

### 9.3 Item Lifecycle

1. Staff creates an Item with counts and optional category.
2. Staff may adjust counts (e.g., new stock); lists and searches reflect changes immediately.

### 9.4 Borrow / Return

1. Staff initiates a borrow: eligibility, availability, and blacklist checked automatically.
2. Loan is created with due date; `available` decreases.
3. On return, the Loan is closed; `available` increases. If overdue, the system computes penalties and blacklist per policy.

### 9.5 Reservation

1. Borrower or Staff places a reservation if availability exists; a temporary hold is created.
2. If not claimed in time, the hold expires and availability is restored.
3. On claim, the reservation converts to a Loan seamlessly.

### 9.6 Lost / Damaged

1. Staff marks a Loan as lost or damaged; the system computes replacement or damage cost and applies blacklist rules if configured.

### 9.7 Overrides & Appeals

1. Admin/Staff may override a penalty or blacklist with a reason; the change is fully audited for later review.

### 9.8 Leaving an Org

1. Membership removals take effect immediately; access ends.
2. Org Profile is **removed** if there's no other active Membership; otherwise, it is preserved.

---

## 10) Business Rules (Configurable)

* **Identity**: Allowed login identifiers; uniqueness scope for usernames; Local Identifier format and uniqueness per Org; External ID requirement.
* **RBAC**: Admin role includes Staff privileges across all Instances in their Org by default; optional Org policy can require explicit Staff assignment for operational actions.
* **Loan periods**: Defaults by Org; optional per-Instance overrides.
* **Reservations**: Expiry times, pickup windows, queue limits.
* **Penalties**: Late fee formulas, rounding rules, maximum caps, waivers.
* **Blacklist**: Duration scaling (e.g., X days late → Y days banned), grace periods, minimum/maximum thresholds, per-Instance overrides if enabled.
* **Counts**: All circulation events must leave counts correct.
* **Auditing**: Every policy change, override, and identity event must be recorded with actor, target, timestamp, and reason when applicable.

---

## 11) User Experience Requirements

* Clear indicator of the **current Org and Instance**, with a simple switcher when a user has multiple.
* Lists for Items, Loans, Reservations with inline editing for frequent actions (e.g., count updates, quick category add).
* Prominent status badges for due dates, overdue, penalties, and blacklist.
* Admin screens group policy settings by topic (Identity, Circulation, Penalties, Reservations, Retention).
* Helpful, plain-language explanations and examples for policy fields (e.g., “1 overdue day = 3 ban days”).
* Consistent empty states, confirmations, and undo/rollback where safe.

---

## 12) SaaS Operating Model

### 12.1 Tenant Onboarding

* Guided setup wizard covering identity options, circulation defaults, penalties/blacklist, reservation rules, retention choices, custom fields, and branding.

### 12.2 Handling Feature Requests

* Prefer adding **policy options**, **custom fields**, or **extension hooks** instead of code changes.
* When changes are needed, introduce them as optional features that default off, with clear migration notes.

### 12.3 Versioning & Change Management

* Policy changes can be future-dated and are always audited.
* Product changes strive for backward-compatible behavior; deprecations include a grace period and communication.

### 12.4 Support & Service Levels (Conceptual)

* Defined channels for issue reporting and status updates.
* Clear expectations for response times and resolution targets (details set by the SaaS operator).

---

## 13) Acceptance Criteria (with Security Considerations)

1. **Single Global Account**

   * Inviting someone who already has an Account attaches a Membership, not a duplicate.
   * Merges are available for legacy duplicates with full audit.

2. **Identity Options Work as Configured**

   * Per-Org login accepts only the allowed identifiers (Username, Email, Local Identifier, External ID).
   * Username uniqueness and Local Identifier rules are enforced correctly.

3. **Isolation**

   * A user can only see data for Orgs/Instances where they have Memberships.
   * Attempts to access other tenants’ data are blocked and audited.

4. **Circulation Correctness**

   * Borrow/Return/Reservation keep counts correct at all times.
   * Due dates reflect policy; renewal limits and reservation expiry behave as configured.

5. **Penalties & Blacklists**

   * Overdue calculations match the policy; blacklist durations scale correctly and respect minimums/maximums and grace periods.
   * Overrides are restricted to authorized roles and always audited.

6. **Reservations**

   * Holds reduce availability; expiration restores it; conversion to Loan does not create conflicts.

7. **Files**

   * Attachments obey size/type limits and are visible only within the correct Org/Instance and roles.

8. **Retention**

   * On leaving an Org, the chosen policy (preserve/anonymize/remove) is executed and recorded.

9. **Usability**

   * Users can complete core tasks (borrow, return, reserve, manage items) without training, using on-screen guidance.
   * Policy screens are understandable and validated with examples.

10. **Auditability**

* Identity events, policy changes, overrides, and sensitive actions are traceable end-to-end.

---

## 14) Out of Scope (MVP)

* Payments and invoicing for penalties or fees.
* Advanced analytics dashboards.
* Mobile applications.
* Complex third-party integrations beyond basic exports or lightweight notifications.

---

## 15) Risks & Mitigations

* **Policy Complexity**: Too many options may confuse tenants → Provide sensible defaults, examples, and inline guidance.
* **Duplicate Legacy Users**: Past systems may contain duplicates → Provide a safe merge process with audit.
* **Disputes on Penalties**: Users may contest outcomes → Keep transparent policy history and require reasons for overrides.
* **Data Retention Variability**: Different jurisdictions impose different rules → Allow per-Org retention choices and document them.

---

## 16) Appendices

### 16.1 Policy Template (Starter)

* **Identity**:

  * Allowed login identifiers: ☐ Username ☐ Email ☐ Local Identifier ☐ External ID (Required ☐ / Optional ☐ / Disabled ☐)
  * Username scope: ☐ Global unique
  * Local Identifier format (example): `[a-z0-9_]{4,20}`

* **Circulation**:

  * Default loan days: \_\_\_; Renewal limit: \_\_\_; Renewal conditions: \_\_\_\_\_\_\_\_\_\_
  * Reservation expiry (hours/days): \_\_\_; Pickup window: \_\_\_

* **Penalties & Blacklist**:

  * Late fee: \_\_\_\_\_\_\_\_\_\_; Replacement cost method: \_\_\_\_\_\_\_\_\_\_; Caps: \_\_\_\_\_\_\_\_\_\_
  * Blacklist: `ban_days = overdue_days × ___` (min \_\_\_ / max \_\_\_); Grace: \_\_\_ days

* **Retention**:

  * Borrower self-request allowed: ☐ Yes ☐ No

* **Custom Fields**:

  * Items: \[Field name → type/choices]
  * People: \[Field name → type/choices]
  * Loans/Reservations: \[Field name → type/choices]

### 16.2 Onboarding Checklist

1. Create Org and initial Admin.
2. Complete policy template and set any Instance overrides.
3. Define roles and membership rules.
4. Add Items (optionally import).
5. Invite Staff and Borrowers; assign roles and, if applicable, Local Identifiers/External IDs.
6. Test borrow/return/reservation, penalties, and blacklist with sample data.
7. Review audit and retention behaviors.
