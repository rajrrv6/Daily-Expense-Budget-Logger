# Daily Expense & Budget Logger - React Frontend Application

This folder contains the complete, component-driven client interface for the **Daily Expense & Budget Logger** platform, developed using React.js, Tailwind CSS, and Vite.

---

## 📂 Project Directory Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI widgets (cards, forms, tables, modals)
│   │   ├── common/      # Shared components (modals, tables, skeletons)
│   │   └── layout/      # Layout containers (sidebars, headers, route guards)
│   ├── context/         # React Context API providers (Auth, Theme, Notification)
│   ├── hooks/           # Custom React hooks (parameters, routing helpers)
│   ├── pages/           # Screen modules (Dashboard, Admin management, Analytics)
│   ├── services/        # API Client integrations (axios configurations)
│   ├── App.jsx          # Route configuration mapping
│   ├── index.css        # Core Tailwind CSS imports
│   └── main.jsx         # App mounting entry point
├── public/              # Static public assets
├── package.json         # Module script dependencies
├── vite.config.js       # Vite server configurations
└── tailwind.config.js   # Custom Tailwind extension tokens
```

---

## 🛠️ Scripts & Commands

From the `frontend` directory:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
3. **Execute ESLint Check**:
   ```bash
   npm run lint
   ```
4. **Compile Production Bundle**:
   ```bash
   npm run build
   ```

---

## 🔑 Local Environment Configuration

Ensure you create a `.env` file in the frontend root pointing to your local Spring Boot backend instance:

```env
VITE_API_BASE_URL=http://localhost:8080
```
