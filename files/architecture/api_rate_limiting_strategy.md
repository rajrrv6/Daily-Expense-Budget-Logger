# API Rate Limiting Strategy (api_rate_limiting_strategy.md)

## 🎯 Objectives
The primary objective of the **API Rate Limiting Strategy** is to secure the availability and integrity of the Daily Expense & Budget Logger API. Implementing robust rate limiting shields the application from brute-force authentication attacks, denial-of-service (DoS) attempts, API scraping, and system resource exhaustion caused by unthrottled requests.

## 🔍 Scope
- **In-Scope**:
  - Brute-force protection & progressive login throttling.
  - Client IP request limits.
  - Endpoint-level rate limiting categories.
  - Standardized HTTP `429 Too Many Requests` responses.
  - In-memory rate limiting implementation for single-node deployments.
  - Roadmap for Redis-based distributed rate limiting.
- **Out-of-Scope**:
  - Web Application Firewall (WAF) rule sets at the cloud provider level.
  - IP blacklisting/whitelisting automation (handled via infrastructure/firewalls).

---

## 🏗️ Rate Limiting Design Decisions

### 1. In-Memory Rate Limiting (Single Node)
For the initial deployment phase, the application will enforce rate limits in-memory using **Bucket4j** integrated into a Spring Boot Filter or Interceptor.
- *Mechanism*: A token bucket algorithm assigns each client IP a token bucket with a maximum capacity and a regeneration rate.
- *Scope*: Limits are tracked per client IP address (extracted from `X-Forwarded-For` header in proxy environments).

### 2. Login Throttling & Brute-Force Protection
To defend authentication endpoints (`POST /api/v1/auth/login`):
- **Consecutive Failures**: Track failed login attempts for a username/IP combination using an in-memory cache (e.g., Caffeine cache) with a 15-minute expiration.
- **Throttling Delays**: 
  - 1-3 failed attempts: No delay.
  - 4-5 failed attempts: Introduce a progressive 2-second sleep in the auth controller.
  - 6+ failed attempts: Block all login requests from that IP/username combination for 15 minutes, returning a `429 Too Many Requests` status.

---

## 🚦 Rate Limiting Categories & Thresholds

We categorize API endpoints based on resource cost, security sensitivity, and typical user interaction frequency:

| Category | Typical Endpoints | Limit Threshold (Per IP) | Refill Rate | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `/api/v1/auth/login`<br>`/api/v1/auth/register` | 5 requests / min | 1 token every 12s | Mitigates brute-force attacks and automated user creation spam. |
| **Reporting & Analytics** | `/api/v1/analytics/**` | 20 requests / min | 1 token every 3s | Limits resource-heavy aggregation and calculation queries. |
| **Export Operations** | `/api/v1/expenses/export` | 5 requests / min | 1 token every 12s | Prevents CPU/Memory spikes from PDF/CSV serialization tasks. |
| **Standard CRUD** | `/api/v1/expenses/**`<br>`/api/v1/categories/**` | 100 requests / min | 5 tokens every 3s | Generous limit for normal interactive usage and SPA synchronization. |

---

## ↩️ Fallback Handling & Client Contracts

When a client exceeds the allocated rate limits, the API must respond with a standardized structure to allow the client (frontend or API integration) to handle the exception gracefully:

### HTTP Response Headers
The server will append the following headers to rate-limited responses (and standard responses where applicable) to provide context:
- `X-RateLimit-Limit`: Maximum requests permitted in the current period.
- `X-RateLimit-Remaining`: Remaining request quota in the current window.
- `X-RateLimit-Reset`: Remaining seconds until the bucket is fully refilled.
- `Retry-After`: (Included only on `429` responses) The number of seconds the client must wait before making another request.

### HTTP Response Payload (429 Too Many Requests)
```json
{
  "timestamp": "2026-06-24T12:04:00Z",
  "status": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please wait 45 seconds before trying again.",
  "path": "/api/v1/expenses/export",
  "retryAfterSeconds": 45
}
```

### Frontend Client Fallback Action
- The Axios interceptor will catch the `429` status.
- It will read the `Retry-After` header.
- A toast notification or modal will inform the user: *"You are making too many requests. Please wait X seconds."*
- Interactive buttons for that action will be disabled temporarily until the reset window passes.

---

## 🚀 Distributed Rate Limiting Roadmap (Redis)

As the application scales to multiple application nodes behind a load balancer, local in-memory token buckets (Bucket4j) will become ineffective because rate limits will not be shared across nodes (a client could make 100 requests to Node A and another 100 to Node B).

### Redis Transition Plan
1. **Infrastructure**: Deploy a Redis instance or cluster in the environment.
2. **Library Swap**: Integrate Spring Boot Starter Data Redis and Bucket4j-Redis extension.
3. **Logic Implementation**:
   - The token bucket state will be stored in Redis keys (`rate_limit:ip_address` or `rate_limit:user_id`).
   - Every incoming request will execute an atomic Redis script (e.g., Lua script) to check and decrement the token count in Redis.
   - If Redis is unavailable, the system will fallback gracefully to local in-memory limiting as a circuit-breaker protection.
