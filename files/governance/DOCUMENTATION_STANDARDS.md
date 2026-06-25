# Documentation Standards & Guidelines (DOCUMENTATION_STANDARDS.md)

## 🎯 Objectives
The primary objective of the **Documentation Standards** is to ensure that all documentation—ranging from code-level comments and Javadocs to architecture blueprints, API references, and system plans—remains accurate, highly structured, and implementation-ready. Keeping documentation and code in sync is critical for maintaining an enterprise software asset.

## 🔍 Scope
- **In-Scope**:
  - Javadoc commenting conventions for Spring Boot backend.
  - JSDoc comment requirements for React frontend components.
  - Markdown styles, heading hierarchies, and standard templates.
  - API endpoint documentation formats (inputs, outputs, response examples).
  - Version history and changelog documentation.
- **Out-of-Scope**:
  - Specific formatting rules for developer personal notes.

## 🏗️ Design Decisions
1. **Self-Documenting Code over Heavy Comments**:
   - *Rationale*: Writing clear, descriptive variable names (e.g. `expenseTransactionAmount` instead of `amt`) and single-responsibility methods reduces the need for redundant inline comments. Comments must document *why* code was written, while the code itself should show *how* it runs.
2. **Standardized API Schema Layouts (JSON Examples)**:
   - *Rationale*: Rather than describing API payloads in text, all API documentation must provide complete JSON payload examples. This provides developers and testing tools with clear models.

---

## 📝 Commenting & Styling Standards

### 1. Spring Boot Java Commenting (Javadocs)
All Controller, Service, and Repository methods must contain structured Javadoc comments before the class or method definition:
```java
/**
 * Processes the creation of a new daily expense transaction.
 *
 * @param requestDto DTO containing validated expense parameters.
 * @param userId Unique identifier of the authenticated user.
 * @return Standardized ApiResponse wrapping the created ExpenseResponseDto.
 * @throws ResourceNotFoundException if user or category does not exist.
 */
```

### 2. React Components Commenting (JSDoc)
All custom React hooks and common components must document their props and states:
```javascript
/**
 * A standard, responsive data table component supporting sorting and pagination.
 *
 * @component
 * @param {Object[]} columns - Array of column metadata (id, label, accessor).
 * @param {Object[]} data - Data rows to render in the table.
 * @param {number} totalRows - Total row count for pagination calculations.
 * @param {Function} onPageChange - Callback triggered when the page shifts.
 */
```

### 3. Markdown Formatting Standards
- Every markdown document must have a single `#` level heading at the top.
- Use subheadings (`##`, `###`) logically to represent sections.
- Code blocks must declare their language (e.g., ` ```java ` or ` ```javascript `) to enable syntax highlighting.
- Use clickable absolute file links (e.g., `[label](file:///absolute/path/to/file)`) when referencing other files in the project.

---

## 💎 Advantages
- **Readable Code**: Consistent commenting makes code reviews and refactoring faster.
- **Accurate Contracts**: Detailed API documentation allows frontend developers to build client views without waiting for backend routes to go live.
- **Easier Auditing**: Standard formatting simplifies validating that security and business requirements are met.

## ⚠️ Risks & Mitigations
1. **Risk**: Documentation becoming outdated as code evolves.
   - *Mitigation*: The AI Agent Workflow mandates updating architectural blueprints and API docs (`api_planning.md`) *before* modifying code files.
2. **Risk**: Over-commenting cluttering source files.
   - *Mitigation*: Forbid comments that restate what code does (e.g. `int count = 0; // initialize count to 0`).

## 🚀 Future Scalability Notes
- **Auto-Generating API Docs**: In subsequent enterprise phases, Springdoc OpenAPI / Swagger will be integrated. This allows the backend to automatically generate interactive REST API documentation directly from Javadocs and Controller annotations.

## 🛠️ Best Practices
- **No placeholders**: Every documentation file must contain complete, production-ready specifications.
- **Maintain clean file links**: Ensure all markdown links use correct absolute paths to help developers navigate the codebase easily.
- **Document exceptions**: Always document the exceptions a method throws.
