# Sprint 4: Expense Entry & Ledger (sprint_04_expense_management.md)

## 🎯 Sprint Objective
The primary focus of **Sprint 4** is to implement the core expense logger. This includes building category selection APIs, implementing expense CRUD operations, enforcing soft delete auditing, and developing the client ledger view with pagination and sorting.

## 📦 Features Included
- Category retrieval and listing APIs.
- Expense CRUD API endpoints.
- Soft delete database strategy.
- Client ledger view showing transaction tables.
- Client forms for logging and editing expenses.
- Pagination, sorting, and category filters.

## 🛠️ Tasks Breakdown
- Seed default spending categories during database startup.
- Implement categories listing service and controller methods.
- Write expense CRUD service methods.
- Configure soft delete logic (`deleted_at` timestamp setting).
- Implement expense REST Controllers.
- Build ledger view page grid in the React client.
- Develop expense logger form with validation (React Hook Form + Zod).
- Integrate sorting headers and pagination controls.

## 📥 Entry Criteria
- Sprint 2 authentication system is complete.
- Staging database is active and populated with category options.

## 📤 Exit Criteria
- Users can view category options.
- Users can successfully log, edit, and delete expenses.
- Deleted transactions update the `deleted_at` timestamp in the database and are excluded from subsequent GET requests.
- Ledger view handles pagination and sorting correctly.

## 🚫 Blockers & Risks
- **Risk**: Slow query performance as the database table size grows.
  - *Mitigation*: Create composite indexes combining `user_id` and `transaction_date` on the expenses table. Enforce page size limits on all ledger API requests.

## 🔗 Dependencies
- Relational database schema must be initialized, and user authentication must be active.

## 🧪 QA Checklist
- [ ] Verify deleted expense records are not hard-deleted from database rows.
- [ ] Verify form validations reject negative amounts or empty names.
- [ ] Verify users can only query, edit, or delete expense records they own.
- [ ] Verify sorting by date and amount headers executes successfully.

## 📦 Deliverables
- Categories Controller class.
- Expense CRUD Controller class.
- Soft Delete mapping helper.
- React Ledger Page.
- Expense entry form modal.

## ⏱️ Estimated Timeline & Complexity
- **Duration**: 7 Days.
- **Story Points**: 8 (Medium-High complexity).
