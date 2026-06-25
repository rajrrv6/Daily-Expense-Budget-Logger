# DTO Validation Strategy (dto_validation_strategy.md)

## 🎯 Objectives
The primary objective of the **DTO Validation Strategy** is to define the validation rules for incoming REST requests. By applying JSR-380 (Jakarta Bean Validation) annotations at the DTO layer, the backend drops invalid request bodies early before they consume database connections or trigger runtime failures.

## 🔍 Scope
- **In-Scope**:
  - DTO naming conventions (e.g. `ExpenseRequestDto`, `ExpenseResponseDto`).
  - Standard Jakarta Validation annotations (e.g. `@NotNull`, `@NotBlank`, `@Size`, `@Min`, `@Max`, `@Email`).
  - Validation triggers using the `@Valid` annotation in Controller methods.
  - Method argument exception extraction processes.
  - Custom validation rules.
- **Out-of-Scope**:
  - Client-side validation logic (delegated to `form_validation_strategy.md`).

## 🏗️ Design Decisions
1. **Validation at the HTTP Entry Point (Controller Layer)**:
   - *Rationale*: Allowing invalid or malformed data to reach the Service layer can lead to transactional inconsistencies or DB constraints failure. Validating parameters directly in controller arguments using `@Valid` drops invalid requests immediately, returning a standard 400 Bad Request response.
2. **Dedicated Request/Response DTO Separation**:
   - *Rationale*: Using the same DTO for both requests and responses leads to security risks and mapping issues. Request DTOs capture input parameters (with strict validation rules), while Response DTOs contain output data (excluding sensitive fields like password hashes).

---

## 📋 Backend DTO Validation Annotations Matrix

| DTO Name | Target Field | Validation Annotation | Error Message Description |
| :--- | :--- | :--- | :--- |
| **RegisterRequestDto** | `username` | `@NotBlank`, `@Size(min = 3, max = 30)` | Username is required and must be 3-30 characters long. |
| **RegisterRequestDto** | `email` | `@NotBlank`, `@Email` | A valid email address format is required. |
| **RegisterRequestDto** | `password` | `@NotBlank`, `@Size(min = 8, max = 100)` | Password must be at least 8 characters long. |
| **ExpenseRequestDto** | `expense_name`| `@NotBlank`, `@Size(max = 100)` | Expense name is required (max 100 characters). |
| **ExpenseRequestDto** | `amount` | `@NotNull`, `@DecimalMin(value = "0.01")`| Amount must be a positive decimal value of at least 0.01. |
| **ExpenseRequestDto** | `category_id` | `@NotNull` | Category ID reference is required. |

---

## 💎 Advantages
- **Optimal Connection Usage**: Invalid requests are dropped early at the controller layer, avoiding unnecessary database queries or transaction executions.
- **Clean Service Logic**: Service methods can assume they are receiving valid, sanitized parameter objects, keeping business logic clean.
- **Structured Error Responses**: Spring MVC automatically translates validation exceptions into standardized REST error response payloads.

## ⚠️ Risks & Mitigations
1. **Risk**: Input validations bypassing security checks due to missing `@Valid` annotations in controller methods.
   - *Mitigation*: Implement automated static analysis checks (ArchUnit tests) that scan controller methods, verifying all request bodies are annotated with `@Valid`.
2. **Risk**: Exposing stack traces when validation failures occur.
   - *Mitigation*: Configure the centralized exception handler to catch `MethodArgumentNotValidException`, extracting validation errors and returning them in a standardized, clean JSON envelope.

## 🚀 Future Scalability Notes
- **Custom Constraint Validators**: If future business requirements mandate complex validations (e.g. verifying a category belongs to a user before saving an expense), custom annotations (like `@ValidUserCategory`) can be implemented to run clean, reusable checks.

## 🛠️ Best Practices
- **Mirror database constraints**: Ensure DTO validation limits align with database constraints (e.g. `@Size(max = 100)` matching a `VARCHAR(100)` column).
- **Never reuse DTOs for different APIs**: Keep DTO models focused and dedicated to specific endpoints.
- **Provide clear, actionable messages**: Validation messages should explain exactly how to resolve the input failure.
