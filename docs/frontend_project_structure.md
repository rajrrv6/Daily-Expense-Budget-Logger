# Frontend Project Structure (frontend_project_structure.md)

## 🎯 Objectives
The primary objective of the **Frontend Project Structure** is to establish a modular, clean directory layout for the Vite React client application. It enforces strict separation of concerns, grouping common UI components, pages, state contexts, API services, styles, and utilities into dedicated, predictable folder structures.

## 🔍 Scope
- **In-Scope**:
  - Direct folder definitions inside the React project root directory.
  - Component division guidelines (common, layout, page-specific).
  - State contexts placement rules.
  - API services structure rules.
  - Utility and validation scripts organization.
- **Out-of-Scope**:
  - Backend java package folder structures.

## 🏗️ Design Decisions
1. **Feature-Grouped Pages and Shared-Atomic Components**:
   - *Rationale*: Storing all files in a single folder leads to directory clutter. Separating reusable atomic elements (e.g. Buttons, Modals) from page-specific containers ensures a clean, modular setup.
2. **Context Separation**:
   - *Rationale*: Isolating context states in a `/context/` folder prevents files from becoming cluttered with local business logic.

---

## 📂 Frontend Directory Tree Blueprint

```
frontend/
├── docs/                           # Frontend documentation & architecture plans
├── public/                         # Public assets (icons, static images)
└── src/
    ├── assets/                     # Custom SVGs, fonts, raw styling assets
    ├── components/
    │   ├── common/                 # Reusable atomic UI (Button, Input, Card)
    │   └── layout/                 # Structural shell elements (Sidebar, Header, Footer)
    ├── context/                    # State Contexts (AuthContext, ExpenseContext)
    ├── pages/                      # Page components (Dashboard, Ledger, Login)
    ├── services/                   # Axios Client configurations & API modules
    ├── styles/                     # Index CSS stylesheet (Tailwind config settings)
    ├── utils/                      # Helper scripts (date formatting, currency math)
    ├── App.jsx                     # Route coordinator & App entry point
    └── main.jsx                    # React mounting config & imports
```

---

## 💎 Advantages
- **Fast Onboarding**: Developers can locate files and debug issues immediately due to the standard directory layout.
- **Isolated Testing**: Atomic UI components can be tested independently of page-level business logic.
- **Scalable Layout**: Adding new pages or features involves creating a folder under `/pages/` without disrupting other modules.

## ⚠️ Risks & Mitigations
1. **Risk**: Developers writing page-specific components in the common components folder, causing codebase clutter.
   - *Mitigation*: Enforce code reviews that verify only generic, stateless UI items are placed in the `/components/common/` folder.
2. **Risk**: Duplicate helper functions scattered across different page directories.
   - *Mitigation*: Mandate that all utility functions are placed in the centralized `/utils/` folder and documented in code headers.

## 🚀 Future Scalability Notes
- **Component Library Conversion**: In subsequent phases, the `/components/common/` folder can be extracted into an independent Design System library (published as a private npm package) for use across multiple web applications.

## 🛠️ Best Practices
- **Use relative imports cleanly**: Use standard paths or Webpack/Vite path aliases (e.g. `@/components/`) to avoid long relative paths.
- **One component per file**: Forbid declaring multiple React components in a single file.
- **Include index entry points**: Place `index.js` files in subfolders to simplify exports.
