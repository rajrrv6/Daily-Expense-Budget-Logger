# Backend Scalability Strategy (backend_scalability_strategy.md)

## 🎯 Objectives
The primary objective of the **Backend Scalability Strategy** is to define the architectural decisions required to support horizontal scaling, high concurrency, and low latency as the user base expands.

## 🔍 Scope
- **In-Scope**:
  - Stateless execution guidelines for JVM web servers.
  - Connection pooling optimization (HikariCP configuration).
  - Caching strategies using Redis for query performance enhancement.
  - Database partitioning and read-write split layouts.
- **Out-of-Scope**:
  - Specific cloud server hosting pricing models.

## 🏗️ Design Decisions
1. **Stateless Web Services**:
   - *Rationale*: Storing user session state on web servers prevents horizontal scaling. Moving all session validation to JWTs passed in headers allows us to add or remove servers behind a load balancer easily.
2. **Optimize HikariCP Connection Pool**:
   - *Rationale*: Establishing a database connection for every query introduces significant latency. Pre-allocating connection pools (e.g. minimum idle 10, maximum 20 connections) keeps query latency low.

---

## 🚀 Scaling Progression Roadmap

| Phase | User Volume | Architectural focus | Technologies |
| :--- | :--- | :--- | :--- |
| **Phase 1** | 1 - 1,000 | Single Node Spring Boot, Single DB, Local caching. | PostgreSQL, Spring Boot, React. |
| **Phase 2** | 1,000 - 50,000 | Multiple Web nodes, Load balancer, Read-Replicas, Redis. | NGINX, Redis Cache, PostgreSQL Master/Replica. |
| **Phase 3** | 50,000+ | Microservice Extraction, Event bus integration, Sharded DB. | Kubernetes, Kafka, Redis, PostgreSQL Partitioning. |

---

## 💎 Advantages
- **Cost Efficiency**: Single-node setups stay lightweight during Phase 1, avoiding high server costs until scaling is required.
- **Predictable Performance**: Indexed search filters keep ledger queries fast even as data sizes grow.
- **Simple Infrastructure**: Stateless servers avoid the need for complex session-syncing configurations across clusters.

## ⚠️ Risks & Mitigations
1. **Risk**: Slow queries on the ledger page as the expense table grows.
   - *Mitigation*: Create composite indexes combining `user_id` and `transaction_date`. Enforce page size limits on all ledger API requests.
2. **Risk**: Database connection pool exhaustion during peak transaction periods.
   - *Mitigation*: Standardize connection pooling parameters (HikariCP) with strict timeout thresholds, and configure JPA transactional boundaries strictly using `@Transactional(readOnly = true)` for read operations to return resources quickly.

## 🚀 Future Scalability Notes
- **Asynchronous Task Workers**: Heavy processing tasks (like generating PDF/CSV reports) will run on separate background worker threads or worker services, keeping primary REST threads responsive.

## 🛠️ Best Practices
- **Design stateless components**: Never write logic that depends on instance memory or local file systems.
- **Index key foreign fields**: Keep database indexes clean and aligned with search patterns.
- **Decouple heavy integrations**: Keep external services isolated through messaging queues or REST interfaces with timeouts.
