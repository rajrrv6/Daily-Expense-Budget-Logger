# Refresh Token Strategy (refresh_token_strategy.md)

## 🎯 Objectives
The primary objective of the **Refresh Token Strategy** is to secure the session lifecycle of the Daily Expense & Budget Logger application. By decoupling authentication validity (Access Token) from session persistence (Refresh Token), we ensure a seamless user experience while minimizing the risk of credential leakage and session hijacking.

## 🔍 Scope
- **In-Scope**:
  - Access Token vs. Refresh Token lifecycle and exchange flow.
  - Refresh Token Rotation (RTR) mechanics.
  - Token reuse detection and breach response.
  - Device/Session tracking metadata structures.
  - Logout invalidation flow.
  - Security hardening via HttpOnly cookies.
  - Roadmap for Redis distributed session caching.
- **Out-of-Scope**:
  - OAuth2 social login provider configurations.
  - Single-sign-on (SSO) federation protocols.

---

## 🏗️ Architectural Flow & Token Matrix

### Token Specifications
| Token Type | Storage Location | Lifetime | Purpose | Security Risks |
| :--- | :--- | :--- | :--- | :--- |
| **Access Token (JWT)** | Frontend Memory (React State) | 15 Minutes | Stateless API authentication and role-based access control. | XSS intercept (short lifespan mitigates risk). |
| **Refresh Token** | Secure HttpOnly, SameSite Cookie | 7 Days (Sliding) | Exchanging for a new Access & Refresh Token pair. | CSRF / Token Theft (mitigated by HttpOnly, SameSite, and Rotation). |

### Authentication & Token Exchange Flow

```
+----------+             +--------------+             +-----------------+
|  Client  |             | Spring Boot  |             |   PostgreSQL    |
| (Browser)|             | API Gateway  |             |    Database     |
+----+-----+             +------+-------+             +--------+--------+
     |                          |                              |
     |--- 1. POST /login ------>|                              |
     |    (Username/Password)   |                              |
     |                          |--- 2. Validate Credentials ->|
     |                          |<-- 3. Success / User entity -|
     |                          |                              |
     |                          |--- 4. Save Refresh Token --->|
     |                          |      (with Device Metadata)  |
     |<-- 5. Return JWT (Body) -|                              |
     |       & Refresh (Cookie) |                              |
     |                          |                              |
     |=== USER ACTIVE (15 mins) ===============================|
     |                          |                              |
     |--- 6. GET /expenses ---->| (Valid JWT)                  |
     |<-- 7. 200 OK / Data -----|                              |
     |                          |                              |
     |=== ACCESS TOKEN EXPIRES ================================|
     |                          |                              |
     |--- 8. GET /expenses ---->| (Expired JWT)                |
     |<-- 9. 401 Unauthorized --|                              |
     |                          |                              |
     |--- 10. POST /auth/refresh|                              |
     |    (Sends Cookie)        |--- 11. Fetch & Rotate ------->|
     |                          |        (RTR Process)         |
     |                          |<-- 12. Save New Refresh -----|
     |<-- 13. New JWT & --------|                              |
     |        New Cookie        |                              |
```

---

## 🛡️ Security Mechanics

### 1. Refresh Token Rotation (RTR)
To prevent infinite-lifetime session token vulnerability, every single token refresh request rotates **both** tokens:
- When a client sends a valid `RefreshToken_A` to `/api/v1/auth/refresh`:
  1. The server validates `RefreshToken_A`.
  2. The server generates `AccessToken_B` and `RefreshToken_B`.
  3. The server invalidates `RefreshToken_A` (marks it as used or deletes it).
  4. The server stores `RefreshToken_B` in the database.
  5. The server returns the new pair to the client.

### 2. Token Reuse Detection Strategy
RTR guarantees that a refresh token is used exactly **once**. If the server receives a request with a refresh token that has already been marked as invalidated/used:
- **Assumption**: A breach has occurred. Either the legitimate user's token was stolen, or an attacker is attempting to reuse an intercepted token.
- **Breach Response Action**:
  1. Identify the token family (all refresh tokens generated from the original login session share a parent/family ID).
  2. Immediately delete/revoke **all** refresh tokens within that token family.
  3. Force immediate logout for all active sessions of this family by returning `401 Unauthorized` for subsequent requests.
  4. Log a high-severity security alert (`WARN`/`ERROR`) containing the user ID and IP address of the reuse attempt.

### 3. Device & Session Tracking Preparation
Each active Refresh Token record in the database will be bound to device identification metadata to detect session hijacking:
- **Stored Fields**:
  - `user_id` (foreign key to User entity).
  - `token_hash` (securely hashed version of the token string).
  - `family_id` (UUID grouping rotated tokens from the same login event).
  - `user_agent` (browser and OS signature).
  - `ip_address` (IP of token creator).
  - `expires_at` (absolute expiration timestamp).
- **Validation Check**: During a refresh exchange, if the incoming request's `User-Agent` or `IP subnet` deviates significantly from the stored session record, the server will block the rotation, revoke the session, and prompt the user to re-authenticate.

### 4. Secure HttpOnly Cookie Future Compatibility
Refresh tokens must never be accessible to Javascript code.
- **Configuration**:
  - `HttpOnly`: Block access from `document.cookie` to prevent theft via Cross-Site Scripting (XSS).
  - `Secure`: Ensure cookies are only transmitted over encrypted `HTTPS` connections (always active in production, disabled for localhost development).
  - `SameSite=Strict`: Instruct browsers not to send cookies on cross-site requests, mitigating Cross-Site Request Forgery (CSRF).
  - `Path=/api/v1/auth/refresh`: Limit the cookie scope so it is only transmitted on the refresh endpoint, minimizing exposure on standard CRUD endpoints.

---

## 🚪 Invalidation & Scalability

### Logout Invalidation Strategy
When a user clicks "Logout":
1. The client sends a `POST /api/v1/auth/logout` request.
2. The server extracts the refresh token cookie, locates the active database record, and deletes it.
3. The server sends back a set-cookie header with an expired timestamp (`Max-Age=0`) to instruct the browser to discard the cookie.
4. The client discards the memory-stored Access Token (JWT) from React state.

### Future Redis/Session Blacklist Compatibility
As traffic grows, checking the PostgreSQL database for refresh token validity on every request becomes a performance bottleneck.
- **Redis Roadmap**:
  - **Whitelisting**: Store active refresh token keys in Redis with a Time-To-Live (TTL) matching the token's remaining lifespan. Validate tokens by querying Redis instead of the database.
  - **Blacklisting**: When tokens are revoked or logged out early, write their hash to a Redis blacklist with a TTL matching the token's expiration. The security filter checks the Redis blacklist before processing requests.
  - **Implementation Transition**: Define a `TokenRepository` interface. In Sprint 1, implement it using JPA/PostgreSQL. In scalability phases, swap the implementation to `RedisTokenRepository` without modifying business logic.
