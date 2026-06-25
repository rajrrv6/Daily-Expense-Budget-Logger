# Frontend API Integration Plan (frontend_api_integration_plan.md)

## 🎯 Objectives
The primary objective of the **Frontend API Integration Plan** is to design the API communication layer for the React client. This plan details the Axios client configuration, global request/response interceptors, JWT handling, token refreshes, and standard request payloads.

## 🔍 Scope
- **In-Scope**:
  - Axios client configurations (timeout, headers, baseURL parameters).
  - JWT request interceptor mappings.
  - Expired token response interceptors (401 redirection handler).
  - API endpoint organization rules.
  - Payload conversion standards.
- **Out-of-Scope**:
  - Spring Boot filter chain controller code.

## 🏗️ Design Decisions
1. **Unified Axios Client Instance (`apiClient.js`)**:
   - *Rationale*: Declaring separate Axios calls across pages leads to duplicate configurations. Centralizing calls inside a single client instance ensures standard timeouts (10 seconds), base URLs, and headers apply to all requests automatically.
2. **Global Auth Request Interceptor**:
   - *Rationale*: Simplifies auth tracking by automatically reading the active JWT from storage and injecting it as a Bearer token into outgoing Authorization headers.

---

## 🔁 Axios Interceptor Intercepts

```
 [React Component Service Request]
               |
               v
 +---------------------------------------+
 |      Axios Request Interceptor        | <-- Appends Bearer token from localStorage
 +-------------|-------------------------+
               |
               v Outgoing HTTP Call
        [Spring Boot API]
               |
               v Incoming HTTP Response
 +---------------------------------------+
 |      Axios Response Interceptor       | <-- Checks status codes:
 |                                       |     - 2xx: Return clean response data
 |                                       |     - 401: Clear storage & redirect to login
 +-------------|-------------------------+
               |
               v
 [React Component updates states / views]
```

---

## 💎 Advantages
- **Dry Code**: Axios interceptors eliminate duplicate token injection and error handling code across service files.
- **Improved Security**: Expired sessions are caught at the client-side boundary automatically, redirecting users to re-login.
- **Centralized Configurations**: Base URLs and environment settings reside in a single configuration file.

## ⚠️ Risks & Mitigations
1. **Risk**: API endpoints remaining unverified after URL config updates.
   - *Mitigation*: Externalize API target paths to environment variables (`.env`), using Vite configurations to load correct URLs during builds.
2. **Risk**: Application hangs caused by delayed server responses.
   - *Mitigation*: Configure strict request timeouts (10 seconds), returning standard request timeout alerts to users if connections delay.

## 🚀 Future Scalability Notes
- **Refresh Token Rotation**: The response interceptor is structured to support refresh token rotations in later phases. On receiving a `401` error, the client can request a new access token using a stored refresh token without interrupting the user's active session.

## 🛠️ Best Practices
- **Never hardcode URLs**: Load host paths from environmental configurations.
- **Keep service files modular**: Group endpoint calls logically into feature service files (e.g. `expenseService.js`, `authService.js`).
- **Return clean data**: Extract API data payloads in the response interceptor, returning cleaned JSON directly to calling components.
