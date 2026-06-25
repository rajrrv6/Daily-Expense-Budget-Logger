# Security Architecture Specification (security_architecture.md)

## 🎯 Objectives
The primary objective of the **Security Architecture** is to protect user resources and credentials from unauthorized access. The architecture implements industry-standard authorization mechanisms (Spring Security + JWT), secure password hashing (BCrypt), protection against common vulnerabilities (OWASP Top 10), and secure network response headers.

## 🔍 Scope
- **In-Scope**:
  - Spring Security filter chain configurations.
  - JWT creation, signing (HMAC-SHA512), parsing, and expiration logic.
  - BCrypt password encoder settings (strength factor 12).
  - CORS (Cross-Origin Resource Sharing) whitelist mapping.
  - Secure HTTP header policies (HSTS, Content Security Policy, X-Frame-Options).
- **Out-of-Scope**:
  - Operating system firewalls.

## 🏗️ Design Decisions
1. **Stateless JWT Security Session Model**:
   - *Rationale*: Storing session states in memory restricts backend scalability. Stateless JWT token verification on each request enables fast horizontal scaling of backend servers.
2. **Disable CSRF (Cross-Site Request Forgery)**:
   - *Rationale*: Since the API is stateless and does not use cookies for authentication, CSRF is disabled. JWT tokens are passed via explicit authorization headers, protecting the API from browser CSRF attacks.
3. **Double Token Verification Chain (Authentication + Ownership)**:
   - *Rationale*: Verifying token validity is insufficient. Every service method must explicitly check that the resource owner's ID matches the authenticated user ID in the JWT context before executing write/read operations.

---

## 🔒 Security Gate Layout

```
 [HTTPS Requests] ---> [CORS Filter Checks]
                             |
                             v
                 [CSRF Disable Configuration]
                             |
                             v
                 [JWT Filter Extraction]
                 (Validates Bearer Token & Sets SecurityContext)
                             |
                             v
                 [Authentication Entry Point]
                 (Catches Auth Failures & Sends 401 response)
                             |
                             v
                 [Spring REST Controllers]
```

---

## 💎 Advantages
- **Prevent Credential Sniffing**: Strong hashing (BCrypt) prevents credentials from being read even in the event of database leakage.
- **Improved Performance**: Validating stateless JWT tokens locally in memory avoids recurring database queries for session validation.
- **Client Flexibility**: Stateless APIs allow React clients and mobile apps to interact with the server using the same authentication endpoints.

## ⚠️ Risks & Mitigations
1. **Risk**: Exposure of JWT tokens on public networks or user devices.
   - *Mitigation*: Set a short token lifespan (e.g. 15 minutes) and implement a secure token refresh cycle. Always enforce HTTPS communication.
2. **Risk**: Key exposure of JWT signing secret.
   - *Mitigation*: Do not hardcode the JWT secret key in source files. Load it dynamically from environment variables at startup, utilizing a key with a minimum length of 512 bits.

## 🚀 Future Scalability Notes
- **Oauth2 and Single Sign-On (SSO)**: The Spring Security filter architecture is designed to support future Oauth2 authentication (e.g., Google or GitHub login) by configuring alternative authentication provider beans.
- **OAuth2 Resource Server Integration**: The system can scale to an OAuth2 Resource Server pattern, outsourcing authentication to specialized IAM servers (like Keycloak or Okta).

## 🛠️ Best Practices
- **Never expose passwords**: Always map entity classes to separate Response DTOs that exclude the password hash field.
- **Strict CORS policy**: Whitelist only approved domain names (e.g. `http://localhost:3000` or production domain), blocking wildcard (`*`) origins.
- **Set secure response headers**: Standardize security headers (e.g., `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).
