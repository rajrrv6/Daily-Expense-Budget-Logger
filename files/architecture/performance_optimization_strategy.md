# Performance Optimization Strategy (performance_optimization_strategy.md)

## 🎯 Objectives
The primary objective of the **Performance Optimization Strategy** is to establish clear performance rules for both frontend and backend layers. This ensures fast page loads, low API latencies, and efficient resource usage as transaction volumes scale.

## 🔍 Scope
- **In-Scope**:
  - React bundle size optimization (lazy loading, code splitting).
  - UI rendering optimization (skipping redundant re-renders, virtualization).
  - Database query optimization (indexes, pagination, fetch strategies).
  - Connection pool configuration (HikariCP parameters).
  - REST API payload compression (GZIP configurations).
- **Out-of-Scope**:
  - Specific cloud server hosting pricing models.

## 🏗️ Design Decisions
1. **Mandated API Pagination**:
   - *Rationale*: Retrieving large lists of records in a single query introduces significant network and memory overhead. All expense ledger and audit log endpoints must enforce page size limits, returning paginated results using Spring Data `Pageable`.
2. **React Lazy Loading & Suspense**:
   - *Rationale*: Loading all page bundles on the initial landing page delays application startup. Splitting pages into separate chunks loaded dynamically only when their routes are active improves initial load times.

---

## ⚡ Performance Optimization Targets

| Layer | Focus Area | Technique | Expected Target |
| :--- | :--- | :--- | :--- |
| **Frontend** | Initial Page Load | React Lazy Loading & code splitting, GZIP compression. | Page Load < 1.5s (LCP). |
| **Frontend** | UI Rendering | Virtualized list rendering for ledger rows, React.memo. | 60 FPS scrolling. |
| **Backend** | API Response | Unified DTOs, GZIP compression on JSON payloads. | API Response < 200ms. |
| **Database** | Query Speed | Composite Indexes on searched columns, connection pooling. | Index-seek time < 10ms. |

---

## 💎 Advantages
- **Fast User Interactions**: Lightweight bundles and optimized UI rendering keep page transitions smooth.
- **Low Database Latencies**: Composite indexing and pagination keep SQL query executions fast.
- **Reduced Infrastructure Costs**: Efficient query handling and stateless connections reduce server CPU and memory usage.

## ⚠️ Risks & Mitigations
1. **Risk**: N+1 select query execution issues in JPA due to lazy loading configurations.
   - *Mitigation*: Run profiling checks (Hibernate SQL Logging) in development to detect duplicate queries. Use EntityGraphs or `JOIN FETCH` statements in repositories to fetch related data in a single query.
2. **Risk**: High memory usage from large search queries.
   - *Mitigation*: Enforce a maximum page size (e.g. `size = 100`) at the controller layer, overriding larger client parameters automatically.

## 🚀 Future Scalability Notes
- **CDN Static Hosting**: Host frontend static files on a Content Delivery Network (CDN) to reduce load times for global users.
- **Read-Write Database Splitting**: Route read operations to database read-replicas, keeping the primary PostgreSQL node available for write transactions.

## 🛠️ Best Practices
- **Use pagination**: Forbid unpaginated database queries on transaction tables.
- **Profile query performance**: Use SQL `EXPLAIN ANALYZE` to optimize slow queries.
- **Keep component state local**: Avoid storing state globally to prevent unnecessary re-renders in unrelated components.
