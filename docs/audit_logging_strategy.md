# Audit Logging Strategy (audit_logging_strategy.md)

## 🎯 Objectives
The primary objective of the **Audit Logging Strategy** is to define how user actions and database transactions are audited. It outlines table structures, logged action types, and execution methods to ensure the system maintains a secure and compliant audit trail of all actions.

## 🔍 Scope
- **In-Scope**:
  - Audit logs table schema (`audit_logs` fields and relationships).
  - List of audited user actions (e.g. USER_LOGIN, EXPENSE_CREATE, EXPENSE_DELETE).
  - Integration with Spring Security context to resolve active user IDs.
  - Logging methods (synchronous vs. asynchronous execution options).
- **Out-of-Scope**:
  - Database engine audit file configurations.

## 🏗️ Design Decisions
1. **Dedicated Database Audit Logs Table**:
   - *Rationale*: Storing audit trails in file logs makes searching active database events difficult. Storing audit parameters in a structured `audit_logs` table makes querying and tracking logs simple.
2. **JPA Entity Lifecycle Listeners (`@EntityListeners`)**:
   - *Rationale*: Relying on developers to write log commands in every service method leads to missed events. Using JPA Entity Listeners (e.g. `@CreatedBy`, `@LastModifiedDate`) automatically tracks created and updated timestamps.

---

## 📋 Audited Actions Index

| Action Identifier | Severity | Trigger Context | Description Payload Example |
| :--- | :--- | :--- | :--- |
| **USER_REGISTER** | `INFO` | Successful user sign-up. | "User registration completed for email: john@example.com" |
| **USER_LOGIN** | `INFO` | Successful user authentication. | "User login successful for user UUID: 8f8b89d2-..." |
| **EXPENSE_CREATE**| `INFO` | New expense record saved. | "Created expense ID: 4d2b-..., Amount: $250.00" |
| **EXPENSE_UPDATE**| `WARN` | Expense record updated. | "Updated expense ID: 4d2b-..., Old Amount: $200.00, New: $250.00"|
| **EXPENSE_DELETE**| `WARN` | Expense record soft-deleted. | "Soft-deleted expense ID: 4d2b-..." |

---

## 💎 Advantages
- **Traceable Activity**: Audit logs track user creations, updates, and soft deletes, providing an audit trail.
- **Improved Compliance**: Storing user actions in the database supports security audit requirements.
- **Fast Troubleshooting**: Audit logs help developers trace application state changes.

## ⚠️ Risks & Mitigations
1. **Risk**: Performance drops caused by blocking database writes during audit logging.
   - *Mitigation*: Run audit logging operations asynchronously (`@Async`) on a separate worker thread pool to prevent blocking primary business transactions.
2. **Risk**: Leakage of sensitive data in audit logs.
   - *Mitigation*: Ensure logging helpers filter out passwords, token keys, and personal identification details before saving logs.

## 🚀 Future Scalability Notes
- **Transition to Elasticsearch**: If the database grows significantly, migrate the `audit_logs` table to an Elasticsearch cluster or Cloud Logging system (like Google Cloud Logging or AWS CloudWatch) to offload write operations from PostgreSQL.

## 🛠️ Best Practices
- **Log with context**: Include context parameters (like `user_id` or `expense_id`) in log messages to make tracing issues easier.
- **Use asynchronous threads**: Process audit logs in separate threads to keep user requests responsive.
- **Store logs securely**: Forbid updates or deletions on the `audit_logs` table (inserts only).
