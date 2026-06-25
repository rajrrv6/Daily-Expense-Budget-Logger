# Centralized Exception Handling (centralized_exception_handling.md)

## 🎯 Objectives
The primary objective of the **Centralized Exception Handling** strategy is to define a unified framework for error handling in the Spring Boot backend.

## 🔍 Scope
- **In-Scope**:
  - Controller Advice architectures (`@RestControllerAdvice`).
  - Standard error payload envelopes.
  - Hierarchy mapping of custom runtime exceptions.
  - Validation error extraction formats.
  - Client Axios boundary catchers.
- **Out-of-Scope**:
  - Host operating system hardware failure checks.

## 🏗️ Design Decisions
1. **Centralized Backend Exception Handler (`@RestControllerAdvice`)**:
   - *Rationale*: Writing try-catch blocks in every controller method creates duplicate code. A centralized handler catches exceptions thrown anywhere in the application, translating them into standard REST responses automatically.
2. **Hiding Stack Traces in Production**:
   - *Rationale*: Exposing system stack traces to users reveals internal implementation details (e.g. database column names, library versions) that could be exploited.
3. **Structured Validation Error Payloads**:
   - *Rationale*: Spring validation errors contain deep nested object structures. The exception handler must extract only the field names and validation messages, formatting them into a clean key-value dictionary for the frontend.

---

## 📋 Exception Mapping Index

| Exception Class | Target HTTP Code | User-facing Output message | Log level |
| :--- | :--- | :--- | :--- |
| **ResourceNotFoundException** | `404 Not Found` | "Requested resource could not be found." | `WARN` |
| **UnauthorizedAccessException**| `403 Forbidden` | "Access to requested resource is denied." | `WARN` |
| **DuplicateResourceException** | `409 Conflict` | "Resource with these parameters already exists."| `INFO` |
| **MethodArgumentNotValidException**| `400 Bad Request`| "Validation constraints failed." | `INFO` |
| **Exception (General Catch-all)**| `500 Server Error`| "An unexpected server error occurred." | `ERROR` |

---

## 💎 Advantages
- **Clean Controller Code**: Eliminates boilerplate try-catch logic, leaving controllers thin and readable.
- **Improved Security**: Internal server failures (like database connection issues) are returned as generic "Internal Server Error" messages, preventing data leakage.
- **Seamless Form Binding**: Standardized validation errors match the field names of React Hook Form, enabling automated form error displays.

## ⚠️ Risks & Mitigations
1. **Risk**: Uncaught runtime exceptions (e.g. NullPointerException) leaking system details to the client.
   - *Mitigation*: Configure a fallback `@ExceptionHandler(Exception.class)` handler that catches all unmapped exceptions and returns a generic `500 Internal Server Error` response while logging the full stack trace internally.
2. **Risk**: Performance overhead from large stack traces.
   - *Mitigation*: Configure exceptions to avoid generating expensive stack traces during high-frequency business logic updates.

## 🚀 Future Scalability Notes
- **Localization (i18n)**: The exception handler will integrate with Spring's `MessageSource` to resolve error messages dynamically based on the client's `Accept-Language` header in future releases.

## 🛠️ Best Practices
- **Throw specific exceptions**: Define custom exceptions (like `ResourceNotFoundException`, `UnauthorizedAccessException`) rather than throwing generic `RuntimeException` classes.
- **Always log exception details**: Log the root exception details when converting them to user-facing responses to ensure issues remain searchable in logs.
- **Map HTTP codes accurately**: Ensure exceptions map to standard HTTP codes (e.g., `404` for missing resources, `409` for resource conflicts).
