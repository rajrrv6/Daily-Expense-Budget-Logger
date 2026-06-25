# Soft Delete Strategy (soft_delete_strategy.md)

## 🎯 Objectives
The primary objective of the **Soft Delete Strategy** is to establish data retention and audit controls. It configures Hibernate and JPA schemas to set active record markers instead of executing SQL `DELETE` queries.

## 🔍 Scope
- **In-Scope**:
  - Entity attributes and schema columns mapping (`deleted_at` field).
  - Hibernate `@SQLRestriction` / `@Where` configurations.
  - Custom delete method mappings in JPA Repositories.
  - Soft delete validation checks inside service layers.
- **Out-of-Scope**:
  - Database schema table cleanup operations.

## 🏗️ Design Decisions
1. **Timestamp-Based Deletions (`deleted_at` timestamp)**:
   - *Rationale*: Using a nullable timestamp (e.g. `deleted_at`) provides more context than a simple boolean flag (e.g. `is_deleted`). It documents exactly when the record was deleted, facilitating auditing and chronological log matching.
2. **Hibernate Annotation Mapping**:
   - *Rationale*: Appending the `deleted_at IS NULL` condition manually to all JPQL/SQL queries is error-prone. Using Hibernate's `@SQLRestriction("deleted_at IS NULL")` annotation automatically filters out soft-deleted records from standard database reads.

---

## 🔁 Soft Delete Execution Flow

```
 [Client requests DELETE /api/v1/expenses/{id}]
                       |
                       v
 [Controller invokes Service delete method]
                       |
                       v
 [Service verifies user owns expense]
                       |
                       v
 [JPA updates Entity `deleted_at` to CURRENT_TIMESTAMP]
                       |
                       v
 [Database updates record row (SQL UPDATE)]
                       |
                       v
 [Subsequent SELECT queries filter out deleted_at IS NOT NULL]
```

---

## 💎 Advantages
- **Audit Trails**: Financial logs remain complete since transactions are never hard-deleted.
- **Easy Recovery**: Accidental deletions can be restored by clearing the `deleted_at` timestamp.
- **High Security**: Soft deletions prevent cascading foreign key errors across tables.

## ⚠️ Risks & Mitigations
1. **Risk**: Duplicate key constraint conflicts (e.g. attempting to register a username that was soft-deleted).
   - *Mitigation*: Configure unique index parameters that check only active columns (e.g. `CREATE UNIQUE INDEX idx_user_active ON users(username) WHERE deleted_at IS NULL`).
2. **Risk**: Slow query performance as the database retains many soft-deleted rows.
   - *Mitigation*: Run background database vacuuming or partitioning jobs to archive rows where `deleted_at` is older than a set retention window (e.g., 7 years).

## 🚀 Future Scalability Notes
- **Archiving Data Pipeline**: In subsequent enterprise phases, a worker service can migrate soft-deleted database rows older than 90 days to low-cost cold storage (such as AWS S3 Glacier or Google Cloud Storage) to keep the primary database size small.

## 🛠️ Best Practices
- **Never use hard DELETE statements**: Block native delete calls on transactional tables.
- **Verify ownership first**: Confirm the user owns the record before applying the soft-delete timestamp.
- **Add partial indexes**: Create database indexes specifically on active rows to optimize query speeds.
