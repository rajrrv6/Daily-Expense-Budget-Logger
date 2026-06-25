# Testing Strategy (testing_strategy.md)

## 🎯 Objectives
The primary objective of the **Testing Strategy** is to establish clear testing guidelines for the application. This strategy defines the tools, coverage targets, mock configurations, validation standards, and pipeline gates for unit, integration, API, UI, and end-to-end (E2E) testing to ensure software quality and reliability.

## 🔍 Scope
- **In-Scope**:
  - JUnit 5 and Mockito setup for backend unit testing.
  - Spring Boot Test and JPA slice tests for database integration testing.
  - Spring MockMvc and Postman setup for API contract and routing tests.
  - Jest and React Testing Library setup for frontend component/UI tests.
  - Playwright guidelines for E2E user-flow verification.
  - Code coverage thresholds and validation standards.
- **Out-of-Scope**:
  - Manual exploratory testing instructions.
  - Penetration testing execution details.

---

## 🏛️ Testing Pyramid & Methodologies

The project follows a standard testing pyramid, ensuring a broad foundation of fast-running unit tests, supplemented by targeted integration, API, UI, and E2E tests.

```
          / \
         / E \  <-- Playwright (E2E User Workflows)
        /-----\
       / UI/API\ <-- React Testing Library / MockMvc & Postman
      /---------\
     /   Inte-   \ <-- Spring Boot Test (JPA Slices)
    /   gration   \
   /---------------\
  /      Unit       \ <-- JUnit 5 + Mockito / Jest
 /-------------------\
```

### 1. Unit Testing
Unit tests focus on validating individual classes, methods, or helper functions in complete isolation.
- **Backend Stack**: **JUnit 5** for test framework structure, **Mockito** for stubbing and mocking dependencies, and **AssertJ** for fluent assertions.
- **Frontend Stack**: **Jest** for executing test suites and mocking utility modules.
- **Guidance**: Any external collaborator (e.g., database, external REST client) must be mocked. Unit tests must not perform database or network IO.

### 2. Integration Testing
Integration tests verify the collaboration between multiple components or modules within the system (e.g., service interacting with a JPA repository).
- **Backend Stack**: **Spring Boot Test** (`@SpringBootTest` or specialized slices like `@DataJpaTest`).
- **Database Context**: Slices are configured to run against an in-memory database (e.g., H2) or containerized database (Testcontainers) representing the production PostgreSQL schema. Transactions are rolled back automatically (`@Transactional`) to keep tests clean.

### 3. API Testing
API tests validate the contract, routing, authorization, and error handling of web controllers.
- **Tools**: **Spring MockMvc** (backend controller layer verification) and **Postman** (post-deployment integration collection).
- **Guidance**: Ensure endpoints return correct HTTP statuses (e.g., `200 OK`, `201 Created`, `400 Bad Request`, `429 Too Many Requests`) and match the specified JSON naming casing (`camelCase`).

### 4. UI Testing
UI tests verify that frontend components render correctly and handle user events (clicks, input, form submissions) as expected.
- **Frontend Stack**: **React Testing Library** and **Jest**.
- **Guidance**: Focus on user-centric behavior (e.g., asserting that an element is visible in the DOM) rather than testing internal component state or implementation details.

### 5. End-to-End (E2E) Testing
E2E tests simulate complete user workflows by automating interaction inside a headless browser from the login screen to data creation and reports.
- **Tools**: **Playwright**.
- **Guidance**: Executed in pre-production/staging environments to ensure that all layers (frontend, backend, database) function seamlessly together.

---

## 📊 Code Coverage & Validation Goals

We enforce strict coverage gates to prevent regression and ensure code quality:

### Coverage Standards
- **Minimum Acceptable Unit Test Coverage**: **80% Line Coverage** specifically targeted at business services, validator classes, and helper logic layers.
- **Total Code Coverage Goal**: **85% Line Coverage** across the entire backend codebase (excluding configuration, entities, and boilerplate DTO classes).
- **Enforcement**: Build pipelines (e.g., GitHub Actions using Jacoco/SonarQube) will block merges if a Pull Request drops the coverage below these minimums.

### API Contract Validation Standards
To ensure API stability, all endpoints must undergo strict contract validation:
- **Request Validation**: Use Spring’s `@Valid` annotation to enforce validation constraints (e.g., `@NotNull`, `@Size`, `@Min`) on incoming DTO fields. Controller tests must assert that invalid payloads trigger `400 Bad Request` with structured error messages.
- **Response Validation**: Verify that response keys match the `camelCase` DTO specification and include correct HTTP headers.
- **Postman Contract Tests**: Postman test scripts must check schema compliance for successful transactions and ensure all error responses follow the standard exception payload format.

---

## 💎 Advantages
- **Fast Bug Detection**: Unit tests verify code changes quickly, preventing regressions.
- **Improved Maintainability**: Isolated tests make refactoring services and components straightforward.
- **Fewer Integration Bugs**: MockMvc tests verify API contracts (DTO validation and response status codes) before deployment.

## ⚠️ Risks & Mitigations
1. **Risk**: Slow test suite execution delaying CI/CD builds.
   - *Mitigation*: Separate unit tests from integration tests. Run unit tests on every commit, and reserve heavier E2E integration tests for pre-merge pipeline gates.
2. **Risk**: Test pollution (database state leaking between tests).
   - *Mitigation*: Wrap integration tests in Spring `@Transactional` annotations to automatically roll back database changes after each test.

## 🚀 Future Scalability Notes
- **CI/CD Integration**: Integrate testing suites into GitHub Actions or GitLab CI, blocking branch merges if any test fails or code coverage drops below the 80% threshold.

## 🛠️ Best Practices
- **Write descriptive test names**: Use clear names (e.g. `shouldReturn400WhenAmountIsNegative` rather than `testAmount`).
- **Follow the AAA pattern**: Structure tests using Arrange, Act, Assert blocks.
- **Use Mockito/Jest mock helpers**: Mock external dependecies to keep tests isolated and focused.
