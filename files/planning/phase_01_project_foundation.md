# Phase 1: Project Foundation (phase_01_project_foundation.md)

## 🎯 Objectives
The primary objective of **Phase 1** is to set up the system's infrastructure. This includes creating the directory structure, initializing the Spring Boot and React projects, setting up the PostgreSQL database schema, and establishing base routing frameworks.

## 🔍 Scope
- **In-Scope**:
  - Creating project directories.
  - Setting up the Spring Boot project via Maven with required dependencies.
  - Initializing the React project with Vite, Tailwind CSS, and routing configs.
  - Writing and executing the PostgreSQL schema initialization DDL.
  - Mapping JPA entities (`User`, `Category`, `Expense`, `TodoItem`, `AuditLog`).
- **Out-of-Scope**:
  - Writing authentication filters or business logic services.

## 🏗️ Design Decisions
1. **Maven for Java Dependency Management**:
   - *Rationale*: Maven is the enterprise-standard build automation tool. It provides stable, declarative dependency management.
2. **PostgreSQL Relational Schema Initialization**:
   - *Rationale*: All tables (users, categories, expenses, todo_items, audit_logs) are created first using explicit database DDL scripts, establishing key relational constraints and indices before writing Java code.

---

## 💎 Advantages
- **Clean Foundation**: A pre-configured directory structure prevents merge conflicts.
- **Predictable Schemas**: Setting up database tables and indices first ensures clean JPA mapping annotations.
- **Fast Build Times**: Vite React configurations ensure fast hot-reloading during frontend development.

## ⚠️ Risks & Mitigations
1. **Risk**: Entity property mismatch with SQL database columns.
   - *Mitigation*: Run validation checks on application startup using Hibernate's `ddl-auto: validate` property, blocking startup if Java entities and database schemas do not match.

## 🚀 Future Scalability Notes
- **Docker Compose Readiness**: The foundation includes a `docker-compose.yml` template to easily spin up database containers, preparing the app for multi-instance deployments.

## 🛠️ Best Practices
- **Use snake_case for DB columns**: Match Java camelCase properties to database snake_case columns.
- **Set explicit lengths**: Avoid using default values for database table columns.
- **Use relative imports**: Use Vite path aliases to keep import statement paths clean.

---

## 🏛️ Phase-Specific Execution Parameters

### 1. Architecture Impact
The system transitions from an empty workspace to a multi-tiered architecture (Vite React static client, Spring Boot REST server, and PostgreSQL database). Base packages and layout frameworks are established.

### 2. Security Considerations
- Externalize all database credentials and initial secrets to environment variables (`.env`).
- Forbid checking credentials, tokens, or local keys into git repositories.

### 3. Testing Scope
- Compile the Spring Boot project to verify dependencies download correctly.
- Test connection pool connections to verify connectivity between the Spring Boot container and the PostgreSQL database.
- Run the React development server to verify Tailwind stylesheets compile correctly.

### 4. Deployment Considerations
- Verify environment variables are configured.
- Prepare a staging Dockerfile configuration to verify image builds.

### 5. Rollback Strategy
If scaffolding setup fails:
- Revert the Git repository branch to the initial empty state.
- Drop the PostgreSQL tables using the matching rollback DDL scripts.
- Re-run the project creation scripts.
