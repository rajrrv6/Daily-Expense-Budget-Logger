# API Response Standardization (api_response_standardization.md)

## 🎯 Objectives
The primary objective of the **API Response Standardization** strategy is to define a unified response shape for all REST endpoints. This ensures that successful actions and failures use the same envelope structure, simplifying client-side parsing.

## 🔍 Scope
- **In-Scope**:
  - Generic class template design (`ApiResponse<T>`).
  - Standard JSON property structures (`success`, `message`, `timestamp`, `data`, `errors`).
  - Controller return mappings.
  - Serialization rules.
- **Out-of-Scope**:
  - Frontend component layouts.

## 🏗️ Design Decisions
1. **Generic Envelope Wrapper Class (`ApiResponse<T>`)**:
   - *Rationale*: Frontend HTTP clients require consistent response shapes to parse data successfully. Enveloping all API responses inside a unified structure containing `success`, `message`, `data`, and `errors` fields makes client-side handling simple.
2. **Standardized ISO-8601 Timestamp format**:
   - *Rationale*: All timestamps are formatted as ISO-8601 UTC strings (e.g. `2026-06-24T17:15:30.123Z`) to prevent timezone parsing errors across different client systems.

---

## 🚫 Standard Success & Error Envelopes

### 1. Success Payload Example
```json
{
  "success": true,
  "message": "Expense created successfully.",
  "timestamp": "2026-06-24T17:23:45.002Z",
  "data": {
    "expense_id": "8f8b89d2-e567-422f-9721-392cf99a842f",
    "expense_name": "Office Supplies",
    "amount": 45.50
  },
  "errors": null
}
```

### 2. Validation Error Payload Example
```json
{
  "success": false,
  "message": "Validation constraints failed.",
  "timestamp": "2026-06-24T17:24:10.010Z",
  "data": null,
  "errors": {
    "amount": "Expense amount must be greater than zero."
  }
}
```

---

## 💎 Advantages
- **Predictable API Contracts**: Clear structures allow frontend developers to mock server responses and build views quickly.
- **Unified Error Handling**: The frontend handles validation errors using the same structure across all forms.
- **Simplified Client State**: Clear envelope flags (like `success: true/false`) make handling conditional UI updates easy.

## ⚠️ Risks & Mitigations
1. **Risk**: Controller methods returning raw objects directly due to developer oversight.
   - *Mitigation*: Configure Spring Boot controllers to return the generic helper class `ResponseEntity<ApiResponse<T>>`, and verify compile checks enforce this return type.
2. **Risk**: High network overhead from empty fields in large responses.
   - *Mitigation*: Configure the Jackson ObjectMapper globally to skip serializing null fields (`@JsonInclude(JsonInclude.Include.NON_NULL)`).

## 🚀 Future Scalability Notes
- **API Versioning**: Standardizing response structures ensures that subsequent API versions (e.g. `/v2/`) can maintain consistent output shapes, reducing client refactoring needs.

## 🛠️ Best Practices
- **Use standard HTTP codes**: Return `200 OK` for reads/updates, `201 Created` for insertions, `400 Bad Request` for validation failures, `401 Unauthorized` for expired sessions, and `404 Not Found` for missing resources.
- **Wrap all responses**: Forbid returning raw values from controllers.
- **Serialize timestamps consistently**: Ensure all dates serialize to ISO-8601 UTC strings.
