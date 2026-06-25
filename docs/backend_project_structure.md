# Backend Project Structure (backend_project_structure.md)

## 🎯 Objectives
The primary objective of the **Backend Project Structure** is to define a clean, modular package layout for the Spring Boot application. It enforces standard Java package conventions, separating concerns cleanly across controllers, services, repositories, DTOs, entities, security, config, and exception handling layers.

## 🔍 Scope
- **In-Scope**:
  - Root package organization rules under `com.enterprise.logger`.
  - Feature-based package layouts vs Layer-based package layouts.
  - Placement of configuration files (`application.yml`).
  - DTO and Entity package directories.
  - Maven dependencies organization.
- **Out-of-Scope**:
  - Frontend React folder configurations.

## 🏗️ Design Decisions
1. **Hybrid Package-by-Feature and Package-by-Layer Structure**:
   - *Rationale*: For small-to-medium enterprise applications, grouping core business functions (e.g. `expense`, `user`, `todo`) into distinct packages, and then structuring layer packages (controller, service, repository) inside them, provides high cohesion. It makes features easy to isolate and extract if migrating to microservices later.
2. **Strict Isolation of Config Classes**:
   - *Rationale*: Grouping configuration files (Security config, JPA config, CORS config) into a dedicated `com.enterprise.logger.config` package keeps them organized and out of business logic directories.

---

## 📂 Backend Directory Tree Blueprint

```
backend/
├── docs/                           # Backend design specifications
├── pom.xml                         # Maven dependencies definition
└── src/
    └── main/
        ├── java/com/enterprise/logger/
        │   ├── config/             # Configuration beans (Security, DB pool)
        │   ├── exception/          # Global Exception handler & custom classes
        │   ├── security/           # JWT filter class, Authentication Entry Point
        │   └── modules/            # Cohesive Feature Packages
        │       ├── user/           # User sign-up & profile features
        │       │   ├── controller/
        │       │   ├── service/
        │       │   ├── repository/
        │       │   ├── entity/
        │       │   └── dto/
        │       ├── expense/        # Expense tracking & categories features
        │       │   ├── controller/
        │       │   ├── service/
        │       │   ├── repository/
        │       │   ├── entity/
        │       │   └── dto/
        │       └── todo/           # Shopping Checklist tasks features
        │           ├── controller/
        │           ├── service/
        │           ├── repository/
        │           ├── entity/
        │           └── dto/
        └── resources/
            ├── application.yml     # Central Configuration variables
            └── db/migration/       # Database DDL initialization scripts
```

---

## 💎 Advantages
- **Clean Boundaries**: Feature packages are self-contained, ensuring updates to expenses do not affect authentication packages.
- **High Cohesion**: Controllers, services, and DTOs for a feature reside in the same subfolder tree, making them easy to maintain.
- **Microservices Ready**: Feature folders can be extracted into independent microservices with minimal refactoring.

## ⚠️ Risks & Mitigations
1. **Risk**: Circular dependencies between separate feature packages (e.g. User service importing Expense service while Expense service imports User service).
   - *Mitigation*: Restrict packages to only query other features using thin interface boundaries or dedicated database queries. Forbid direct circular imports between service classes.
2. **Risk**: Duplicate configuration classes.
   - *Mitigation*: All configurations must reside in the centralized `/config/` directory.

## 🚀 Future Scalability Notes
- **Multi-Module Maven Build**: As the codebase grows, the project can easily transition to a multi-module Maven structure (e.g. `logger-core`, `logger-security`, `logger-expense-api`), isolating build dependencies and compilation steps.

## 🛠️ Best Practices
- **Define packages cleanly**: Maintain consistent package hierarchies across all features.
- **Use package-private access**: Restrict class access where possible to prevent unauthorized imports outside the package.
- **Separate configurations**: Keep configurations isolated from business logic.
