# Repository, Service & Controller Flow (repository_service_controller_flow.md)

## 🎯 Objectives
The primary objective of the **Repository, Service & Controller Flow** is to define the communication rules and sequence flow of requests in the Spring Boot backend.

## 🔍 Scope
- **In-Scope**:
  - Web client runtime details.
  - Server application containers, Spring framework engines, and filters.
  - Relational Database layout and connection pooling.
  - End-to-end data lifecycle paths.
- **Out-of-Scope**:
  - Frontend component layouts.

## 🏗️ Design Decisions
1. **Unidirectional Execution Flow**:
   - *Rationale*: Requests must flow in a single direction (`Controller -> Service -> Repository`). Bypassing services to query repositories directly from controllers creates layout conflicts and bypasses business logic validation checks.
2. **Standard JPA Repository Interface Pattern**:
   - *Rationale*: Prevents developers from writing custom SQL execution code for simple CRUD operations, using standard Spring Data methods to reduce bugs.

---

## 🔁 Request Execution Sequence (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Client as React Frontend
    participant Filter as Security Filter Chain
    participant Controller as REST Controller
    participant Service as Service Layer
    participant Rep as JPA Repository
    database DB as PostgreSQL DB

    Client->>Filter: HTTP request with Bearer JWT
    alt JWT Invalid or Expired
        Filter-->>Client: Return 401 Unauthorized
    else JWT Valid
        Filter->>Controller: Forward Request Context
    end

    Controller->>Controller: Validate Request DTO
    alt DTO Validation Fails
        Controller-->>Client: Return 400 Bad Request
    end

    Controller->>Service: Pass DTO Data
    Service->>Service: Check Business Rules & Permissions
    Service->>Rep: Call JPA Repository CRUD Method
    Rep->>DB: Execute Parameterized SQL Query
    DB-->>Rep: Return SQL Result Sets
    Rep-->>Service: Return Entity Instance
    Service->>Service: Process Logic / Map Entity to Response DTO
    Service-->>Controller: Return Response DTO
    Controller-->>Client: Return 200 OK / ApiResponse Wrapping DTO
```

---

## 💎 Advantages
- **Strict Decoupling**: If database changes occur (e.g. migrating columns), service logic and controller mappings remain unaffected, needing only minor adjustments to entity mappings.
- **Thread Safety**: Stateless beans eliminate data race bugs.
- **Clear Exception Mapping**: Centralized exception interceptors automatically translate service failures (e.g. `InsufficientFundsException`) into clean REST error payloads.

## ⚠️ Risks & Mitigations
1. **Risk**: N+1 Select query execution issues in JPA due to relationships.
   - *Mitigation*: Enforce the use of `@EntityGraph` or custom JPQL queries with `JOIN FETCH` statements when fetching entities with many relationships (like retrieving expenses with their owner users).
2. **Risk**: Transaction deadlock issues under concurrency.
   - *Mitigation*: Standardize transactional timeout limits and set query restrictions using `@Transactional` annotations with appropriate isolation levels.

## 🚀 Future Scalability Notes
- **Extensibility to Microservices**: By keeping package boundaries strict (e.g. `com.enterprise.logger.expense` containing all logic for expenses), this component can be extracted into an independent microservice with its own database if necessary.

## 🛠️ Best Practices
- **Use Constructor Injection**: Always inject dependecies using constructor parameters instead of `@Autowired` fields to support unit testing and immutable fields.
- **Annotate Transactional zones**: Apply `@Transactional` only to Service methods, not to Controllers or Repositories.
- **Validate at the entry point**: Use `@Valid` in Controller arguments to drop invalid payloads immediately before they reach the service layer.
