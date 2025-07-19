# Requirements Definition

- Priority #1: Design the system as multi-tenant to support multiple organizations, allowing independent data isolation, configurations, and usage across different entities (e.g., separate inventories, users, and rules per organization). Within each organization, support multiple instances (e.g., sub-tenants for managing specific categories like books, sports items, or tools in a school setting), enabling granular management while maintaining hierarchical relationships and isolation. The core borrowing/lending logic must be generalized for any item type (e.g., books, tools, equipment), not limited to books, enabling broad applicability in various scenarios.

- The project must follow DevOps and Agile workflows: introduce new features, run tests, and deploy to the server automatically once all tests pass.

- Keep the implementation as simple as possible:  
  - Backend code should be clear and concise so junior developers can pick it up instantly.  
  - Frontend UI must be intuitive for any user, without unnecessary design complexity.

- Architect the app as microservices:  
  - Frontend deployed independently  
  - Authentication service hosted separately  
  - Database hosted on its own service  
  - Controller/business logic in distinct service(s)

- Focus on managing deep, multi-layer relational data for full CRUD, lending, and returning operations.  
  **The design must support any borrowing/lending scenario (e.g., books in libraries, tools in workshops, equipment in organizations), using the library example only as an optional illustration if needed.**


**Use cases & User stories:**
- **As a staff/admin, I want to categorize items optionally so that I can organize the inventory by themes or types for easier searching across tenants.**
- **As a staff, I want to assign unique IDs to new items (including multiple copies of the same item) so that each asset is trackable individually while maintaining relationships between copies.**
- **As a user/borrower, I want to borrow an item for a specified period so that I can use it temporarily and return it on time.**
- **As a staff, I want to record user information (e.g., name, ID, contact) during lending so that I can identify and contact them later if needed.**
- **As a user/borrower, I want to reserve an item in advance so that it's held for me when available.**
- **As a staff/admin, I want to apply penalties for lost items so that users pay a specified amount to cover replacement costs.**
- **As a system, I want to automatically blacklist users who return items late, with temporary lending disables that increase dynamically based on lateness severity, so that repeat offenders are discouraged.**
- **As a staff/admin, I want to edit or override punishments (e.g., blacklist duration or penalties) so that I can handle special cases flexibly.**
- **As a staff, I want to attach files (e.g., PDF versions or documentation) to item records so that digital assets are stored and accessible within the system.**

Functional requirements:
- Support hierarchical multi-tenancy with isolated data per organization (top-level tenant) and per instance within organizations (sub-tenants for specific item management, e.g., books vs. sports items in a school), including tenant-specific configurations for items, users, and rules.
- Enable generalized CRUD operations for items/assets, including unique ID assignment, category assignment, and handling multiple copies with relational links, adaptable to any borrowing scenario.
- Implement lending and returning workflows, including due dates, user identification, and status tracking, across tenants and sub-instances.
- Provide item reservation system with availability checks and holds, tenant-aware and scoped to instances.
- Manage user penalties for lost or late returns, including financial amounts and blacklist enforcement, customizable per tenant/instance.
- Provide role-based editing for punishments (librarian/admin only), with tenant scoping.
- Integrate file storage for attaching documents (e.g., PDFs or manuals) to item entries, secured per tenant/instance.

Non-functional requirements:
- The system must handle relational data efficiently (e.g., items to categories, copies to parent items, users to borrowings) to ensure scalability for hierarchical multi-tenant environments (organizations and instances) and diverse borrowing/lending scenarios.
- Blacklist and penalty logic should be dynamic, configurable per tenant/instance, with security to prevent unauthorized edits or cross-tenant access.
- File storage should be secure, with limits on file sizes/types to maintain performance and prevent abuse, and isolated by tenant/instance.
- UI/UX should remain simple and intuitive, with clear notifications for reservations, due dates, and penalties, while supporting multi-tenant navigation (e.g., switching organizations or instances if authorized).

**Technical requirements:**
- **Use containerization (e.g., Docker) for all microservices to ensure independent deployment, portability, and scalability in hierarchical multi-tenant environments.**
- **Implement API communication via RESTful endpoints or gRPC for efficiency, with JSON for data exchange to keep integrations simple.**
- **Incorporate logging and monitoring (e.g., ELK stack or Prometheus/Grafana) to track system health, errors, and performance metrics across services.**
- **Support file storage using cloud-agnostic solutions (e.g., S3-compatible storage) with secure access controls and tenant/instance isolation.**
- **Ensure database schema supports hierarchical multi-tenancy (e.g., via organization IDs and instance IDs in tables or schema-per-tenant) for data isolation and query efficiency.**
- **Follow coding standards: Use TypeScript for type safety, linting (e.g., ESLint), and testing frameworks (e.g., Jest) to maintain code clarity for junior developers.**
- **Handle errors gracefully with standardized responses and retries for resilience in distributed microservices.**

Acceptance criteria (with Security Considerations):
- Multi-tenancy hierarchy is enforced: Data for one organization/instance cannot be accessed by another; tested via isolated CRUD operations across simulated tenants (e.g., School Org with Books Instance and Sports Instance). Security: Use tenant/instance IDs in all queries to prevent cross-access; audit logs capture unauthorized attempts.
- CRUD for items works seamlessly: Unique IDs auto-assigned, categories optional, multiple copies linked relationally; verified with at least 3 item types (e.g., book, tool, equipment). Security: Role-based access (admins only for creates/edits); input validation to prevent SQL injection.
- Lending/returning flows: Due dates enforced, user info recorded, status updates in real-time; tested with overdue scenarios triggering blacklists/penalties. Security: Encrypt user contact data; ensure blacklists are tenant-scoped to avoid global leaks.
- Reservations: Availability checks accurate, holds expire if not claimed; multi-user conflict tests pass. Security: Prevent reservation spoofing via auth tokens.
- Penalties and overrides: Auto-blacklist scales with lateness (e.g., 1 day = 3-day ban, configurable); admins can edit via UI. Security: Admin-only endpoints with RBAC; log all overrides for auditing.
- File attachments: Uploads succeed for PDFs/manuals (<5MB), accessible only within tenant/instance. Security: Virus scanning on uploads; access controlled by roles.
- System-wide: UI intuitive (e.g., dropdowns for org/instance switching), performance under load (100 concurrent users), errors handled gracefully. Security: HTTPS everywhere, JWT validation, rate limiting to prevent DDoS.

Project Scope:
- In Scope: Hierarchical multi-tenancy (organizations and instances), generalized borrowing/lending for any items, microservices architecture, basic CRUD/reservation/penalty features, file storage, RBAC auth, Agile/DevOps workflows, relational data management.
- Out of Scope: Advanced analytics (e.g., reporting dashboards), payment integrations for penalties, mobile apps, AI-driven recommendations, non-essential integrations (e.g., email notifications beyond basics). Focus on core MVP for scalability; future sprints can add enhancements.
- Assumptions: Users have basic tech literacy; cloud infrastructure available for deployment. Risks: Data migration for existing tenants—mitigate with schema versioning.

Software Requirement Specification (SRS):
1. Introduction: Purpose is a scalable, multi-tenant borrowing/lending system for organizations with sub-instances, generalized for any items.
2. Overall Description: Microservices-based, user roles (admin, staff, borrower), supports use cases above.
3. Specific Requirements: As detailed in Functional/Non-Functional sections; interfaces via REST APIs, data via JSON.
4. Supporting Information: Standards (TypeScript, Docker), constraints (no internet-dependent features in core logic).

Project type (Monolithic, Microservice):
- Microservice

Stack for each service:
- Frontend: React with TypeScript (for intuitive UI), deployed via Docker; use Material-UI for simple components.
- Authentication Service: Node.js with Express/TypeScript, JWT for tokens, hosted in Docker; integrates with database for user roles.
- Database Service: PostgreSQL (relational for deep links), with Docker; schema includes tenant/org/instance IDs for isolation.
- Business Logic Service: Node.js with Express/TypeScript, handling CRUD/lending/reservations/penalties; Dockerized, communicates via REST.
- File Storage: MinIO (S3-compatible, self-hosted in Docker) for cloud-agnostic, secure uploads with tenant buckets.

Development method (Agile, Waterfall, Hybrid):
- Agile (sprints of 2 weeks: e.g., Sprint 1: Multi-tenancy setup; Sprint 2: CRUD features; include daily stand-ups, retrospectives for continuous improvement).

CI/CD pipeline design:
- Use GitHub Actions: On push to main, run linting/tests (Jest/ESLint), build Docker images, deploy to staging if tests pass; promote to production via manual approval. Integrate with Kubernetes for orchestration if scaling needed. Monitor with Prometheus for alerts on failures.

Authentication flow, Authorization and Role management:
- Flow: User logs in via Auth Service (username/password or OAuth), receives JWT with roles (e.g., admin, staff, borrower) and tenant/instance scopes. All API calls validate JWT, check scopes against requested org/instance.
- Authorization: RBAC via middleware—e.g., admins edit penalties across their org/instances; staff handle lending within instances; borrowers view/reserve only. Use libraries like express-jwt for simplicity.

Sketch the data model and relationships:
-