# Component Reusability Strategy (component_reusability_strategy.md)

## 🎯 Objectives
The primary objective of the **Component Reusability Strategy** is to establish clean component guidelines for the React client. It enforces component-driven atomic design, state separation, and styling rules to ensure the frontend code is clean, reusable, and easy to maintain.

## 🔍 Scope
- **In-Scope**:
  - React component design levels (atomic: buttons, inputs; layout: tables, sidebars; pages: dashboard, ledger).
  - Guidelines for props and event handlers.
  - Form validation reuse strategies (React Hook Form inputs).
  - Tailwind styling consistency rules.
- **Out-of-Scope**:
  - Backend controller code.

## 🏗️ Design Decisions
1. **Stateless UI components**:
   - *Rationale*: Placing state logic directly in UI components makes them hard to reuse. Components in `/components/common/` should be stateless, receiving values and callbacks purely via props.
2. **Standard Tailwind Class Extensions**:
   - *Rationale*: UI components accept custom style injections via standard React `className` props. These custom classes are combined with the component's default styles using helper utilities like `clsx` or `tailwind-merge` to prevent style overrides.

---

## 🎨 Component Level Classifications

```
+-----------------------------------------------------------------------+
|                         PAGES (e.g. Dashboard)                        |
|  - Manages API calls, Context states, and coordinates layout components|
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|                        LAYOUTS (e.g. ExpenseTable)                    |
|  - Structured visual grids. Receives records lists via props.          |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|                       COMMON UI (e.g. Button, Input)                  |
|  - Stateless atomic wrappers. Handled with Tailwind.                  |
+-----------------------------------------------------------------------+
```

---

## 💎 Advantages
- **Fast UI Iteration**: Changes to button styles or form input layouts propagate system-wide instantly.
- **Consistent Visuals**: Tailwind grid patterns ensure all tables, inputs, borders, and animations look identical.
- **Easier Testing**: Isolated UI components are simple to unit test using tools like Jest and React Testing Library.

## ⚠️ Risks & Mitigations
1. **Risk**: Over-complicating components with excessive config props to support too many use cases.
   - *Mitigation*: If a component requires too many condition branches, split it into separate, focused components instead of writing complex logic inside one file.
2. **Risk**: Conflicting CSS classes when merging parent props with default Tailwind styles.
   - *Mitigation*: Enforce the use of a custom utility function combining `clsx` and `tailwind-merge` to resolve style conflicts cleanly.

## 🚀 Future Scalability Notes
- **Design System Extraction**: As the application expands to support mobile web views and new client modules, the components in `/components/common/` can be published as a private npm package (a shared Design System) for other projects.

## 🛠️ Best Practices
- **Define Prop Types**: Document component inputs using JavaScript JSDoc comments.
- **Keep components focused**: Each component should perform a single responsibility (e.g., render a loading skeleton).
- **Style states natively**: Handle hover, focus, and disabled states natively using Tailwind class configurations rather than JavaScript event listeners.
