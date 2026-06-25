# API Architecture Specification (api_architecture.md)

## 🎯 Objectives
The primary objective of the **API Architecture** is to define a standardized REST API interface for backend services. The specification enforces RESTful routing, HTTP verb standards, envelope request-response payloads, status codes, pagination formats, and structured error responses.

## 🔍 Scope
- **In-Scope**:
  - RESTful path mapping standards (lowercase, hyphenated, plural nouns).
  - Standard HTTP Verb usage (GET, POST, PUT, DELETE).
  - Common API response envelopes.
  - HTTP Status Code mapping.
  - Sorting and pagination parameter formats.
- **Out-of-Scope**:
  - Frontend axios client implementation.

## 🏗️ Design Decisions
1. **Standard Envelope Wrapper (`ApiResponse<T>`)**:
   - *Rationale*: Frontend components and HTTP clients require consistent response shapes to parse data successfully. Enveloping all API responses inside a unified structure containing `success`, `message`, `data`, and `errors` fields makes client-side handling simple.
2. **Path Versioning (`/api/v1/`)**:
   - *Rationale*: Ensures backward compatibility as endpoints evolve.
3. **HTTP Verb Semantics**:
   - *Rationale*: Explicit mapping of operations: GET for reads, POST for creation, PUT for updates, DELETE for soft deletion.

---

## 📦 Standard Response Envelope Format

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "timestamp": "2026-06-24T17:15:30.123Z",
  "data": {
    "expense_id": "8f8b89d2-e567-422f-9721-392cf99a842f",
    "expense_name": "Office Chairs",
    "amount": 299.99
  },
  "errors": null
}
```

---

## 💎 Advantages
- **Predictable API Contracts**: Clear structures allow frontend developers to mock server responses and build views quickly.
- **Unified Error Handling**: The frontend handles validation errors using the same structure across all forms.
- **Simplified Client State**: Clear envelope flags (like `success: true/false`) make handling conditional UI updates easy.

## ⚠️ Risks & Mitigations
1. **Risk**: Payload structure mismatch when developers return raw objects.
   - *Mitigation*: Configure Spring Boot controllers to return the generic helper class `ResponseEntity<ApiResponse<T>>`, and verify compile checks enforce this return type.
2. **Risk**: Large database payloads from unpaginated query results.
   - *Mitigation*: Forbid unpaginated list endpoints. Ledger and search APIs must accept standard query parameters `page` and `size`, mapping them to Spring Data `Pageable` parameters.

## 🚀 Future Scalability Notes
- **GraphQL or gRPC Gateways**: If the frontend requires complex data queries in the future, the REST API layers can serve as base inputs for a GraphQL gateway server without modifying the underlying service logic.

## 🛠️ Best Practices
- **Use standard HTTP codes**: Return `200 OK` for reads/updates, `201 Created` for insertions, `400 Bad Request` for validation failures, `401 Unauthorized` for expired sessions, and `404 Not Found` for missing resources.
- **Keep URI paths simple**: Use nouns for collections (e.g. `/api/v1/expenses`) rather than action names (e.g. `/api/v1/createNewExpense`).
- **Sanitize inputs**: Remove dangerous tags and format query parameters strictly.
