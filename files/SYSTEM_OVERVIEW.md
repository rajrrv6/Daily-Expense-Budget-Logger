# System Overview - Daily Expense & Budget Logger (Enterprise Edition)

## 🎯 Objectives
The primary objective of the **System Overview** is to outline the structural topology, user data paths, component dependencies, and design layout of the application. It acts as the central reference guide for new engineers to understand how the React client, Spring Boot server, and PostgreSQL database interact securely under a stateless paradigm.

## 🔍 Scope
- **In-Scope**:
  - Logical design layout of frontend client and backend controller-service-repository layers.
  - Integration interface descriptions (REST, JSON payloads, HTTP headers).
  - Persistence strategy and connection pool mechanisms.
  - Stateless request propagation through security filters.
- **Out-of-Scope**:
  - Details of individual API routing endpoints (delegated to `api_planning.md`).
  - Internal database index tree mechanics (delegated to `database_planning.md`).

## 🏗️ Design Decisions
1. **Stateless REST Communication model**:
   - *Rationale*: Frontend and backend communicate purely over HTTPS utilizing JSON formats. The backend holds no session state. Session validation relies entirely on JWT validation within incoming request headers.
2. **Three-Tier Architecture**:
   - *Rationale*: Clean division between Presentation Tier (React SPA), Logic Tier (Spring Boot REST API), and Data Tier (PostgreSQL). Ensures that changes to one layer do not cascade destructively into other layers.

---

## 🔀 Logical Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                              PRESENTATION TIER (React)                            |
|                                                                                   |
|  +------------------+     +-------------------+     +--------------------------+  |
|  |    Public Views  |     |  Protected Views  |     |      State Managers      |  |
|  | - Landing Page   |     | - Dashboard       |     | - Auth Context           |  |
|  | - Register / Form|     | - Expense Ledger  |     | - Expense Context        |  |
|  | - Login Form     |     | - Analytics View  |     | - Theme Provider         |  |
|  +------------------+     +-------------------+     +--------------------------+  |
+----------------------------------------|------------------------------------------+
                                         | HTTPS (JSON / JWT Bearer)
                                         v
+-----------------------------------------------------------------------------------+
|                                LOGIC TIER (Spring Boot)                           |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                              Security Filter Chain                          |  |
|  |  [CORS Filter] -> [CSRF Disable] -> [JWT Filter] -> [Authentication Entry]   |  |
|  +-------------------------------------|---------------------------------------+  |
|                                        v Passed Request Context
|  +-----------------------------------------------------------------------------+  |
|  |                              Controller Layer                               |  |
|  |  - Auth Controller     - Expense Controller     - To-Do Controller          |  |
|  +-------------------------------------|---------------------------------------+  |
|                                        v Validated DTOs
|  +-----------------------------------------------------------------------------+  |
|  |                                Service Layer                                |  |
|  |  - Auth Service        - Expense Service        - Audit Log Service         |  |
|  +-------------------------------------|---------------------------------------+  |
|                                        v Transaction boundaries
|  +-----------------------------------------------------------------------------+  |
|  |                              Repository Layer                               |  |
|  |  - Spring Data JPA Interfaces mapping Entity classes                        |  |
|  +-----------------------------------------------------------------------------+  |
+----------------------------------------|------------------------------------------+
                                         | JDBC / Hibernate Connection Pool
                                         v
+-----------------------------------------------------------------------------------+
|                                 DATA TIER (PostgreSQL)                            |
|                                                                                   |
|    [users] <----1:N----> [expenses] <----N:1----> [categories]                    |
|       ^                                                                           |
|       +--------1:N----> [todo_items]                                              |
+-----------------------------------------------------------------------------------+
```

---

## 💎 Advantages
- **Component Independence**: Developers can iterate frontend layout designs and UI modules without impacting backend database transaction logic.
- **Improved Security Control**: Single entrance filter chain ensures all requests are parsed for valid JWT headers and CORS policies before invoking business logic code.
- **Predictable Error Propagation**: The clear boundaries between tiers enable standard HTTP error responses to map directly to frontend user interface elements (e.g. invalid forms, resource not found).

## ⚠️ Risks & Mitigations
1. **Risk**: High network latency during sequential API operations.
   - *Mitigation*: Consolidate dashboard endpoint queries into unified DTO models so the React client can render primary landing indicators via a single concurrent dashboard API request.
2. **Risk**: Database connection pool exhaustion during peak transaction periods.
   - *Mitigation*: Standardize connection pooling parameters (HikariCP) with strict timeout thresholds, and configure JPA transactional boundaries strictly using `@Transactional(readOnly = true)` for read operations to return resources quickly.

## 🚀 Future Scalability Notes
- **Load Balancing Ready**: Since the Logic Tier holds no server-side user sessions, multiple Spring Boot instances can be spawned behind a reverse proxy (e.g., NGINX) to distribute request traffic evenly.
- **Database Decoupling**: If write-loads spike, PostgreSQL can be configured with replica read nodes, directing search and analytical transactions to read-replicas while reserving the primary node for write transactions.

## 🛠️ Best Practices
- **Never trust client inputs**: Sanitization, authorization checks, and payload validation (JSR-380 annotations) are strictly enforced at the backend controller level.
- **Explicit Response Formats**: All server API outputs utilize a standard response envelope containing dynamic timestamps, status, data payload, and structured error lists.
- **Stateless design patterns**: No session state, cookies, or persistent parameters are stored within server memory.
