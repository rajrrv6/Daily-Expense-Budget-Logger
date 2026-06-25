# Exception Handling Strategy (exception_handling_strategy.md)

## 🎯 Objectives
The primary objective of the **Exception Handling Strategy** is to establish a standardized framework for handling errors in both frontend and backend layers. This prevents application crashes, secures error outputs by hiding system stack traces, and maps errors to clear, user-friendly responses.

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

## 🚫 Standard Error Response Structure

```json
{
  "success": false,
  "message": "Validation constraints failed.",
  "timestamp": "2026-06-24T17:18:22.004Z",
  "data": null,
  "errors": {
    "amount": "Expense amount must be greater than zero.",
    "expense_name": "Expense name is required."
  }
}
```

---

## 💎 Advantages
- **Clean Controller Code**: Eliminates boilerplate try-catch logic, leaving controllers thin and readable.
- **Improved Security**: Internal server failures (like database connection issues) are returned as generic "Internal Server Error" messages, preventing data leakage.
- **Seamless Form Binding**: Standardized validation errors match the field names of React Hook Form, enabling automated form error displays.

## ⚠️ Risks & Mitigations
1. **Risk**: Uncaught runtime exceptions (e.g. NullPointerException) leaking system details to the client.
   - *Mitigation*: Configure a fallback `@ExceptionHandler(Exception.class)` handler that catches all unmapped exceptions and returns a generic `500 Internal Server Error` response while logging the full stack trace internally.
2. **Risk**: UI component crashes caused by unexpected API error payloads.
   - *Mitigation*: Wrap React components in Error Boundaries to capture frontend crashes gracefully and display fallback recovery views.

## 🚀 Future Scalability Notes
- **Localization (i18n)**: The exception handler will integrate with Spring's `MessageSource` to resolve error messages dynamically based on the client's `Accept-Language` header in future releases.

## 🛠️ Best Practices
- **Throw specific exceptions**: Define custom exceptions (like `ResourceNotFoundException`, `UnauthorizedAccessException`) rather than throwing generic `RuntimeException` classes.
- **Always log exception details**: Log the root exception details when converting them to user-facing responses to ensure issues remain searchable in logs.
- **Map HTTP codes accurately**: Ensure exceptions map to standard HTTP codes (e.g., `404` for missing resources, `409` for resource conflicts).
