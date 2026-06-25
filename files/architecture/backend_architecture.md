# Backend Architecture Specification (backend_architecture.md)

## 🎯 Objectives
The primary objective of the **Backend Architecture** is to define a robust, layered, and secure REST API backend built on Java Spring Boot 3. The architecture guarantees a clear flow of operations, strong transactional control (JPA/Hibernate), standardized responses, centralized exception translation, and modular package separation.

## 🔍 Scope
- **In-Scope**:
  - Spring Boot layered directory conventions (Controller, Service, Repository, DTO, Entity, Config, Exception layers).
  - Transaction management strategy via Spring declarative transactions.
  - Dependency Injection (DI) rules and Bean lifecycle management.
  - Database connectivity mapping using Hikari Connection Pool.
- **Out-of-Scope**:
  - React routing or client views.

## 🏗️ Design Decisions
1. **Stateless Service Layer Design**:
   - *Rationale*: Service classes must never maintain state parameters across invocations. This ensures services are thread-safe and allows Spring to manage them as Singletons safely.
2. **Standard JPA Repository Interface Pattern**:
   - *Rationale*: Prevents developers from writing custom SQL execution code for simple CRUD operations, using standard Spring Data methods to reduce bugs.
3. **Dedicated MapStruct or Manual Converter mapping for DTOs**:
   - *Rationale*: DTOs and database Entities must remain distinct classes. Conversions are processed in the controller/service boundaries using helper methods or mappings, preventing lazy loading initialization exceptions.

---

## 🔁 Backend Layer Flow (Mermaid)

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
