# OpenAPI / Swagger Documentation Integration Strategy

This document details the strategy for integrating OpenAPI 3.0 (Swagger) specification mapping into the Daily Expense & Budget Logger backend.

---

## 📦 Dependency Integration

To generate OpenAPI definitions automatically from Java controllers, we will integrate the **Springdoc OpenAPI Starter** in `pom.xml`:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.5.0</version>
</dependency>
```

---

## ⚙️ Profile-Based Enablement

API documentation must be restricted in production environments. We will configure Springdoc parameters using environment profiles:

### Development (`application-dev.properties`)
Enable Swagger UI and OpenAPI documentation endpoints:
```properties
springdoc.api-docs.enabled=true
springdoc.swagger-ui.enabled=true
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.api-docs.path=/api-docs
```

### Production (`application-prod.properties`)
Disable documentation routes entirely to avoid exposure of api schemas:
```properties
springdoc.api-docs.enabled=false
springdoc.swagger-ui.enabled=false
```

---

## 🔒 Security Configuration

Since Spring Security is active, whitelists must permit Swagger UI paths in development:

```java
// inside SecurityConfig filter chain (dev only or conditional permit)
.requestMatchers(
    "/v3/api-docs/**",
    "/swagger-ui/**",
    "/swagger-ui.html"
).permitAll()
```

---

## 🏷️ Annotation Guidelines

To make documentation clean and self-explanatory, developers must apply standard annotations on controllers and DTOs:

### 1. Controllers
- `@Tag`: Categorize APIs (e.g., `@Tag(name = "Authentication", description = "Endpoints for user register, login, refresh, and logout")`).
- `@Operation`: Describe specific endpoints and request flows.
- `@ApiResponse`: Document expected success codes (`200 OK`, `201 Created`) and error fallbacks (`400 Bad Request`, `401 Unauthorized`, `429 Too Many Requests`).

### 2. DTOs
- `@Schema`: Describe input fields, constraints, and valid ranges (e.g., `@Schema(description = "Unique email address", example = "john@example.com")`).
