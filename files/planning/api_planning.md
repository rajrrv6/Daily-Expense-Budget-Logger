# REST API Specification (api_planning.md)

## 🎯 Objectives
The primary objective of the **REST API Specification** is to define the communication contracts between the React client and the Spring Boot backend. This specification details endpoint paths, HTTP verbs, request/response structures, authorization requirements, validation rules, status codes, and error responses.

## 🔍 Scope
- **In-Scope**:
  - Request/response payload schemas.
  - Path mapping structures.
  - Endpoint parameters and validation annotations.
  - Session authorization requirements (JWT headers).
  - Common status codes.
- **Out-of-Scope**:
  - Axios client implementation details.

## 🏗️ Design Decisions
1. **Generic Payload Envelope (`ApiResponse<T>`)**:
   - *Rationale*: A standardized API response structure simplifies client parsing and error handling, returning consistent fields (`success`, `message`, `data`, `errors`) across all routes.
2. **Versioned API Root Path (`/api/v1/`)**:
   - *Rationale*: Prepares the API to support updates without breaking backward compatibility.

---

## 💎 Advantages
- **Predictable API Contracts**: Clear structures allow frontend developers to mock server responses and build views quickly.
- **Unified Error Handling**: The frontend handles validation errors using the same structure across all forms.
- **Simplified Client State**: Clear envelope flags (like `success: true/false`) make handling conditional UI updates easy.

## ⚠️ Risks & Mitigations
1. **Risk**: divergence between frontend payloads and backend validation annotations.
   - *Mitigation*: Ensure Zod validation limits (lengths, ranges, character sets) align strictly with Spring Boot validation annotations.
2. **Risk**: Slow query performance as transaction tables grow.
   - *Mitigation*: Enforce page size limits on all ledger API requests, using Spring Data `Pageable` parameters.

## 🚀 Future Scalability Notes
- **API Versioning**: Standardizing response structures ensures that subsequent API versions (e.g. `/v2/`) can maintain consistent output shapes, reducing client refactoring needs.

## 🛠️ Best Practices
- **Use standard HTTP codes**: Return `200 OK` for reads/updates, `201 Created` for insertions, `400 Bad Request` for validation failures, `401 Unauthorized` for expired sessions, and `404 Not Found` for missing resources.
- **Wrap all responses**: Forbid returning raw values from controllers.
- **Serialize timestamps consistently**: Ensure all dates serialize to ISO-8601 UTC strings.

---

## 🚪 API Endpoints Specification

### 1. Authentication Endpoints

#### `POST /api/v1/auth/register`
- **Description**: Registers a new user.
- **Auth Required**: No.
- **Request Body**:
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Validation Rules**:
  - `username`: 3-30 characters, letters, numbers, and underscores.
  - `email`: Valid email format.
  - `password`: At least 8 characters, containing an uppercase letter, a lowercase letter, a digit, and a special character.
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully.",
    "timestamp": "2026-06-24T17:25:30.123Z",
    "data": {
      "user_id": "8f8b89d2-e567-422f-9721-392cf99a842f",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "errors": null
  }
  ```

#### `POST /api/v1/auth/login`
- **Description**: Authenticates user and issues a JWT token.
- **Auth Required**: No.
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "timestamp": "2026-06-24T17:26:10.002Z",
    "data": {
      "token": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9...",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "errors": null
  }
  ```

---

### 2. Expense Endpoints

#### `POST /api/v1/expenses`
- **Description**: Logs a new expense.
- **Auth Required**: Yes (`Authorization: Bearer <token>`).
- **Request Body**:
  ```json
  {
    "expense_name": "Office Supplies",
    "amount": 45.50,
    "category_id": 2,
    "transaction_date": "2026-06-24"
  }
  ```
- **Validation Rules**:
  - `expense_name`: Required, max 100 characters.
  - `amount`: Required, positive decimal value (min 0.01).
  - `category_id`: Required.
  - `transaction_date`: Required, YYYY-MM-DD format.
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Expense created successfully.",
    "timestamp": "2026-06-24T17:27:00.010Z",
    "data": {
      "expense_id": "9f7c89d2-e567-422f-9721-392cf99a842f",
      "expense_name": "Office Supplies",
      "amount": 45.50,
      "category": {
        "category_id": 2,
        "category_name": "Utilities"
      },
      "transaction_date": "2026-06-24"
    },
    "errors": null
  }
  ```

#### `GET /api/v1/expenses`
- **Description**: Retrieves paginated list of expenses.
- **Auth Required**: Yes (`Authorization: Bearer <token>`).
- **Query Parameters**:
  - `page`: default 0.
  - `size`: default 10 (max 100).
  - `sort`: default `transactionDate,desc`.
  - `category`: optional category ID filter.
  - `startDate` / `endDate`: optional date range filter.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Expenses retrieved successfully.",
    "timestamp": "2026-06-24T17:28:15.004Z",
    "data": {
      "content": [
        {
          "expense_id": "9f7c89d2-e567-422f-9721-392cf99a842f",
          "expense_name": "Office Supplies",
          "amount": 45.50,
          "category": {
            "category_id": 2,
            "category_name": "Utilities"
          },
          "transaction_date": "2026-06-24"
        }
      ],
      "totalPages": 1,
      "totalElements": 1,
      "currentPage": 0,
      "pageSize": 10
    },
    "errors": null
  }
  ```

#### `PUT /api/v1/expenses/{id}`
- **Description**: Updates an existing expense.
- **Auth Required**: Yes (`Authorization: Bearer <token>`).
- **Request Body**: Same as POST.
- **Success Response (200 OK)**: Similar to POST, showing updated values.

#### `DELETE /api/v1/expenses/{id}`
- **Description**: Soft-deletes an expense.
- **Auth Required**: Yes (`Authorization: Bearer <token>`).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Expense soft-deleted successfully.",
    "timestamp": "2026-06-24T17:29:10.005Z",
    "data": null,
    "errors": null
  }
  ```

---

### 3. Category Endpoints

#### `GET /api/v1/categories`
- **Description**: Retrieves list of categories.
- **Auth Required**: Yes (`Authorization: Bearer <token>`).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Categories retrieved successfully.",
    "timestamp": "2026-06-24T17:30:00.001Z",
    "data": [
      {
        "category_id": 1,
        "category_name": "Food",
        "category_color": "#FF5733"
      },
      {
        "category_id": 2,
        "category_name": "Utilities",
        "category_color": "#33FF57"
      }
    ],
    "errors": null
  }
  ```

---

### 4. To-Do Checklist Endpoints

#### `GET /api/v1/todo`
- **Description**: Retrieves user checklist items.
- **Auth Required**: Yes (`Authorization: Bearer <token>`).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Todo items retrieved successfully.",
    "timestamp": "2026-06-24T17:31:00.002Z",
    "data": [
      {
        "todo_id": "af8b89d2-e567-422f-9721-392cf99a842f",
        "todo_name": "Buy milk",
        "is_completed": false
      }
    ],
    "errors": null
  }
  ```

#### `POST /api/v1/todo`
- **Description**: Adds a new checklist item.
- **Auth Required**: Yes (`Authorization: Bearer <token>`).
- **Request Body**:
  ```json
  {
    "todo_name": "Buy milk"
  }
  ```
- **Success Response (201 Created)**: Similar envelope wrapping created todo DTO.

#### `PATCH /api/v1/todo/{id}/toggle`
- **Description**: Toggles completeness of a checklist item.
- **Auth Required**: Yes (`Authorization: Bearer <token>`).
- **Success Response (200 OK)**: Returns updated checklist item.
