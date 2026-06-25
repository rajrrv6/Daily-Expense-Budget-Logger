# Security Implementation Plan (security_planning.md)

## 🎯 Objectives
The primary objective of the **Security Implementation Plan** is to define the security controls required to protect the application. This includes user password protection, stateless session management, API authorization gates, secure response headers, and future refresh token and RBAC architectures.

## 🔍 Scope
- **In-Scope**:
  - Spring Security Filter Chain.
  - JWT creation and validation.
  - Password hashing configurations (BCrypt strength 12).
  - Controller DTO validation.
  - CORS whitelist mapping.
  - Secure HTTP header policy specifications.
  - Future Refresh Token structure.
  - Future Role-Based Access Control database migrations.
- **Out-of-Scope**:
  - Operating system firewalls.

## 🏗️ Design Decisions
1. **Stateless Authentication Model**:
   - *Rationale*: Storing session states in memory restricts backend scalability. Stateless JWT token verification on each request enables fast horizontal scaling of backend servers.
2. **Standard JWT Claims Signature (HMAC-SHA512)**:
   - *Rationale*: Signing keys must have a minimum length of 512 bits to protect tokens from brute-force decryption attacks.
3. **Database-backed Refresh Tokens (Future Integration)**:
   - *Rationale*: Allows users to stay logged in without storing long-lived access tokens on clients, using a secondary database-backed refresh token to rotate short-lived access tokens securely.

---

## 💎 Advantages
- **Robust Security**: Hashed passwords prevent credential exposure even if the database is compromised.
- **Improved Performance**: Validating stateless JWT tokens locally in memory avoids recurring database queries for session validation.
- **Client Flexibility**: Stateless APIs allow React clients and mobile apps to interact with the server using the same authentication endpoints.

## ⚠️ Risks & Mitigations
1. **Risk**: Exposure of JWT tokens on public networks.
   - *Mitigation*: Enforce HTTPS transport security (SSL/TLS) for all production routes to encrypt data in transit.
2. **Risk**: JWT signing key exposure.
   - *Mitigation*: Do not hardcode the JWT secret key. Load it dynamically from environment variables at startup, utilizing a key with a minimum length of 512 bits.

## 🚀 Future Scalability Notes
- **Oauth2 & SSO Integration**: The security filters are designed to support future Oauth2 integrations (like Google or Apple login) by configuring alternative authentication provider beans.
- **OAuth2 Resource Server Integration**: The system can scale to an OAuth2 Resource Server pattern, outsourcing authentication to specialized IAM servers (like Keycloak or Okta).

## 🛠️ Best Practices
- **Define strict path rules**: Always declare public routes explicitly, locking down all other endpoints by default (`anyRequest().authenticated()`).
- **Never return password hashes**: Exclude hash values from DTOs.
- **Set short access token lifespans**: Keep access token lifespans short (15-30 minutes).

---

## 🔒 Security Gate Specifications

### 1. Spring Security Configuration
All requests enter through the custom security filter chain:
- **CORS Filter**: Restricts request origins.
- **CSRF Config**: Disabled because authentication is stateless.
- **JWT Filter**: Intercepts requests, parses headers for Bearer tokens, validates keys, and sets the Spring `SecurityContext`.
- **Authentication Entry Point**: Catches access failures and returns standard JSON responses instead of stack traces.

### 2. Password Encryption
Passwords are encrypted using BCrypt:
- **Algorithm**: BCrypt password hashing.
- **Strength Factor**: 12 (increases encryption time slightly to protect against brute-force attacks).
- **Match Checks**: Executed using Spring Security's `PasswordEncoder.matches()` helper.

### 3. Secure HTTP Response Headers
NGINX configurations inject security headers to protect users:
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`
- `X-Frame-Options: DENY` (prevents clickjacking attacks).
- `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing).
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (enforces HTTPS).

### 4. Future Refresh Token & RBAC Integration
- **Refresh Token Table**: A future migration will introduce a `refresh_tokens` table, storing hashed values linked to users and expiration parameters to allow secure session refreshes.
- **RBAC Transition**: Introduce a `roles` table and a `user_roles` join table, shifting the application from simple user isolation to structured group and role permissions.
- **Method Security**: Enable Spring `@PreAuthorize("hasRole('ADMIN')")` annotations on controller routes to restrict endpoint access based on roles.
