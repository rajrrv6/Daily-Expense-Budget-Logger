# Phase 3: Expense Core Ledger (phase_03_expense_core.md)

## 🎯 Objectives
The primary objective of **Phase 3** is to implement the core expense ledger system. This includes building category listing and selection APIs, implementing expense CRUD operations, enforcing soft delete auditing, and developing client ledger views with pagination and sorting support.

## 🔍 Scope
- **In-Scope**:
  - Category retrieval and default seeding configurations.
  - Expense CRUD REST API endpoints.
  - Soft delete database strategy implementation.
  - Client ledger view showing transaction lists.
  - Client forms for logging and editing expenses.
  - Pagination, sorting, and category filter configurations.
- **Out-of-Scope**:
  - Chart rendering or visual analytics.

## 🏗️ Design Decisions
1. **Timestamp-Based Soft Deletions**:
   - *Rationale*: To preserve transaction histories, expenses must never be hard-deleted from the database. Setting a `deleted_at` timestamp preserves records for audit while keeping the user interface clean of deleted entries.
2. **Hibernate Annotation Mapping**:
   - *Rationale*: Appending the `deleted_at IS NULL` condition manually to all queries is error-prone. Using Hibernate's `@SQLRestriction("deleted_at IS NULL")` annotation automatically filters out soft-deleted records from standard database reads.

---

## 💎 Advantages
- **Audit Trails**: Financial logs remain complete since transactions are never hard-deleted.
- **Improved Performance**: Composite indexing on user and date fields optimizes query speeds.
- **Consistent Data**: Soft deletions prevent cascading foreign key errors across tables.

## ⚠️ Risks & Mitigations
1. **Risk**: Slow query performance as the database table size grows.
   - *Mitigation*: Create composite indexes combining `user_id` and `transaction_date`. Enforce page size limits on all ledger API requests.
2. **Risk**: Orphaned category tags on expenses.
   - *Mitigation*: Set category-to-expense constraints to `ON DELETE RESTRICT`, preventing a category from being deleted if it is linked to existing expense records.

## 🚀 Future Scalability Notes
- **Archiving Data Pipeline**: In subsequent enterprise phases, a worker service can migrate soft-deleted database rows older than 90 days to low-cost cold storage (such as AWS S3 Glacier or Google Cloud Storage) to keep the primary database size small.

## 🛠️ Best Practices
- **Never use hard DELETE statements**: Block native delete calls on transactional tables.
- **Verify ownership first**: Confirm the user owns the record before applying the soft-delete timestamp.
- **Use pagination**: Forbid unpaginated database queries on transaction tables.

---

## 🏛️ Phase-Specific Execution Parameters

### 1. Architecture Impact
The transaction flow expands to handle dynamic CRUD operations. Entities, DTOs, repositories, services, and controllers are mapped for categories and expenses.

### 2. Security Considerations
- Every API route must verify that the `user_id` in the request parameter matches the authenticated user ID in the JWT security context.
- Forbid cross-user modifications (preventing a user from reading, updating, or deleting other users' expenses).

### 3. Testing Scope
- Write integration tests for all CRUD endpoints (GET, POST, PUT, DELETE) using Spring MockMvc.
- Verify the soft delete flag updates correctly, and verify soft-deleted rows are excluded from subsequent GET requests.
- Verify validation limits reject negative amounts or empty names.

### 4. Deployment Considerations
- Create index definitions during database initialization.
- Seed default spending categories (e.g. Food, Utilities, Transport, Entertainment) during startup.

### 5. Rollback Strategy
If CRUD integrations fail:
- Revert Git repository changes to the last approved Phase 2 commit tag.
- Roll back database schemas using rollback migrations.
- Verify database connection status and retry migrations.
