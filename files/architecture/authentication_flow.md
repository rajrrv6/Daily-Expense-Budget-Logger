# Authentication Flow Specification (authentication_flow.md)

## 🎯 Objectives
The primary objective of the **Authentication Flow** is to detail the user login and registration process. The specification details the security gates, input validation steps, BCrypt hashing sequence, token payload structure, and JWT generation flow to ensure secure access control.

## 🔍 Scope
- **In-Scope**:
  - Registration password requirements and validation checks.
  - BCrypt password matching.
  - Authentication controller entry point design.
  - JWT creation and claims payload mapping.
- **Out-of-Scope**:
  - Details of individual API routing endpoints (delegated to `api_planning.md`).

## 🏗️ Design Decisions
1. **Stateless JWT Claims containing User Metadata**:
   - *Rationale*: Storing metadata in the JWT token (such as user email and username) avoids database queries to fetch basic profile info on every page load.
2. **Strict Password Strength Constraints**:
   - *Rationale*: Prevents brute-force dictionary attacks by enforcing a minimum length of 8 characters, containing at least one uppercase letter, one lowercase letter, one digit, and one special character.

---

## 🔐 Registration & Login Sequences (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as Auth Controller
    participant Sec as Security Service
    participant Repo as User Repository
    database DB as PostgreSQL

    rect rgb(30, 30, 40)
        note right of User: Registration Flow
        User->>API: POST /api/v1/auth/register (username, email, password)
        API->>API: Validate input schemas (Zod / JSR-380)
        API->>Repo: Check if email/username exists
        Repo-->>API: Conflict status (if exists)
        API->>Sec: Hash password via BCrypt (Strength 12)
        Sec-->>API: Password Hash
        API->>Repo: Save User Entity
        Repo->>DB: INSERT into users
        DB-->>User: 201 Created (Success DTO)
    end

    rect rgb(40, 30, 30)
        note right of User: Login Flow
        User->>API: POST /api/v1/auth/login (email, password)
        API->>Repo: Fetch User record by email
        Repo-->>API: Return User Entity
        API->>Sec: Compare input password with password_hash
        alt Match Fails
            API-->>User: 401 Unauthorized (Invalid Credentials)
        else Match Success
            API->>Sec: Generate JWT (User UUID, Email, Expire date)
            Sec-->>User: 200 OK (JWT Access Token & User metadata)
        end
    end
```

---

## 💎 Advantages
- **ACID Compliant Sign-Ups**: Unique constraints on emails and usernames prevent double-registration bugs.
- **Cryptographic Security**: Hashed passwords prevent credential exposure even if the database is compromised.
- **Stateless Efficiency**: Logged-in users query APIs directly using the JWT token without server session checks.

## ⚠️ Risks & Mitigations
1. **Risk**: Password harvesting via timed login response differences.
   - *Mitigation*: Ensure the login comparison function runs in constant time, returning a generic "Invalid email or password" error message for both username and password failures.
2. **Risk**: Username/Email enumeration during registration checks.
   - *Mitigation*: Sanitize error responses and implement rate limiting on auth endpoints to prevent scanning attacks.

## 🚀 Future Scalability Notes
- **Oauth2 & Social Sign-In**: The controller layer is designed to support OAuth2 provider tokens, enabling social sign-ins (like Google or Apple) in future updates.

## 🛠️ Best Practices
- **Never return password hashes**: Exclude hash values from DTOs.
- **Use secure transport**: Force HTTPS on login routes.
- **Validate inputs first**: Validate formats before calling the database.
- **Set short lifespans**: Keep access token lifespans short (15-30 minutes).
