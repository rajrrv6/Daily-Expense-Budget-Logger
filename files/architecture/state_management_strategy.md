# State Management Strategy (state_management_strategy.md)

## 🎯 Objectives
The primary objective of the **State Management Strategy** is to establish clean data flow boundaries in the React client. It defines what state is managed locally, how global state (Authentication, UI Themes, Notifications) is isolated using the Context API, and how API data is handled.

## 🔍 Scope
- **In-Scope**:
  - State classification (Local component state vs. Global Context state).
  - Global Context declarations (`AuthContext`, `ExpenseContext`, `ThemeContext`).
  - Context Provider initialization and component tree placement.
  - State initialization and clean-up rules during component lifecycles.
- **Out-of-Scope**:
  - Backend database transactional states.

## 🏗️ Design Decisions
1. **Isolated Context Providers**:
   - *Rationale*: A single global state provider causes unnecessary component re-renders when unrelated variables update. Splitting states into isolated Context Providers (e.g. `ThemeContext`, `AuthContext`) ensures updates are focused and components only re-render when their relevant state changes.
2. **Local State by Default**:
   - *Rationale*: To keep components modular and maintainable, state (like modal toggle states, search filter values, form inputs) should reside locally inside individual components unless it is needed globally by other parts of the application.

---

## 🌳 Frontend State Hierarchy

```
                  [App.jsx Root Node]
                           |
            +--------------+--------------+
            | Global Providers            |
            v                             v
     [ThemeProvider]               [AuthProvider]
            |                             |
            +--------------+--------------+
                           |
                           v
              [Dashboard / Ledger Pages]
                           |
                           v
             [Local Component State Views]
             (Modal states, input forms, sorting)
```

---

## 💎 Advantages
- **Fast UI Transitions**: Local state handling keeps components responsive and prevents UI rendering lag.
- **Low Overhead**: Context-based state provides clean isolation without the complex boilerplates of large-scale state frameworks.
- **High Maintainability**: Clear state boundaries make tracking state mutations and debugging components straightforward.

## ⚠️ Risks & Mitigations
1. **Risk**: Performance degradation due to excessive component re-renders from global state updates.
   - *Mitigation*: Restructure components so heavy layouts do not listen to global contexts directly. Pass state values down as primitive props, and wrap list-rendering components in `React.memo` to skip redundant re-renders.
2. **Risk**: Authentication state discrepancies where the frontend believes a user is logged in, but the JWT has expired on the backend.
   - *Mitigation*: Ensure frontend auth checks validate both local state variables and the expiration parameter in the stored JWT payload before granting page access.

## 🚀 Future Scalability Notes
- **Transition to React Query (TanStack Query)**: As the application grows to handle complex data syncing, API caching and data fetching will migrate to React Query. This decouples local UI state from server-data caching, providing out-of-the-box support for cache updates, pagination pre-fetching, and background sync.

## 🛠️ Best Practices
- **Define default context values**: Always provide fallback values when creating contexts to prevent application crashes if components render outside their providers.
- **Keep contexts small**: Group only tightly coupled values together (e.g., login token, profile data, loading state in AuthContext).
- **Clean up side effects**: Ensure subscription hooks, event listeners, and timers are destroyed when components unmount.
