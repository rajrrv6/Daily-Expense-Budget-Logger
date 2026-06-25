# Phase 2: Authentication System (phase_02_authentication_system.md)

## 🎯 Objectives
The primary objective of **Phase 2** is to implement a secure user registration and login system. This includes configuring BCrypt password hashing, setting up Spring Security, building a stateless JWT filter chain, and implementing forms for user login and registration.

## 🔍 Scope
- **In-Scope**:
  - Spring Security configuration setup (`SecurityFilterChain`).
  - Hashing passwords using BCrypt.
  - JWT creation, validation, and parsing logic.
  - Login and Registration API endpoints.
  - Client registration and login forms with validation checks (React Hook Form + Zod).
- **Out-of-Scope**:
  - Role-Based Access Control (RBAC) role mappings.

## 🏗️ Design Decisions
1. **Stateless JWT Security Session Model**:
   - *Rationale*: Storing session states in memory restricts backend scalability. Stateless JWT token verification on each request enables fast horizontal scaling of backend servers.
2. **Disable CSRF (Cross-Site Request Forgery)**:
   - *Rationale*: Since the API is stateless and does not use cookies for authentication, CSRF is disabled. JWT tokens are passed via explicit authorization headers, protecting the API from browser CSRF attacks.

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

## 🛠️ Best Practices
- **Define strict path rules**: Always declare public routes explicitly, locking down all other endpoints by default (`anyRequest().authenticated()`).
- **Never return password hashes**: Exclude hash values from DTOs.
- **Set short access token lifespans**: Keep access token lifespans short (15-30 minutes).

---

## 🏛️ Phase-Specific Execution Parameters

### 1. Architecture Impact
The Spring Security filter chain is integrated into the backend application, intercepting all HTTP requests before they reach resource controllers. The frontend routing structure adds a dedicated route guard wrapper to manage page access.

### 2. Security Considerations
- Validate user passwords for complexity at registration.
- Sanitize registration inputs to prevent XSS.
- Ensure authentication exceptions return standard JSON error payloads, preventing stack traces from leaking.

### 3. Testing Scope
- Write unit tests for the JWT utility class to verify token creation, claim parsing, and expiration logic.
- Verify registration validations block duplicate usernames and invalid email formats.
- Verify login attempts reject incorrect credentials, returning a generic error response.

### 4. Deployment Considerations
- Configure production environment variables with secure, randomly generated JWT secret keys.
- Enforce secure HTTPS connection parameters at the proxy gate.

### 5. Rollback Strategy
If security implementation fails:
- Disable the JWT filter in the Spring Security filter chain, reverting security configurations to public access temporarily for testing.
- Roll back Git branch modifications to the last approved Phase 1 commit tag.
- Re-run security integration tests.
