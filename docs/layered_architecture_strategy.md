# Layered Architecture Strategy (layered_architecture_strategy.md)

## 🎯 Objectives
The primary objective of the **Layered Architecture Strategy** is to establish clean boundary constraints for the Spring Boot backend. It defines the specific responsibilities of the Controller, Service, and Repository layers to prevent logical leaks and ensure code remains maintainable and testable.

## 🔍 Scope
- **In-Scope**:
  - RestController layer rules (parameter parsing, DTO validation mapping).
  - Service layer boundaries (business rules, transactions, permission checks).
  - Repository layer constraints (Spring Data JPA interfaces, JPA Criteria).
  - Data mapping boundaries (JPA Entity vs. API DTO).
- **Out-of-Scope**:
  - Frontend component layouts.

## 🏗️ Design Decisions
1. **No JPA Entities in Controllers**:
   - *Rationale*: Controllers must never accept or return raw JPA Entities. Exposing Entities violates the isolation of database structures and can cause serialization issues or data tampering vulnerabilities (over-posting). Controllers must exclusively accept Request DTOs and return Response DTOs.
2. **Transactional boundaries at the Service Layer**:
   - *Rationale*: Database transactional scopes must align with service business operations. Placing `@Transactional` annotations on service methods ensures complete commit or rollback protection during multi-step database updates.

---

## 🔁 Architectural Layer Controls

| Layer | Responsibility | Permitted Imports | Prohibited Operations |
| :--- | :--- | :--- | :--- |
| **Controller** | HTTP parameter mapping, validation trigger, DTO-Entity conversion. | Services, DTOs, Converters. | Business logic, direct DB queries, handling raw JPA Entities. |
| **Service** | Business validations, transactional updates, permission checks. | Repositories, Helpers, Entities. | Parsing HTTP headers, returning HTML strings. |
| **Repository** | Database query execution, record persistence. | Entity classes. | Evaluating business calculations. |

---

## 💎 Advantages
- **High Testability**: Decoupled layers allow developers to write focused unit tests by mocking dependencies.
- **Easy Maintenance**: Updating database columns only requires modifying JPA Entity mapping annotations; Controller endpoints and routing paths remain unchanged.
- **Traceable Codeflow**: Standardized call flows (Controller -> Service -> Repository) make tracing data execution paths simple.

## ⚠️ Risks & Mitigations
1. **Risk**: Developers placing complex business logic in controller actions to save time.
   - *Mitigation*: Enforce coding rules where controllers contain a maximum of 15 lines of code, serving only to validate parameters and invoke service beans.
2. **Risk**: Lazy Loading Exceptions when serializing JPA Entities containing relationships.
   - *Mitigation*: Ensure entity-to-DTO conversion occurs inside transaction boundaries (the Service layer), returning fully resolved DTO models to the controller.

## 🚀 Future Scalability Notes
- **Transition to Hexagonal Architecture**: The clean separation of layers makes migrating to clean architecture or hexagonal port-adapter patterns straightforward if the project expands to support alternative input adapters (e.g. gRPC or Message Broker queues).

## 🛠️ Best Practices
- **Use `@Transactional` annotations**: Apply transactional control strictly to write-enabled service methods.
- **Inject dependecies via constructor**: Forbid the use of `@Autowired` field injection to ensure fields remain immutable.
- **Enforce input validations**: Annotate DTO parameters with standard JSR-380 constraints to drop invalid requests early.
