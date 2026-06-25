# JWT Authentication Strategy (jwt_authentication_strategy.md)

## 🎯 Objectives
The primary objective of the **JWT Authentication Strategy** is to define the implementation details of JWT-based authentication. This includes token creation, payload structures, signing keys, request interception, validation steps, expiration, and future refresh token processes.

## 🔍 Scope
- **In-Scope**:
  - JWT claim parameters.
  - Secret key strength guidelines (HMAC-SHA512).
  - Validation filter intercepts.
  - Expiration and payload encryption constraints.
  - Future Refresh Token database mappings.
- **Out-of-Scope**:
  - OAuth2 provider config setup.

## 🏗️ Design Decisions
1. **Stateless Expiration (15 Minutes)**:
   - *Rationale*: JWTs are cryptographically signed and cannot be revoked without state tracking (e.g. database validation). Keeping expiration short (15 minutes) limits exposure if a token is intercepted.
2. **HMAC-SHA512 Signature Verification**:
   - *Rationale*: Leverages a 512-bit key to prevent signature brute-forcing.
3. **Database-backed Refresh Tokens (Future Integration)**:
   - *Rationale*: Allows users to stay logged in without storing long-lived access tokens on clients, using a secondary database-backed refresh token to rotate short-lived access tokens securely.

---

## 📋 JWT Claims Configuration

- **Subject (`sub`)**: User UUID.
- **Issued At (`iat`)**: Generation timestamp (UTC).
- **Expiration (`exp`)**: Current timestamp + 15 minutes.
- **Custom Claim (`email`)**: Authenticated user email.
- **Custom Claim (`roles`)**: Future RBAC roles list.

---

## 💎 Advantages
- **Scales Easily**: Stateless verification reduces backend database read loads.
- **Isolates Failures**: Expired tokens are rejected at the security filter before hitting resource controllers.
- **Flexible Expiration**: Short access token windows reduce risk from token leakage.

## ⚠️ Risks & Mitigations
1. **Risk**: Exposure of JWT tokens on public networks.
   - *Mitigation*: Enforce HTTPS transport security (SSL/TLS) for all production routes to encrypt data in transit.
2. **Risk**: Key exposure of JWT signing secret.
   - *Mitigation*: Do not hardcode the JWT secret key in source files. Load it dynamically from environment variables at startup, utilizing a key with a minimum length of 512 bits.

## 🚀 Future Scalability Notes
- **JWT Blacklisting**: In later enterprise phases, a Redis-based blacklist cache will store revoked tokens until their natural expiration date, allowing instant logout support.

## 🛠️ Best Practices
- **Never include sensitive info in JWT payloads**: Forbid passwords, phone numbers, or addresses in token claims.
- **Enforce HTTPS**: Secure transport is required to prevent token sniffing.
- **Validate signature dynamically**: Verify keys on every request.
