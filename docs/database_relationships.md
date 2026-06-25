# Database Relationships & Mapping Strategy (database_relationships.md)

## 🎯 Objectives
The primary objective of the **Database Relationships & Mapping Strategy** is to define the object-relational mapping (ORM) rules using Hibernate/JPA. This strategy outlines how table associations (one-to-many, many-to-one) are represented, lazy loading boundaries, and cascade delete restrictions to preserve data consistency.

## 🔍 Scope
- **In-Scope**:
  - JPA relationship mappings (`@OneToMany`, `@ManyToOne`, `@JoinColumn`).
  - Fetch type configurations (Lazy vs. Eager loading).
  - Cascade type configurations (e.g. `CascadeType.PERSIST`, `CascadeType.MERGE`).
  - Join table column names and foreign key references.
- **Out-of-Scope**:
  - NoSQL database configurations.

## 🏗️ Design Decisions
1. **Lazy Loading by Default (`FetchType.LAZY`)**:
   - *Rationale*: Fetching related entities eagerly (e.g. loading all user expenses when querying user profile metadata) introduces massive performance bottlenecks. Setting all relationships to lazy loading ensures related data is fetched only when explicitly requested.
2. **Explicit Foreign Key Join Columns (`@JoinColumn`)**:
   - *Rationale*: Prevents Hibernate from creating separate join tables for one-to-many/many-to-one mappings automatically, mapping foreign keys directly to target tables instead.
3. **No Cascade Delete for Transactional Records**:
   - *Rationale*: Deleting a user must not trigger cascade hard-deletes of financial transaction records. Cascade deletes are blocked (`CascadeType.REMOVE` is prohibited for expenses); deletion is handled via soft-delete logic instead.

---

## 🔗 JPA Entity Mappings Schema

```
 [User Entity] <--- 1:N (FetchType.LAZY, Cascade={PERSIST, MERGE}) ---> [Expense Entity]
       |                                                                      |
       |                                                   N:1 (FetchType.LAZY)
       |                                                                      v
       |                                                             [Category Entity]
       |
       +------ 1:N (FetchType.LAZY, Cascade={ALL}) -----------------> [Todo Entity]
```

---

## 💎 Advantages
- **Optimal Memory Usage**: Lazy loading prevents unnecessary data from loading into JVM memory during simple read operations.
- **Data Protection**: Restricting cascade deletes prevents accidental bulk deletions of financial transactions.
- **Consistent Schemas**: Explicit join column definitions align database tables with Java entity models.

## ⚠️ Risks & Mitigations
1. **Risk**: `LazyInitializationException` when accessing uninitialized relationships outside transactional service contexts.
   - *Mitigation*: Ensure entity-to-DTO conversion occurs inside transaction boundaries (the Service layer), returning fully resolved DTO models to controllers.
2. **Risk**: Slow queries caused by N+1 select operations.
   - *Mitigation*: Use `@EntityGraph` or custom JPQL queries with `JOIN FETCH` statements in repositories to fetch related data in a single query when needed.

## 🚀 Future Scalability Notes
- **RBAC Schema Mapping**: Future updates will introduce a `roles` table and a `user_roles` join table, shifting the application from simple user isolation to structured group and role permissions.

## 🛠️ Best Practices
- **Use Lazy Loading**: Set `FetchType.LAZY` on all `@OneToMany` and `@ManyToOne` associations.
- **Avoid `@EqualsAndHashCode` on relationships**: Exclude lazy-loaded fields from Lombok's equals and hashcode overrides to prevent infinite loops and serialization failures.
- **Apply Cascade controls carefully**: Use `CascadeType.ALL` only for parent-child dependencies where child lifecycles are tied to the parent (e.g. User and Todo).
