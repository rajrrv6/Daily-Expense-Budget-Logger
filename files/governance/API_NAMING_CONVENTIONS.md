# API & Code Naming Conventions (API_NAMING_CONVENTIONS.md)

## 🎯 Objectives
The primary objective of the **API & Code Naming Conventions** is to establish uniformity, clarity, and consistency across all endpoints, data structures, and architectural layers of the Daily Expense & Budget Logger. Strict adherence to these rules ensures the codebase is self-documenting and easy to maintain.

## 🔍 Scope
- **In-Scope**:
  - HTTP endpoint resource naming and versioning.
  - JSON payload casing and key standards.
  - Class naming rules across layers (Entities, Repositories, Services, DTOs, Exceptions, Enums).
  - Common pagination metadata response schemas.
- **Out-of-Scope**:
  - Database schema constraint naming rules (handled in database architectural documents).
  - Frontend React component folder structures.

---

## 🚦 Casing Standards Matrix

| Item | Standard Case | Example | Notes |
| :--- | :--- | :--- | :--- |
| **Java Class Names** | `PascalCase` | `ExpenseController` | Applied to all classes, interfaces, and records. |
| **Java Variables/Methods** | `camelCase` | `calculateTotalAmount()` | Standard Java code naming convention. |
| **JSON Fields** | `camelCase` | `{"categoryId": 12}` | Matching Java field names for automatic serialization. |
| **Database Tables/Columns** | `snake_case` | `expense_items`, `user_id` | Standard SQL schema mapping. |
| **HTTP Paths** | `kebab-case` | `/api/v1/budget-categories` | Lowercase URLs separated by hyphens (nouns only). |
| **Query Parameters** | `camelCase` | `?pageNumber=0&pageSize=10` | Aligned with request DTO mapping variables. |
| **Enum Constants** | `UPPER_CASE` | `EXPENSE_UPDATED` | Separated by underscores if multi-word. |

---

## 📡 HTTP API Naming Standards

### 1. Endpoint Resource Paths
- **Rule**: Paths must use nouns (representing resources) in the plural, never verbs. Action context is derived from HTTP request methods.
- **Example**:
  - `GET /api/v1/expenses` (Retrieve expenses - Plural Noun)
  - `POST /api/v1/expenses` (Create an expense - Plural Noun)
  - *Incorrect*: `POST /api/v1/createExpense` (Uses verb)
  - *Incorrect*: `GET /api/v1/getExpenses` (Uses verb)

### 2. Hierarchical Relationships
- **Rule**: Nested sub-resources must follow a logical top-down hierarchy.
- **Example**: `/api/v1/users/{userId}/expenses/{expenseId}` (Accesses a specific expense belonging to a specific user).

### 3. API Versioning
- **Rule**: All API endpoints must be prefixed with a lowercase version identifier.
- **Example**: `/api/v1/expenses`

---

## 🏗️ Backend Component Naming Conventions

### 1. Data Transfer Objects (DTOs)
- **Suffix Standard**: All DTOs must carry the suffix `RequestDto` or `ResponseDto` depending on their role in the HTTP lifecycle.
- **Rules**:
  - Use `RequestDto` for inbound request payloads.
  - Use `ResponseDto` for outbound response payloads.
- **Examples**:
  - `UserRegisterRequestDto`
  - `ExpenseResponseDto`

### 2. JPA Entities
- **Naming Standard**: Singular nouns representing database tables. No suffix.
- **Rules**:
  - Map directly to tables.
  - Do not use `Entity` or `Table` suffixes.
- **Examples**:
  - `User` (maps to `users` table)
  - `Expense` (maps to `expenses` table)

### 3. Services
- **Naming Standard**:
  - **Interface**: Named after the resource and business domain, no prefixes or suffixes.
  - **Implementation**: Suffixed with `ServiceImpl`.
- **Examples**:
  - Interface: `ExpenseService`
  - Implementation: `ExpenseServiceImpl`

### 4. Repositories
- **Naming Standard**: Named after the associated JPA entity and suffixed with `Repository`.
- **Examples**:
  - `UserRepository` (extends `JpaRepository<User, Long>`)
  - `ExpenseRepository` (extends `JpaRepository<Expense, Long>`)

### 5. Exceptions
- **Naming Standard**: Describe the error condition clearly and suffix with `Exception`.
- **Examples**:
  - `ResourceNotFoundException`
  - `InvalidTransactionException`

### 6. Enums
- **Naming Standard**: Singular noun representing the type of status or categorization. No suffix. Values must be `UPPER_CASE`.
- **Examples**:
  - Type: `ExpenseCategory`
  - Values: `FOOD`, `UTILITIES`, `ENTERTAINMENT`, `TRAVEL`

---

## 📄 Pagination Response Structure

To avoid inconsistent representations of paginated data across different endpoints, all paginated responses must wrap their results in a standard schema:

```json
{
  "content": [
    {
      "id": 1,
      "amount": 25.50,
      "description": "Lunch with team",
      "date": "2026-06-24"
    }
  ],
  "pageNumber": 0,
  "pageSize": 10,
  "totalElements": 45,
  "totalPages": 5,
  "isLast": false
}
```

### JSON Pagination Keys:
- `content`: Array of data objects (DTOs) for the current page.
- `pageNumber`: The zero-indexed page index (starts at 0).
- `pageSize`: Number of items requested per page.
- `totalElements`: Total number of matching elements in the database.
- `totalPages`: Total number of pages available (`totalElements` / `pageSize`).
- `isLast`: Boolean flag indicating if this is the final page (`pageNumber == totalPages - 1`).
