# Scalable Design Strategy (scalable_design_strategy.md)

## 🎯 Objectives
The primary objective of the **Scalable Design Strategy** is to design the application layout to support horizontal scaling, high concurrency, and low latency as the active user base grows.

## 🔍 Scope
- **In-Scope**:
  - Stateless execution guidelines for JVM web servers.
  - Connection pooling optimization (HikariCP configuration).
  - Database query and indexing strategies for large datasets.
  - Hook points for caching layers (Redis).
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
2. **Risk**: High CPU load on database write operations during bulk operations.
   - *Mitigation*: Implement batch inserts using JPA batch processing configuration (`hibernate.jdbc.batch_size`).

## 🚀 Future Scalability Notes
- **Asynchronous Task Workers**: Heavy processing tasks (like generating PDF/CSV reports) will run on separate background worker threads or worker services, keeping primary REST threads responsive.

## 🛠️ Best Practices
- **Never store files locally**: Save user-uploaded files or exported reports to cloud storage (e.g., S3 or GCS) rather than the local application container.
- **Set database timeouts**: Apply strict transaction timeouts to prevent hung queries from blocking connection pools.
- **Optimize queries**: Analyze query execution plans regularly to ensure they utilize indexes efficiently.
