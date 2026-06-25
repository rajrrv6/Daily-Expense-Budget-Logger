# Development Constraints & Boundaries (DEVELOPMENT_CONSTRAINTS.md)

## 🎯 Objectives
The primary objective of the **Development Constraints** document is to outline the immutable boundaries, technical limits, and "hard stops" of the system. These constraints prevent architectural erosion, secure transaction flows, enforce consistent styling rules, and guarantee data safety (soft deletes) across all components.

## 🔍 Scope
- **In-Scope**:
  - Enforced CSS limits (absolute prohibition of inline CSS).
  - Backend database query constraints (no raw native queries in controller layers).
  - Transaction state isolation (no shared-state bypasses in Context API).
  - Data protection rules (mandatory soft delete patterns on core entities).
  - Environment variable boundaries.
- **Out-of-Scope**:
  - Local database server operational constraints.

## 🏗️ Design Decisions
1. **Absolute Soft Delete Strategy**:
   - *Rationale*: To preserve transaction histories, expenses and users must never be hard-deleted (executing SQL `DELETE`). All tables must include a nullable `deleted_at` timestamp. Records are "deleted" by setting `deleted_at` to the current timestamp. The API must automatically filter out soft-deleted records from standard queries.
2. **Zero Inline Styles in Frontend**:
   - *Rationale*: Inline CSS styles pollute React JSX code, make global theme switching difficult, and lead to inconsistent UI layout breaks. Styling must be achieved using Tailwind utility classes or index CSS stylesheets.

---

## 🚫 Core Constraints Matrix

| Constraint Area | Rule Statement | Enforcement Method |
| :--- | :--- | :--- |
| **Styling** | Zero Inline HTML/React Style Props. | Eslint react/inline-styles rules. |
| **SQL Queries** | Zero native raw SQL queries in Controller / Service layers. | Static analysis and code review checks. |
| **Data Deletion** | All tables except join tables must enforce Soft Deletes. | Verify entity schema mapping contains `deleted_at`. |
| **State** | Pages must not modify state contexts directly. | Wrap all context states in actions/reducers. |
| **Secrets** | Zero hardcoded passwords, tokens, or endpoints. | Scan commit files for credentials. |

---

## 💎 Advantages
- **Robust Compliance**: Preserving transaction audit histories guarantees financial data traceability.
- **Maintainable Design**: Eliminating inline styles ensures theme management (Dark/Light mode) operates smoothly by editing class styling rules rather than search-and-replacing inline structures.
- **Secure Architecture**: Preventing raw query strings protects the database from SQL Injection attacks.

## ⚠️ Risks & Mitigations
1. **Risk**: Developers forgetting to append the `deleted_at IS NULL` condition to custom SQL queries.
   - *Mitigation*: Leverage Hibernate's `@SQLRestriction("deleted_at IS NULL")` or `@Where` annotation on all entity classes. This forces Hibernate to automatically append the filter to all SELECT operations.
2. **Risk**: Committing API keys to repositories in `.env` files.
   - *Mitigation*: Configure the project's `.gitignore` file to block `.env`, `application-prod.yml`, and local keystore paths immediately during the scaffolding phase.

## 🚀 Future Scalability Notes
- **External Secret Management**: As the application moves to cloud environments, configurations will transition from standard environmental variables to secret management systems (like AWS Secrets Manager or HashiCorp Vault). The application configuration must support this change without altering logic.

## 🛠️ Best Practices
- **Use Environmental Variables**: All third-party endpoints and database credentials must load dynamically from the shell environment.
- **Enforce JPA Repository Patterns**: Use query method names (e.g. `findByUserIdAndDeletedAtIsNull`) to let Spring Data build safe query executions automatically.
- **Keep JSX clean**: Use custom React hook abstractions to isolate styling arrays and logic calculations away from visual components.
