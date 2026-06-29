# Frontend Development Governance & Collaboration Plan (AGENTS.md)

## 🎯 Objectives
This document establishes collaboration boundaries, context rules, and developer/AI standards for modifying, testing, and scaling the React frontend application.

## 📂 Frontend Scope & Constraints
- **State Management**: Keep standard React Contexts clean; do not add unnecessary third-party state managers unless approved.
- **Styling**: Use Tailwind CSS variables. Adhere strictly to the existing slate dark/light/system theme configuration.
- **Component Integrity**: Ensure components are isolated, reusable, and properly type-validated (or schema validated).
- **Asset Bundling**: Ensure routes are loaded lazily to preserve chunk splitting efficiency.

## 🛠️ Verification Gates
- Static Linting: `npm run lint` must yield 0 warnings and 0 errors.
- Production Bundling: `npm run build` must compile cleanly.

## 🤝 AI Agent Directives
1. **No Placeholders**: Never write placeholders; request assets or use standard components.
2. **Theme Respect**: Verify colors align with dark mode tokens (`dark:bg-slate-950`, etc.).
3. **No Direct DOM Mutations**: Always rely on React state triggers.
