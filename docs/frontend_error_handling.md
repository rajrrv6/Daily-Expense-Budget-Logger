# Frontend Error Handling Strategy (frontend_error_handling.md)

## 🎯 Objectives
The primary objective of the **Frontend Error Handling Strategy** is to establish clear error boundaries in the React client. This ensures API errors, network failures, form validation drops, and component crashes are caught and handled gracefully without breaking the user experience.

## 🔍 Scope
- **In-Scope**:
  - React Error Boundary setup for component crash isolation.
  - Global Axios response interceptor error catching.
  - Form validation validation display logic (React Hook Form).
  - Dynamic user-facing error indicators (Toast notifications, inline alerts, screen skeletons).
  - Fallback error layout screen design.
- **Out-of-Scope**:
  - Backend controller exception translations.

## 🏗️ Design Decisions
1. **React Error Boundaries**:
   - *Rationale*: An uncaught error in a child component can crash the entire React application. Wrapping major sections (like the sidebar or analytical panels) in Error Boundaries isolates crashes, keeping the rest of the application functional.
2. **Standard Toast Notifications (React Hot Toast)**:
   - *Rationale*: Provides users with immediate feedback for background errors (e.g. "Failed to log expense") without disrupting active page layouts or form entries.

---

## 🚫 Error Scopes & Actions Matrix

| Error Type | Detection Point | User Interface Reaction | Recovery Action |
| :--- | :--- | :--- | :--- |
| **Component Crash** | React Error Boundary. | Displays fallback error layout card with details. | Refresh button trigger. |
| **Expired Session**| Axios Interceptor (401). | Displays "Session expired" message. | Redirects user to login. |
| **API Server Down** | Axios Interceptor (Network).| Displays toast error message. | Prompts user to retry request. |
| **Form Invalid** | React Hook Form (Zod). | Renders red warning text under fields. | Highlights invalid input fields. |

---

## 💎 Advantages
- **Robust App Lifecycle**: Component crashes do not cause the entire web page to go blank.
- **Immediate User Feedback**: Toast notifications keep users informed of background failures immediately.
- **Consistent Visual Warnings**: Form validation errors use the same styling across the application.

## ⚠️ Risks & Mitigations
1. **Risk**: Infinite page redirection loops when handling authentication failures.
   - *Mitigation*: Ensure the Axios 401 interceptor clears local storage credentials and cancels pending requests before triggering redirects to the login route.
2. **Risk**: Revealing sensitive server stack traces in frontend error views.
   - *Mitigation*: Configure the frontend to display only user-friendly error messages (e.g., "An unexpected error occurred. Please try again later") for internal server errors.

## 🚀 Future Scalability Notes
- **Sentry Integration**: In later enterprise phases, integrate error logging tools (like Sentry or LogRocket). This allows the frontend to automatically report uncaught runtime errors and stack traces to a centralized dashboard for developer analysis.

## 🛠️ Best Practices
- **Never swallow errors**: Log caught exceptions to the browser console using `console.error` to ensure issues stay visible.
- **Provide recovery steps**: Fallback screens should offer users clear recovery actions (e.g. reload buttons) rather than static error messages.
- **Set clear validation triggers**: Highlight form inputs with validation failures clearly using high-contrast red borders.
