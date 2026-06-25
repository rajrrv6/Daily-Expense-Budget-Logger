# Daily Expense & Budget Logger (Enterprise Edition)

Welcome to the **Daily Expense & Budget Logger (Enterprise Edition)**. This is a secure, scalable, and responsive full-stack enterprise-grade application designed for personal and professional expense management, budget tracking, and real-time financial analytics.

The system is built on a clean, layered backend architecture (Spring Boot 3 + Spring Security + JWT + PostgreSQL) combined with a component-driven frontend (React.js + Tailwind CSS + Recharts + Context API). It is architected to facilitate future enterprise features, including Role-Based Access Control (RBAC), multi-user department tracking, and audit log tracking.

---

## 📂 Project Directory Structure

This project follows a strict enterprise layout to isolate documentation, frontend assets, backend services, planning, sprints, and AI-agent governance:

```
daily-expense-budget-logger/
│
├── frontend/
│   ├── docs/                   # Detailed frontend design documents
│   └── [src/]                  # Future React source code (locked until approval)
│
├── backend/
│   ├── docs/                   # Detailed backend design documents
│   └── [src/]                  # Future Spring Boot source code (locked until approval)
│
├── architecture/               # Core system architecture specifications
├── planning/                   # Phase-wise plans, APIs, DB layouts, and strategies
├── sprints/                    # Sprint-by-sprint development tasks & QA checklists
├── governance/                 # AI-Agent and engineer coding boundaries & workflows
├── README.md                   # Project overview and directory map (This file)
├── PROJECT_VISION.md           # Product vision, objective, and future roadmap
├── DEVELOPMENT_ROADMAP.md      # Milestones, release gates, and schedules
├── SYSTEM_OVERVIEW.md          # Request lifecycle, data flow, and components
├── IMPLEMENTATION_STRATEGY.md  # Assembly plans and code quality guidelines
├── FUTURE_SCALABILITY_PLAN.md  # Vertical/horizontal scaling & RBAC migration strategy
└── AGENTS.md                   # AI-agent collaboration & delegation instructions
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js (v18+)
- **Styling**: Tailwind CSS (Utility-first, responsive grid system)
- **Routing**: React Router DOM (v6+ for declarative nested routes)
- **Form Handling & Validation**: React Hook Form with Zod validation
- **State Management**: React Context API (Clean, modular context providers)
- **Data Visualization**: Recharts (Interactive SVG charting library)
- **HTTP Client**: Axios (Configured with global request/response interceptors)
- **Notifications**: React Hot Toast (Toast notification triggers)

### Backend
- **Framework**: Java Spring Boot 3 (v3.2+)
- **Security**: Spring Security (Stateless filter chain, CORS/CSRF configurations)
- **Authentication**: JWT (JSON Web Tokens with HS512 signing)
- **Persistence**: Hibernate ORM / Spring Data JPA (Relational object mapping)
- **Hashing**: BCrypt (Strength factor 12 for password storage)
- **Database**: PostgreSQL (v15+ relational database)

---

## 📜 Development & Governance Guidelines

To ensure code quality and system scalability, all developer activities (including AI agents) must comply with the rules located in:
1. **[AGENTS.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/AGENTS.md)**: Guidelines for AI model collaboration and task splitting.
2. **[governance/ENGINEERING_RULES.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/governance/ENGINEERING_RULES.md)**: Coding boundaries, naming conventions, and patterns.
3. **[governance/DEVELOPMENT_CONSTRAINTS.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/governance/DEVELOPMENT_CONSTRAINTS.md)**: Immutable development boundaries (e.g., no raw queries, zero shared state bypasses).
4. **[governance/AI_AGENT_WORKFLOW.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/governance/AI_AGENT_WORKFLOW.md)**: Documentation-first engineering standards.
5. **[governance/DOCUMENTATION_STANDARDS.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/governance/DOCUMENTATION_STANDARDS.md)**: Standards for keeping architecture, API, and code comments up to date.
6. **[governance/GIT_WORKFLOW.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/governance/GIT_WORKFLOW.md)**: Branching, pull request rules, commit guidelines, and deployment gates.

---

## 🚀 Getting Started (Future Steps)

Once the Architecture & Planning Phase is approved by the Technical Planning Lead, development will begin using the following setup instructions.

### Prerequisites
- Java JDK 17 or higher
- Node.js (v18+) & npm (v9+)
- PostgreSQL (v15+)
- Maven (v3.8+) or Spring Boot wrapper

### Backend Setup
1. Create a PostgreSQL database instance named `expense_budget_logger`.
2. Configure environment variables (or `application-dev.yml`):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=expense_budget_logger
   DB_USER=postgres
   DB_PASS=yoursecurepassword
   JWT_SECRET=your_super_secret_jwt_signing_key_with_at_least_256_bits
   ```
3. Navigate to the backend directory and run:
   ```bash
   ./mvnw spring-boot:run
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   npm install
   ```
2. Create a `.env` file in the frontend root:
   ```env
   REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## 📖 Architecture & Design References

Refer to the following directories to inspect the complete blueprint of the platform:
- **System Design**: [architecture/system_design.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/architecture/system_design.md)
- **API Planning**: [planning/api_planning.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/planning/api_planning.md)
- **Database Schema**: [planning/database_planning.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/planning/database_planning.md)
- **Security & JWT Flow**: [architecture/jwt_security_flow.md](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/architecture/jwt_security_flow.md)
- **Sprint Outlines**: Refer to the [sprints/](file:///Users/sudhir88/Desktop/Daily%20Expense%20%26%20Budget%20Logger/daily-expense-budget-logger/sprints/) directory.
