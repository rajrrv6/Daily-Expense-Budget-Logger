# Backend Development Governance & Collaboration Plan (AGENTS.md)

## 🎯 Objectives
This document establishes collaboration boundaries, context rules, and developer/AI standards for modifying, testing, and scaling the Spring Boot backend server application.

## 📂 Backend Scope & Constraints
- **Security Chain**: Do not modify the core `SecurityConfig` filters, JWT provider logic, or session refresh token policies unless resolving critical bugs.
- **DTO Isolation**: Never expose entity classes directly; use target request/response DTOs to encapsulate password hashes and system credentials.
- **Access Control**: Annotate controller endpoints with fine-grained `@PreAuthorize("hasAuthority(...)")` verification rules.
- **Database Rules**: Ensure SQL queries are database dialect independent (e.g. avoid complex native postgres operations when JPQL is sufficient).

## 🛠️ Verification Gates
- Test Execution: `./mvnw clean test` must pass all test cases (25+ security and advanced features tests).
- Build Compilation: The app must build cleanly without warnings.
