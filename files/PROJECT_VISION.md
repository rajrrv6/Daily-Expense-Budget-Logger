# Project Vision - Daily Expense & Budget Logger (Enterprise Edition)

## 🎯 Objectives
The primary objective of the **Daily Expense & Budget Logger (Enterprise Edition)** is to establish a secure, robust, and highly scalable financial tracking foundation. It aims to solve the core difficulties of personal expense tracking—lack of automation, visual insights, security, and structured records—while maintaining an enterprise-grade system architecture. This setup ensures that future migrations to multi-user, multi-departmental corporate expense monitoring can happen seamlessly without rewriting the core data structures or core API layer.

## 🔍 Scope
- **In-Scope**:
  - Secure JWT-based stateless user registration, authentication, and profile management.
  - Expense logger with transaction tracking (Expense Name, Category, Amount, Transaction Date).
  - Soft-delete auditing mechanism to track modifications and deletions.
  - Interactive dashboard containing aggregated financial indicators (Total Monthly Spending, Budget Progress, Category Breakdowns).
  - Personal shopping checklist (to-do list) supporting interactive state updates.
  - Dynamic financial analytics via charts (Category Pie charts, Monthly Trend Bar charts).
  - Export capabilities generating standardized accounting reports in CSV format.
- **Out-of-Scope (Phase 1 / Core Release)**:
  - Role-Based Access Control (RBAC).
  - Multi-user department tracking.
  - Automatic receipt scanning.
  - Predictive expense analytics.
  - Bank account API sync.

## 🏗️ Design Decisions
1. **Monolithic spring-Boot backend with stateless API design**:
   - *Rationale*: A structured monolith provides fast development, high maintainability, and clean code boundaries. Moving to microservices is unnecessary in the early stages, but strict separation of controller-service-repository makes eventual extraction straightforward.
2. **Stateless JWT-based auth over stateful sessions**:
   - *Rationale*: Prepares the API to scale horizontally. Eliminates the database bottleneck of active session tracking and enables secure REST client access.
3. **Soft-delete strategy (`deleted_at` timestamp)**:
   - *Rationale*: Financial applications require strict audit trails. Soft deletion preserves database records for audit and analytics while keeping the user interface clean of "deleted" transactions.
4. **Tailwind CSS & Context API frontend**:
   - *Rationale*: Eliminates redundant state libraries for a simple single-user app while ensuring a modern, glassmorphic UI with clean responsive styling.

## 💎 Advantages
- **Security-First Foundation**: Implements industry-standard BCrypt hashing and secure JWT signing keys from day one, preventing common security injection and sniffing attacks.
- **High Visual Engagement**: Dynamic dashboard utilizes advanced SVG charting via Recharts to provide instant visual feedback on budget utilization.
- **Clean Audit Trail**: Soft deletes and audit timestamps on all core database tables ensure compliance with enterprise-level transaction logging standards.
- **Low Structural Complexity**: Single-user design avoids RBAC complexity in Phase 1, speeding time to market while building on code structures that support modular extensions.

## ⚠️ Risks & Mitigations
1. **Risk**: Complexity of future RBAC integration after single-user code is deployed.
   - *Mitigation*: The `users` table is mapped with a schema that includes a placeholder structure for roles/permissions, and all API endpoints are constructed with Spring Security pre-authorization annotations ready to accept security roles without structural code changes.
2. **Risk**: Performance degradation with high volume of expense records.
   - *Mitigation*: Indexing strategies on fields like `user_id`, `category_id`, and `transaction_date` are defined from the start. Pagination and dynamic query filters are strictly mandated for the ledger APIs.

## 🚀 Future Scalability Notes
- **Transition to Multi-User Department Tracking**: The database is structured with a distinct owner ID field (`user_id`) on all expense and task records, paving the way for query filtration when multi-user department sharing is enabled.
- **AI Forecasting & Receipt Scanning**: The architecture isolates the expense creation service via DTOs, enabling plug-and-play integrations with external microservices (like Python-based FastAPI models for receipt scanning and financial trend forecasting) using standard HTTP or AMQP protocols.

## 🛠️ Best Practices
- **SOLID Design Principles**: Each component of the Java Spring Boot backend will execute a single responsibility (e.g., controllers only handle requests/validation; service classes handle business logic).
- **OWASP Top 10 Safeguards**: Protection against SQL Injection (via JPA parameterized queries), XSS (via React auto-escaping), and Broken Object-Level Authorization (via verification that the `user_id` matches the token context on every request).
- **Clean Code & Self-Documentation**: Explicit variable naming, typing, and absolute documentation consistency across all files.
