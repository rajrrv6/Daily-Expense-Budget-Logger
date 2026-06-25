# Caching Strategy (caching_strategy.md)

## 🎯 Objectives
The primary objective of the **Caching Strategy** is to establish clear caching rules for the application. This includes local in-memory caches, server-side caching (Spring Cache, Redis), cache invalidation rules, and client-side storage configurations to improve performance and reduce database load.

## 🔍 Scope
- **In-Scope**:
  - Client-side caching (LocalStorage for theme, session metadata).
  - Spring Boot Caching configuration interfaces (`@Cacheable`, `@CacheEvict`).
  - Cache invalidation and Time-To-Live (TTL) policies.
  - Future Redis integration parameters.
- **Out-of-Scope**:
  - Database-level buffer cache management.

## 🏗️ Design Decisions
1. **Dynamic Cache Invalidation (Write-Through/Evict-on-Update)**:
   - *Rationale*: Stale cache data can cause financial discrepancies. We configure write-through caching where updates to categories or budgets immediately trigger cache eviction (`@CacheEvict`) to keep cache data in sync.
2. **Standard Local Cache with Redis Hookpoints**:
   - *Rationale*: Use Spring Boot's abstraction layer (`CacheManager`) for caching. This allows us to use local in-memory caches (Caffeine) during initial stages and easily switch to Redis in production without altering service logic.

---

## 💾 Caching Configurations Table

| Cache Name | Scope | Storage Location | Invalidation Trigger (TTL) | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **User Session** | User Profile, JWT Metadata. | Client LocalStorage / SessionState | Expired Token (15 minutes). | Avoids parsing JWT claims repeatedly. |
| **Categories** | Static spending category list. | Server Cache (Caffeine/Redis) | Category update, deletion, or 24 hours. | Categories update rarely, making caching highly efficient. |
| **Monthly Budgets**| User monthly budget limits. | Server Cache (Caffeine/Redis) | Budget update, new transaction, or 1 hour. | Speeds up dashboard loading times. |

---

## 💎 Advantages
- **Reduced Database Loads**: Caching static lists (like category options) avoids redundant database queries.
- **Faster Responses**: Reading values from memory is significantly faster than executing SQL queries on disk.
- **Improved User Experience**: Client-side storage of themes and UI layouts prevents page flicker on refresh.

## ⚠️ Risks & Mitigations
1. **Risk**: Stale cache data causing users to see incorrect budget progress.
   - *Mitigation*: Configure transaction events to evict related budget caches immediately when a new expense is logged.
2. **Risk**: Out of memory errors on JVM servers due to large in-memory caches.
   - *Mitigation*: Configure size-based limits (e.g. maximum 10,000 entries) and eviction policies (Least Recently Used) on Caffeine cache pools.

## 🚀 Future Scalability Notes
- **Distributed Redis Cache Cluster**: In later enterprise phases, replace in-memory Caffeine caches with a distributed Redis cluster to ensure cache data remains synchronized across multiple application nodes.

## 🛠️ Best Practices
- **Cache only stable data**: Do not cache frequently changing transactional data like individual expense ledger pages.
- **Define eviction policies**: Always configure size limits and TTL values to prevent memory leaks.
- **Synchronize cache evictions**: Ensure cache eviction occurs within the same database transaction.
