# Engineering Rules & Guidelines (ENGINEERING_RULES.md)

## 🎯 Objectives
The primary objective of the **Engineering Rules** is to establish strict, immutable guidelines for writing, structuring, and formatting code. By maintaining total consistency in file layouts, naming schemas, validations, and architectural boundaries, the project ensures high readability, clean testing setups, and easy integration by both human developers and AI coding agents.

## 🔍 Scope
- **In-Scope**:
  - Code directories layout and file placement constraints.
  - Case-naming conventions (components, files, methods, variables).
  - Component communication and separation guidelines.
  - Data Transfer Object (DTO) usage boundaries.
  - Validation rules (annotations, front-end fields).
  - API response and error structure standards.
- **Out-of-Scope**:
  - The configuration details of local development IDE environments.

## 🏗️ Design Decisions
1. **Enforce DTOs for all API layers**:
   - *Rationale*: Database JPA Entity objects must never be exposed directly to the REST controller or the frontend client. Exposing entities violates boundary separation and can cause security vulnerabilities (e.g. over-posting) and performance bottlenecks (lazy loading serialization errors). DTOs define a clear, secure request-response boundary.
2. **Component-Driven Atomic Architecture (Frontend)**:
   - *Rationale*: Reusable components (e.g. Buttons, Modals, Inputs) must be stateless and isolated in a `/components/common/` folder, completely decoupled from specific page business logic.

---

## 🛠️ Code Conventions & Architectural Boundaries

### 1. Naming Conventions & File Formats
- **React Components**: PascalCase (e.g., `ExpenseTable.jsx`, `DashboardCard.jsx`).
- **JavaScript Utility Files**: camelCase (e.g., `apiClient.js`, `dateFormatter.js`).
- **CSS Style Files**: lowercase-hyphenated (e.g., `index.css`, `sidebar-navigation.css`).
- **Spring Boot Java Classes**: PascalCase (e.g., `ExpenseController.java`, `ExpenseService.java`, `ExpenseRepository.java`).
- **Database Tables**: lowercase_snake_case pluralized (e.g., `users`, `expenses`, `categories`).
- **Database Columns**: lowercase_snake_case singularized (e.g., `user_id`, `expense_name`, `created_at`).

### 2. Backend Layered Architecture Boundaries
Code must flow strictly downward:
`Controller Layer -> Service Layer -> Repository Layer -> Database`
- **Controllers**: Must ONLY handle HTTP request mapping, parameter validation, and DTO conversion. Business logic is strictly prohibited.
- **Services**: Contain all transactional business logic, authorization validation, and audit tracking.
- **Repositories**: Standard interface contracts extending `JpaRepository` or custom JPA criteria queries. Direct DB connections or raw driver calls are prohibited.

```
+------------------+
|    Controller    |  <-- Handles API request, converts DTO to Entity
+--------|---------+
         v
+--------v---------+
|     Service      |  <-- Implements business rules & transaction controls
+--------|---------+
         v
+--------v---------+
|    Repository    |  <-- Interacts with PostgreSQL via Spring Data JPA
+------------------+
```

### 3. DTO Validation Rules
- All requests containing a body must map to an explicit request DTO class.
- Validate request payloads at the Controller level using Java Validation API (`jakarta.validation.constraints` annotations) and the `@Valid` annotation:
  - `@NotNull`, `@NotBlank`, `@Size`, `@Min`, `@Max`, `@Email`.
- Frontend validation must mirror backend validation parameters using React Hook Form + Zod.

### 4. Reusable Frontend Component Policies
- Place all shared UI components under `frontend/src/components/common/`.
- Components must accept styling overrides via className props but must contain their own default styling.
- Interactive states (hover effects, loading states) must be styled natively using Tailwind CSS transitions.

---

## 💎 Advantages
- **Fast Onboarding**: Code consistency allows new team members to locate files and debug issues immediately.
- **High Maintainability**: Isolating business logic in the service layer ensures updates to the frontend or database schemas do not break core business logic.
- **Seamless AI Integration**: Rigid rules prevent AI models from generating random directory patterns or importing incorrect libraries.

## ⚠️ Risks & Mitigations
1. **Risk**: Entity pollution where developers bypass DTOs to save time.
   - *Mitigation*: Enforce automated check-style rules or pre-commit hooks that scan Controllers for database entities, blocking commits if entities are found in controller method signatures.
2. **Risk**: Inconsistent API response formats as new modules are developed.
   - *Mitigation*: Standardize the `ApiResponse<T>` wrapper class. All controllers must return this wrapper class as their return type.

## 🚀 Future Scalability Notes
- **Modular Packaging**: Group backend modules logically (e.g., `package com.enterprise.logger.expense`) containing their respective controllers, services, repositories, and DTOs. This modular layout makes extracting features into microservices straightforward.

## 🛠️ Best Practices
- **No raw sql queries**: Always use JPA/Hibernate ORM. If custom logic is required, write database functions or safe JPQL queries.
- **Enforce strict type safety**: Validate properties before execution.
- **No placeholders**: Comments like `// TODO: Implement later` are prohibited. Every file must be complete.
