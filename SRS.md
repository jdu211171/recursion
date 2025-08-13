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
- **As a staff, I want to *track item quantities (total/available counts) for new items* so that assets are manageable at an aggregate level while supporting borrowing.**
- **As a user/borrower, I want to borrow an item for a specified period so that I can use it temporarily and return it on time.**
- **As a staff, I want to record user information (e.g., name, ID, contact) during lending so that I can identify and contact them later if needed.**
- **As a user/borrower, I want to reserve an item in advance so that it's held for me when available.**
- **As a staff/admin, I want to apply penalties for lost items so that users pay a specified amount to cover replacement costs.**
- **As a system, I want to automatically blacklist users who return items late, with temporary lending disables that increase dynamically based on lateness severity, so that repeat offenders are discouraged.**
- **As a staff/admin, I want to edit or override punishments (e.g., blacklist duration or penalties) so that I can handle special cases flexibly.**
- **As a staff, I want to attach files (e.g., PDF versions or documentation) to item records so that digital assets are stored and accessible within the system.**

Functional requirements:
- Support hierarchical multi-tenancy with isolated data per organization (top-level tenant) and per instance within organizations (sub-tenants for specific item management, e.g., books vs. sports items in a school), including tenant-specific configurations for items, users, and rules.
- Enable generalized CRUD operations for items/assets, including *quantity tracking (total/available counts)*, category assignment, *simplified for aggregate management*, adaptable to any borrowing scenario.
- Implement lending and returning workflows, including due dates, user identification, and status tracking, across tenants and sub-instances *using count decrements/increments*.
- Provide item reservation system with availability checks and holds, tenant-aware and scoped to instances *based on available counts*.
- Manage user penalties for lost or late returns, including financial amounts and blacklist enforcement, customizable per tenant/instance.
- Provide role-based editing for punishments (librarian/admin only), with tenant scoping.
- Integrate file storage for attaching documents (e.g., PDFs or manuals) to item entries, secured per tenant/instance.

Non-functional requirements:
- The system must handle relational data efficiently (e.g., items to categories, *borrowings to item counts*, users to borrowings) to ensure scalability for hierarchical multi-tenant environments (organizations and instances) and diverse borrowing/lending scenarios.
- Blacklist and penalty logic should be dynamic, configurable per tenant/instance, with security to prevent unauthorized edits or cross-tenant access.
- File storage should be secure, with limits on file sizes/types to maintain performance and prevent abuse, and isolated by tenant/instance.
- UI/UX should remain simple and intuitive, with clear notifications for reservations, due dates, and penalties, while supporting multi-tenant navigation (e.g., switching organizations or instances if authorized) *and in-place actions like category creation or count updates*.

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
- CRUD for items works seamlessly: *Counts auto-managed*, categories optional, *aggregate quantities handled*; verified with at least 3 item types (e.g., book, tool, equipment). Security: Role-based access (admins only for creates/edits); input validation to prevent SQL injection.
- Lending/returning flows: Due dates enforced, user info recorded, status updates in real-time; tested with overdue scenarios triggering blacklists/penalties *via count adjustments*. Security: Encrypt user contact data; ensure blacklists are tenant-scoped to avoid global leaks.
- Reservations: Availability checks accurate, holds expire if not claimed; multi-user conflict tests pass *using count reductions*. Security: Prevent reservation spoofing via auth tokens.
- Penalties and overrides: Auto-blacklist scales with lateness (e.g., 1 day = 3-day ban, configurable); admins can edit via UI. Security: Admin-only endpoints with RBAC; log all overrides for auditing.
- File attachments: Uploads succeed for PDFs/manuals (<25MB), accessible only within tenant/instance. Security: Access controlled by roles.
- System-wide: UI intuitive (e.g., dropdowns for org/instance switching, *in-place edits*), performance under load (100 concurrent users), errors handled gracefully. Security: HTTPS everywhere, JWT validation, rate limiting to prevent DDoS.

Project Scope:
- In Scope: Hierarchical multi-tenancy (organizations and instances), generalized borrowing/lending for any items, microservices architecture, basic CRUD/reservation/penalty features, file storage, RBAC auth, Agile/DevOps workflows, relational data management *simplified with counts*.
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

**Infrastructure Architecture**:
- **Core Overview**: Microservices with Docker for independent deployment and multi-tenancy isolation. Services communicate via REST APIs (JSON); use Nginx as API gateway for routing/security.
  - Diagram:
    ```
    [User] --> [API Gateway (Nginx)] --> [Frontend (React Static)]
                         |
                         +--> [Auth Service (Node.js)] <--> [Database (PostgreSQL)]
                         |
                         +--> [Business Logic (Node.js)] <--> [Database] <--> [File Storage (MinIO)]
    ```
    - **Database Setup**: PostgreSQL with org_id/instance_id in tables; row-level security for isolation. Use Prisma ORM for queries.
    - **Backend/Frontend Services**: Node.js/Express/TypeScript for auth (JWT with scopes) and business logic (CRUD/lending). Static React frontend. MinIO buckets per tenant (<25MB file limit).
    - **Deployment**: Docker Compose for local/dev; prepare Kubernetes for prod. CI/CD via GitHub Actions for auto-build/test/deploy. HTTPS/RBAC for security.

    Development method (Agile, Waterfall, Hybrid):
    - Agile

    CI/CD pipeline design:
    - Not decided yet

    Authentication flow, Authorization and Role management:
    - Flow: User logs in via Auth Service (username/password or OAuth), receives JWT with roles (e.g., admin, staff, borrower) and tenant/instance scopes. All API calls validate JWT, check scopes against requested org/instance.
    - Authorization: RBAC via middleware—e.g., admins edit penalties across their org/instances; staff handle lending within instances; borrowers view/reserve only. Use libraries like express-jwt for simplicity.

    # Microservices Definition

    ### Clear Objectives and Scope for Each Microservice
    - **Objectives**: Each microservice aims to handle a specific domain (e.g., authentication, business logic) with clear boundaries to promote loose coupling, independent scaling, and fault isolation. They support multi-tenancy through tenant/instance IDs in data models and API scopes, enabling data isolation and configurable rules per organization/instance.
    - **Scope**: Limited to MVP features—hierarchical CRUD, lending workflows, reservations, penalties/blacklists, file storage, and RBAC. Out of scope: Advanced features like analytics, payments, or external integrations. Each service focuses on its responsibilities, with inter-service communication via standardized APIs for resilience.

    ### Identified Microservices
    To keep the architecture simple and maintainable for junior developers, we'll use the following minimal set of microservices, building on the initial stack:
    1. **Frontend Service** (Client-side UI, deployed as a static app).
    2. **Authentication Service** (Handles user auth and role management).
    3. **Business Logic Service** (Core application logic for CRUD, lending, etc.).
    4. **File Storage Service** (Secure storage for attachments).

    Note: The Database (PostgreSQL) is treated as a dedicated infrastructure service rather than a traditional microservice, hosted separately for isolation but shared across services with row-level security for multi-tenancy. This avoids over-fragmentation while ensuring scalability.

    ## Detailed Microservice Breakdown

    ### Frontend Service
    - **Purpose**: Provides an intuitive user interface for all interactions, including multi-tenant navigation (e.g., org/instance switching), item management, lending/reservations, and penalty overrides, ensuring simplicity for borrowers, staff, and admins.
    - **Recommended Technology Stack**: React with TypeScript for type safety and maintainability; Material-UI, ShadCn or custom components for simple, responsive components; Docker for containerized deployment; Nginx for serving static files.
    - **Core Responsibilities**:
    - Render UI components for CRUD operations, lending/returning flows, reservations, and file uploads/views.
    - Handle client-side state management (e.g., via Redux) for tenant-specific views.
    - Integrate with backend APIs via REST calls, displaying notifications for due dates, penalties, and errors.
    - Support role-based UI elements (e.g., hide admin features for borrowers).
    - **Applicable Best Practices**:
    - Keep UI intuitive and minimal: Use clear labels, dropdowns for tenant switching, and avoid complex animations to ensure accessibility.
    - Foster open communication: Include feedback mechanisms (e.g., tooltips) and regular UI testing in Agile sprints.
    - Avoid micromanagement: Delegate API calls to hooks/utilities for clean code.
    - Engage in ongoing planning: Use component libraries for rapid iteration and A/B testing for UX refinements.

    ### Authentication Service
    - **Purpose**: Manages secure user authentication, authorization, and role-based access control (RBAC) across tenants, ensuring data isolation and preventing cross-tenant access.
    - **Recommended Technology Stack**: Node.js with Express and TypeScript for simplicity; JWT for token management; Docker for deployment; Integrate with PostgreSQL for user/role storage.
    - **Core Responsibilities**:
    - Handle login/signup flows (username/password or OAuth), issuing JWTs with roles (admin, staff, borrower) and tenant/instance scopes.
    - Validate tokens for all API requests, enforcing RBAC (e.g., admins can override penalties within their org).
    - Manage user blacklists dynamically based on penalties from the Business Logic Service.
    - Provide endpoints for role updates and tenant switching (if authorized).
    - **Applicable Best Practices**:
    - Implement proactive risk management: Use secure hashing (e.g., bcrypt) and rate limiting to mitigate brute-force attacks.
    - Track progress and KPIs: Log auth attempts and monitor failed logins for security alerts.
    - Ensure quality assurance: Unit test token validation and integration test with other services.
    - Define roles clearly: Use a RACI matrix for auth-related tasks (e.g., who manages user roles).

    ### Business Logic Service
    - **Purpose**: Encapsulates the core domain logic for borrowing/lending operations, ensuring generalized handling for any item type across multi-tenant hierarchies.
    - **Recommended Technology Stack**: Node.js with Express and TypeScript for concise code; Prisma ORM for database interactions; Docker for deployment; Jest for testing.
    - **Core Responsibilities**:
    - Perform CRUD on items (*with quantity counts*), scoped to tenants/instances.
    - Manage lending/returning workflows: Record user info, set due dates, track status, and trigger penalties/blacklists *via count updates*.
    - Handle reservations: Check availability, place holds, and resolve conflicts *based on available counts*.
    - Apply/enforce penalties: Calculate fines/blacklists dynamically (configurable per tenant) and allow admin overrides.
    - Integrate with File Storage for attachment metadata.
    - **Applicable Best Practices**:
    - Manage changes formally: Use versioned APIs and change logs to handle schema updates without breaking tenants.
    - Engage in ongoing adaptation: Implement event-driven triggers (e.g., for overdue notifications) with flexibility for config changes.
    - Track variances: Use metrics like borrowing throughput and error rates for monitoring.
    - Keep simple: Clear, modular code with comments for junior devs; avoid deep nesting.

    ### File Storage Service
    - **Purpose**: Provides secure, isolated storage for item attachments (e.g., PDFs, manuals), ensuring tenant-specific access and performance limits.
    - **Recommended Technology Stack**: MinIO (S3-compatible) for self-hosted, cloud-agnostic storage; Docker for deployment; Integrate via SDKs in Node.js services.
    - **Core Responsibilities**:
    - Handle file uploads/downloads with size/type limits (<25MB, PDFs/images).
    - Create tenant/instance-specific buckets for data isolation.
    - Generate presigned URLs for secure access, integrated with RBAC from Auth Service.
    - Manage file metadata (e.g., linked to item IDs) stored in the database.
    - **Applicable Best Practices**:
    - Proactive risk management: Encrypt files at rest and enforce access controls to prevent leaks.
    - Ensure quality control: Validate file integrity on upload and monitor storage usage.
    - Track progress: Log upload failures and set alerts for quota exceedances.
    - Avoid complexity: Use standard S3 APIs for easy integration and migration.

    ## Microservice Communication Patterns and Overall Architecture
    - **Communication Patterns**:
    - **Synchronous**: Use RESTful APIs with JSON payloads for direct interactions (e.g., Frontend calls Auth for login, then Business Logic for CRUD). Employ gRPC for high-performance needs if latency becomes an issue (start with REST for simplicity).
    - **Asynchronous**: Introduce message queues (e.g., RabbitMQ) for non-critical tasks like penalty notifications or blacklist updates to decouple services and improve resilience.
    - **API Gateway**: Nginx as a central entry point for routing requests, load balancing, and adding security (e.g., HTTPS termination, rate limiting).
    - **Service Discovery**: Use Docker Compose environment variables for dev; Consul or Kubernetes service mesh for prod to handle dynamic scaling.
    - **Error Handling**: Standardized responses (e.g., {error: "message", code: 400}) with retries/circuit breakers (e.g., via libraries like Axios) for fault tolerance.

    - **Overall Architecture**:
    - **Diagram** (Text-based for documentation):
    ```
    [User] --> [API Gateway (Nginx)] --> [Frontend Service (React)]
                         |
                         +--> [Authentication Service (Node.js)] <--> [Database (PostgreSQL)]
                         |
                         +--> [Business Logic Service (Node.js)] <--> [Database] <--> [File Storage Service (MinIO)]
    ```
    - **Key Principles**: Loose coupling via APIs; database shared with row-level security (org_id/instance_id filters); all services Dockerized for independent deployment. Monitoring via Prometheus/Grafana for cross-service health. Supports Agile by allowing per-service updates without full system downtime.

    ## Microservice Management Best Practices as Project Rules/Guidelines
    - **Rule 1: Define Clear Boundaries and Ownership** – Assign each microservice to a small team or developer for accountability; use domain-driven design to avoid overlap (e.g., Auth owns roles, Business Logic owns workflows).
    - **Rule 2: Prioritize Independent Deployability** – Each service must build, test, and deploy via CI/CD (e.g., GitHub Actions) without affecting others; version APIs semantically to manage changes.
    - **Rule 3: Implement Monitoring and Logging** – Use centralized tools (e.g., ELK stack) for logs/errors; track KPIs like response times and error rates per service to enable proactive issue resolution.
    - **Rule 4: Enforce Security and Isolation** – Apply RBAC/JWT consistently; use tenant IDs in all operations; conduct regular security audits and penetration testing.
    - **Rule 5: Keep Services Simple and Scalable** – Limit each service to one primary responsibility; scale horizontally with containers/Kubernetes; conduct load testing for multi-tenant loads.
    - **Rule 6: Foster Collaboration and Retrospectives** – Hold cross-team reviews in Agile sprints; document APIs (e.g., via Swagger) for easy onboarding; learn from deployments by analyzing post-mortems.
    - **Rule 7: Manage Data Consistency** – Use eventual consistency for async ops; transactions within services for critical flows (e.g., lending + penalty calc); backup databases regularly with tenant isolation in mind.

## Initial Setup and Admin User

For initial deployment:
1. The database schema includes seeders for creating an initial organization "City University Library"
2. Default admin credentials should be created with the email admin@cityuniversitylibrary.com
3. The initial user MUST have the 'ADMIN' role to access organization management features
4. Use the SQL script at `infrastructure/db-init/update-admin-role.sql` to promote users to admin role
5. After role updates, users must log out and log back in to receive updated JWT tokens
