# Future Scalability Plan - Daily Expense & Budget Logger — Personal Finance Management System

## 🎯 Objectives
The primary objective of the **Future Scalability Plan** is to design a clear path to scale the application from a single-user personal budget tracker to a high-volume multi-user organizational expense monitoring platform. This plan details the architectural modifications, database adaptations, microservices migration strategy, and caching layers required to handle large user volumes and data traffic.

## 🔍 Scope
- **In-Scope**:
  - Relational mapping migration to support multi-user/organizational structures.
  - Role-Based Access Control (RBAC) data mapping.
  - Caching strategies using Redis for query performance enhancement.
  - Database partitioning and read-write split layouts.
  - Microservices separation plans for heavy resource pipelines (AI prediction, receipt scanning).
- **Out-of-Scope**:
  - Specific cloud server hosting pricing models.
  - Integration steps for specific mobile operating systems.

## 🏗️ Design Decisions
1. **Logical User & Organization Isolation**:
   - *Rationale*: For transactional expense data, isolating clients via a logical `organization_id` or `user_id` field (foreign key to an `organizations` table) on all transaction tables is the most cost-effective and straightforward approach to implement, avoiding the infrastructure overhead of separate database instances.
2. **Redis for Session Token Blacklisting and Category Caching**:
   - *Rationale*: Fetching spending categories and checking revoked JWT tokens from a relational database on every request introduces database bottlenecks. Redis provides sub-millisecond in-memory cache lookup.
3. **Database Horizontal Partitioning (Sharding) by `user_id`**:
   - *Rationale*: As the database grows to millions of expense rows, tables can be partitioned horizontally based on user ID ranges, ensuring search performance remains high.

---

## 🔮 Future Architecture Evolution

```
                   [Client SPA Apps]
                           |
                           v HTTPS
                 [API Gateway / Proxy]
                           |
            +--------------+--------------+
            | Load Balancer               |
            +--------------+--------------+
                           |
            +--------------v--------------+
            | Auth & Core Web Servers     |
            | (Stateless Spring Boot Node)|
            +-------|--------------|------+
                    |              |
         Read Cache |              | SQL Queries
                    v              v
               [(Redis)]     [PGpool Load Balancer]
                             |                    |
                  Write Ops  v                    v Read Ops
                         [PostgreSQL]------->[PostgreSQL Replica]
                         (Primary DB)  Sync  (Read-Only Database)
```

---

## 💎 Advantages
- **No Early Optimization Overhead**: Maintains simple code for the initial release while ensuring the schema isn't structured in a way that blocks horizontal growth.
- **Improved Performance**: Moving high-read queries (like static categories) to Redis reduces disk read operations on PostgreSQL.
- **High Availability**: Read-write database replication configuration allows the platform to remain online even if a read replica goes down.

## ⚠️ Risks & Mitigations
1. **Risk**: Data leakage between different user accounts.
   - *Mitigation*: Leverage dynamic JPA filters that automatically append current user validation parameters to every JPQL/SQL execution, preventing developers from forgetting manual filters in repository calls.
2. **Risk**: Cache invalidation inconsistencies in Redis.
   - *Mitigation*: Set strict Time-To-Live (TTL) policies on cache keys (e.g., 1 hour for categories) and implement write-through caching where category updates force cache eviction immediately.

## 🚀 Future Scalability Notes
- **Asynchronous Processing (RabbitMQ / Kafka)**: Large-scale operations like CSV exports, pdf generation, and notification emails will be delegated to asynchronous worker microservices, preventing web threads from blocking.
- **Receipt Scanning Pipeline**: The scanning system will deploy as a separate serverless function (e.g., AWS Lambda or Google Cloud Functions) to run high-CPU computer vision algorithms independently of the transactional API.

## 🛠️ Best Practices
- **Design stateless components**: Never write logic that depends on instance memory or local file systems.
- **Index key foreign fields**: Keep database indexes clean and aligned with search patterns.
- **Decouple heavy integrations**: Keep external services isolated through messaging queues or REST interfaces with timeouts.
