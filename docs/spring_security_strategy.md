# Spring Security Strategy (spring_security_strategy.md)

## 🎯 Objectives
The primary objective of the **Spring Security Strategy** is to secure the API. It defines the stateless security filter chain, path authorization rules, CORS/CSRF configurations, password hashing strength, and authentication exception handlers.

## 🔍 Scope
- **In-Scope**:
  - Spring Security configuration class definition (`SecurityFilterChain`).
  - Path authorization rules (public vs. protected routes).
  - Custom JWT authentication filter integration.
  - BCrypt password encoder settings (strength factor 12).
  - CORS whitelist and header policy mappings.
  - Disable CSRF settings.
- **Out-of-Scope**:
  - Operating system firewalls.

## 🏗️ Design Decisions
1. **Stateless Authentication Filter Chain**:
   - *Rationale*: Storing session states in memory restricts backend scalability. Configuring stateless JWT token verification on each request enables fast horizontal scaling.
2. **Disable CSRF (Cross-Site Request Forgery)**:
   - *Rationale*: Since the API is stateless and does not use cookies for authentication, CSRF is disabled. JWT tokens are passed via explicit authorization headers, protecting the API from browser CSRF attacks.

---

## 🔒 Authorization Routing Map

| Path Pattern | Allowed Roles / Access | Rationale |
| :--- | :--- | :--- |
| `/api/v1/auth/**` | `permitAll()` | Authentication routes (login, register) must be public. |
| `/api/v1/expenses/**`| `authenticated()` | Accessing expense data requires a valid JWT token. |
| `/api/v1/categories/**`| `authenticated()` | Accessing category lists requires a valid JWT token. |
| `/api/v1/todo/**` | `authenticated()` | Accessing task lists requires a valid JWT token. |
| `/actuator/health` | `permitAll()` | Health monitoring system checks must be reachable. |

---

## 💎 Advantages
- **Robust Security**: Hashed passwords prevent credential exposure even if the database is compromised.
- **Improved Performance**: Validating stateless JWT tokens locally in memory avoids recurring database queries for session validation.
- **Client Flexibility**: Stateless APIs allow React clients and mobile apps to interact with the server using the same authentication endpoints.

## ⚠️ Risks & Mitigations
1. **Risk**: Exposure of JWT tokens on public networks.
   - *Mitigation*: Enforce HTTPS transport security (SSL/TLS) for all production routes to encrypt data in transit.
2. **Risk**: Direct database access bypasses.
   - *Mitigation*: Ensure the database ports are isolated within the internal container network, reachable only by the Spring Boot container.

## 🚀 Future Scalability Notes
- **OAuth2 and Single Sign-On (SSO)**: The Spring Security filter architecture is designed to support future Oauth2 authentication (e.g., Google or GitHub login) by configuring alternative authentication provider beans.
- **OAuth2 Resource Server Integration**: The system can scale to an OAuth2 Resource Server pattern, outsourcing authentication to specialized IAM servers (like Keycloak or Okta).

## 🛠️ Best Practices
- **Define strict path rules**: Always declare public routes explicitly, locking down all other endpoints by default (`anyRequest().authenticated()`).
- **Never hardcode secrets**: Load secret keys and encryption parameters dynamically from environment variables.
- **Set secure response headers**: Standardize security headers (e.g., HSTS, X-Content-Type-Options: nosniff).
