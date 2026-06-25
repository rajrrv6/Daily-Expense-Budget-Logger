# Sprint 2: Authentication & Security (sprint_02_authentication.md)

## 🎯 Sprint Objective
The primary focus of **Sprint 2** is to implement a secure user registration and login system. This includes configuring BCrypt password hashing, setting up Spring Security, building a stateless JWT filter chain, and implementing login and registration forms.

## 📦 Features Included
- Spring Security filter chain configuration.
- Password encryption using BCrypt.
- Stateless JWT token generation, parsing, and validation.
- Login and registration API endpoints.
- Client registration and login forms with validation checks.

## 🛠️ Tasks Breakdown
- Define the Spring Security configuration class.
- Implement the JWT token service class.
- Create a JWT authentication filter intercepting incoming requests.
- Implement User Registration and Login service methods.
- Write Auth REST Controllers mapped to register and login routes.
- Implement client forms for user login and registration (React Hook Form + Zod).
- Build the AuthContext state provider in the React client.

## 📥 Entry Criteria
- Sprint 1 foundation scaffolding is complete and approved.
- Database schemas are initialized and active.

## 📤 Exit Criteria
- Users can successfully register new accounts.
- Registered users can log in, receiving a valid JWT access token.
- Protected REST API endpoints reject requests that lack valid JWT headers, returning `401 Unauthorized` responses.
- Validation checks block invalid registration inputs.

## 🚫 Blockers & Risks
- **Risk**: Improper token parsing leading to authentication bypasses or false rejections.
- **Risk**: JWT signing keys exposed in public directories.
  - *Mitigation*: Externalize JWT keys to environment variables, throwing a startup error if keys are missing.

## 🔗 Dependencies
- Database user table schema must be mapped in JPA before auth services can run.

## 🧪 QA Checklist
- [ ] Verify passwords are saved in the database as BCrypt hashes.
- [ ] Verify the backend rejects invalid login attempts, returning standard JSON error payloads.
- [ ] Verify frontend validation messages trigger on invalid email formats.
- [ ] Verify the auth context updates authenticated states correctly upon login.

## 📦 Deliverables
- Spring Security configuration class.
- Custom JWT Authentication Filter.
- Auth REST Controller.
- React AuthContext Provider.
- Login and Registration form pages.

## ⏱️ Estimated Timeline & Complexity
- **Duration**: 7 Days.
- **Story Points**: 8 (Medium-High complexity).
