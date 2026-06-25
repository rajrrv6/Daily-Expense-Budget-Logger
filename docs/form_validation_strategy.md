# Form Validation Strategy (form_validation_strategy.md)

## 🎯 Objectives
The primary objective of the **Form Validation Strategy** is to define how form inputs are handled and validated in the React client. The strategy utilizes React Hook Form paired with Zod schemas to ensure inputs are validated client-side before submission, preventing invalid API calls and improving the user experience.

## 🔍 Scope
- **In-Scope**:
  - React Hook Form setup and controller bindings.
  - Zod validation schema declarations.
  - Field error extraction and dynamic rendering.
  - User feedback triggers (error styles, focus shifts).
  - Validation parameters (login, register, expense entry forms).
- **Out-of-Scope**:
  - Database constraint mapping (delegated to `database_planning.md`).

## 🏗️ Design Decisions
1. **React Hook Form with Zod Resolvers**:
   - *Rationale*: React Hook Form minimizes unnecessary component re-renders by tracking inputs as uncontrolled components. Resolving validation schemas using Zod provides declarative, type-safe schema validation.
2. **Instant Feedback Validation Mode (`onChange` / `onTouched`)**:
   - *Rationale*: Waiting until form submission to display errors leads to poor user experiences. Configuring the validator to check fields on change after the first submission attempt provides immediate feedback.

---

## 📋 Form Validation Rules Matrix

| Form Name | Target Field | Validation Rules (Zod Schema) | Error Message Text |
| :--- | :--- | :--- | :--- |
| **Register** | `username` | `min(3).max(30).regex(/^[a-zA-Z0-9_]+$/)` | Username must be 3-30 characters, containing only letters, numbers, and underscores. |
| **Register** | `email` | `email()` | Must be a valid email address structure. |
| **Register** | `password` | `min(8).regex(/[A-Z]/).regex(/[0-9]/)` | Password must be at least 8 characters, containing an uppercase letter and a number. |
| **Expense Entry**| `expense_name`| `min(1).max(100)` | Expense name is required (max 100 characters). |
| **Expense Entry**| `amount` | `positive().finite()` | Amount must be a positive number. |
| **Expense Entry**| `category_id`| `min(1)` | Expense category selection is required. |

---

## 💎 Advantages
- **Optimal Render Performance**: React Hook Form avoids page-level lag during typing by isolating state updates to specific inputs.
- **Declarative Schemas**: Defining schemas with Zod makes input validation rules easy to read, maintain, and share across components.
- **Accurate Error States**: Ensures invalid request bodies are blocked early, reducing unnecessary API traffic.

## ⚠️ Risks & Mitigations
1. **Risk**: Input schema definitions in the frontend diverging from backend DTO annotations.
   - *Mitigation*: Ensure Zod validation limits (lengths, ranges, character sets) align strictly with Spring Boot validation annotations.
2. **Risk**: Accessibility issues where screen readers fail to detect validation errors.
   - *Mitigation*: Configure form inputs with correct accessibility attributes (e.g. `aria-invalid={!!errors[fieldName]}` and `aria-describedby`), updating screen readers dynamically when errors occur.

## 🚀 Future Scalability Notes
- **Shared Validation Schemas**: In future phases, validation schemas can be converted to JSON Schema models and shared between frontend and backend validation layers to ensure consistency.

## 🛠️ Best Practices
- **Mirror backend constraints**: Keep frontend validation limits aligned with backend database and DTO constraints.
- **Disable submit buttons during submission**: Prevent duplicate form submissions by disabling action buttons while forms are submitting.
- **Provide clear, actionable error messages**: Error text should explain exactly how to resolve the validation failure (e.g., "Enter a positive number" rather than "Invalid input").
