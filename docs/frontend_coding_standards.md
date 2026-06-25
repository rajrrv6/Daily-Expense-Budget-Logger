# Frontend Coding Standards (frontend_coding_standards.md)

## 🎯 Objectives
The primary objective of this document is to establish coding standards and best practices for the frontend React application. This ensures high code quality, consistent styling, optimal rendering performance, and clear separations of concerns.

## 🔍 Scope
- **In-Scope**:
  - Component, hook, and file naming conventions.
  - Directory structure and organization rules.
  - Tailwind CSS class ordering standards.
  - Reusable component design principles.
  - API service layer integration.
  - Form handling and validation conventions.
  - React performance tuning (memoization, rendering cycles).
  - Global state limitations for Context API.
- **Out-of-Scope**:
  - Backend coding standards (defined in governance documents).
  - Production deployment pipeline configuration.

---

## 🚦 Naming & Directory Conventions

### 1. Component Naming
- **Format**: `PascalCase`
- **Rule**: Component filenames and their primary exported function must match exactly.
- **Example**: `ExpenseTable.jsx`, `Sidebar.jsx`

### 2. Hook Naming
- **Format**: `camelCase` starting with `use`
- **Example**: `useAuth.js`, `useExpenseFilter.js`

### 3. Folder & File Organization
- **Format**: Folders must use `kebab-case` or lowercase names. Utility files, helper functions, and styling files must use `camelCase` or `kebab-case`.
- **Directory Mapping**:
  - `src/components`: Shared, reusable presentation components (e.g., `Button.jsx`, `InputField.jsx`).
  - `src/hooks`: Shared custom React hooks.
  - `src/pages`: Screen/page-level components (e.g., `DashboardPage.jsx`, `ExpensesPage.jsx`).
  - `src/services`: API service layers, Axios instances, and endpoint clients.
  - `src/context`: React Context Providers.
  - `src/utils`: Helper functions, converters, and date utilities.

---

## 🎨 Tailwind CSS & Styling Guidelines

### 1. Class Organization & Ordering
To maintain readability, Tailwind classes must follow a logical layout order:
1. **Layout / Positioning** (`flex`, `grid`, `absolute`, `top-0`, `z-50`)
2. **Box Model / Sizing** (`w-full`, `h-32`, `p-4`, `m-2`)
3. **Typography** (`text-lg`, `font-semibold`, `text-gray-800`)
4. **Visuals / Backgrounds** (`bg-blue-500`, `rounded-lg`, `shadow-md`, `border`)
5. **Interactive / Transitions** (`hover:bg-blue-600`, `transition-colors`, `duration-200`)
6. **Responsive modifiers** (`md:flex-row`, `lg:w-1/2`)

*Example*:
```jsx
// Correct ordering
<div className="flex flex-col w-full p-6 text-white bg-slate-900 rounded-xl hover:bg-slate-800 md:w-1/3" />
```

### 2. Styling Reusability
- Avoid inline styles.
- Use utility combinations for responsiveness rather than styling breakpoints in custom CSS.

---

## 🏗️ Reusable Component Rules

1. **Pure Presentation**: Reusable UI elements (Buttons, Modals, Inputs) must be presentation-only. They should accept data/callbacks via props and must never fetch API data or access global state directly.
2. **Prop Validation**: Document expected props clearly and use default parameters or destructuring with fallback values to prevent rendering crashes.
3. **Accessibility**: Include standard ARIA roles, `alt` tags for images, and support keyboard navigation for interactive widgets (like modals and dropdowns).

---

## 📡 API Services & Form Handling

### 1. API Service Usage Standards
- **Isolation**: Network calls must never be written directly inside components. All endpoint requests must be consolidated in the `src/services/` layer (e.g., `expenseService.js`).
- **Axios Client**: Utilize a pre-configured Axios instance that automatically appends the Authorization Bearer header, sets the base URL, and implements interceptors for global error handling and `429` rate limiting fallbacks.

### 2. Form Handling Conventions
- **Controlled Components**: Use controlled forms where input states are synchronized with React state.
- **Validation**: Perform validation on the client side during input blur (`onBlur`) and submit events. Ensure error messages are displayed inline and form submission buttons are disabled if the form contains validation errors.

---

## ⚡ React Memoization & Optimization Guidelines

Excessive rendering cycles degrade UI responsiveness. Developers must follow these performance rules:

### 1. React.memo
- Wrap high-density list items or complex nested subcomponents in `React.memo` to skip rendering cycles if their input props have not changed.
- Use with care; only apply to components that render frequently with identical props.

### 2. useCallback & useMemo
- **useCallback**: Wrap callback functions passed as props to memoized child components to prevent the child from re-rendering due to function reference recreation on each parent render.
- **useMemo**: Wrap complex aggregations, sorting, and calculations (such as parsing expense charts or computing budgets) to prevent execution on every render cycle.

---

## 📊 State Management & Dashboard Optimization

To avoid performance bottlenecks on pages with large datasets (such as the expense list or dashboard analytics), follow these strict data constraints:

> [!IMPORTANT]
> **Global Context Limitation**: Do NOT store large datasets (such as raw expense arrays, aggregate chart data, or filter configurations) inside the global React Context API.
> Context updates trigger re-renders on *all* consumer components, causing significant UI stuttering when handling heavy arrays.

### 1. Context vs. Local State Allocation

| State Data | Location | Storage System | Rationale |
| :--- | :--- | :--- | :--- |
| **Auth Session** | Global | `AuthContext` | Light, required by routing guards. |
| **Theme / UI Mode**| Global | `ThemeContext` | Light, controls application styling frame. |
| **Notifications** | Global | `NotificationContext` | Queue of temporary alerts. |
| **Expenses List** | Local | Page/Container Component State | Large dataset, scoped strictly to the page. |
| **Filters & Search**| Local | Page/Container Component State | Keeps filter updates local, avoiding global layout redraws. |
| **Chart Analytics** | Local | Page/Container Component State | Derived data, only needed inside the analytics module. |

### 2. Dashboard Rendering Optimization Strategy
- **Lazy Loading / Code Splitting**: Split heavy visual components (like charts, export sheets) using `React.lazy` and `Suspense` to reduce the initial load bundle size.
- **Virtualized Lists**: If the expense dashboard renders long lists of records (more than 100 entries without pagination), implement list virtualization (e.g., `react-window`) to only render items currently visible in the viewport.
- **Local Data Invalidation**: Fetch data at the page level. Avoid sharing local lists between the edit forms and list views via global states; fetch fresh records or perform localized state modifications inside the container page.
