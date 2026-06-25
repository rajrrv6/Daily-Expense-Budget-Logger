# Git Workflow & Release Gates (GIT_WORKFLOW.md)

## 🎯 Objectives
The primary objective of the **Git Workflow** is to establish a secure, consistent method for code versioning, team collaboration, branch naming, and release management. Adhering to these rules prevents branch divergence, ensures clean histories, and blocks unverified code from reaching production.

## 🔍 Scope
- **In-Scope**:
  - Branching model (GitFlow or simplified Trunk-Based Development).
  - Branch naming conventions.
  - Commit message formatting rules (Conventional Commits style).
  - Pull Request (PR) review checklists and gates.
  - Deployment release tagging.
- **Out-of-Scope**:
  - Specific Git repository hosting provider billing accounts.

## 🏗️ Design Decisions
1. **Simplified Trunk-Based Development**:
   - *Rationale*: For small teams and initial releases, GitFlow (with complex release and develop branches) introduces unnecessary overhead. Trunk-Based Development—where developers branch off `main` and merge back via Pull Requests after testing—ensures fast iteration while keeping codebase integration smooth.
2. **Mandated Conventional Commits**:
   - *Rationale*: Standardizing commit formats allows tools to automatically parse changes, generate changelogs, and determine semantic version increments (e.g. major, minor, patch).

---

## 🌳 Branching & Commit Conventions

### 1. Branch Naming Rules
Branches must be created off `main` and use prefix labels:
- **Features**: `feat/` followed by a brief description (e.g., `feat/jwt-authentication`).
- **Bug Fixes**: `fix/` followed by a brief description (e.g., `fix/expense-decimal-rounding`).
- **Documentation**: `docs/` followed by a brief description (e.g., `docs/update-api-spec`).
- **Refactoring**: `refactor/` followed by a brief description (e.g., `refactor/toast-context-logic`).
- **Testing**: `test/` followed by a brief description (e.g., `test/add-user-unit-tests`).

### 2. Conventional Commits Standard
Commit messages must follow the structure:
`<type>(<scope>): <short description>`

*Types include*:
- `feat`: A new feature code implementation.
- `fix`: A bug fix.
- `docs`: Documentation updates only.
- `style`: Changes that do not affect code logic (formatting, missing semi-colons).
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Updates to build scripts, configurations, or dependencies (e.g., dependency bump).

*Examples*:
- `feat(auth): implement jwt token generation helper`
- `fix(ledger): correct pagination sorting condition on date field`

---

## 💎 Advantages
- **Clean Git History**: Structured commits make identifying when a bug was introduced and reverting changes straightforward.
- **Automated Workflows**: Standard commit types enable future CI/CD systems to auto-generate release notes.
- **Fewer Conflicts**: Short-lived branches merged frequently limit complex merge conflicts.

## ⚠️ Risks & Mitigations
1. **Risk**: Developers pushing code directly to the `main` branch.
   - *Mitigation*: Enable repository branch protection rules on `main` to block direct pushes, requiring all changes to pass through a Pull Request with at least one approved code review.
2. **Risk**: Merging broken builds into `main`.
   - *Mitigation*: Implement a CI pre-merge gate that compiles both frontend and backend code and runs all unit tests. The PR cannot be merged if any check fails.

## 🚀 Future Scalability Notes
- **Semantic Release Automation**: Once development hits scale, configure Semantic Release tools. These tools automate the release pipeline—creating tags, updating `package.json`/`pom.xml` versions, and pushing Docker images—triggered by merge commits to `main`.

## 🛠️ Best Practices
- **Keep branches short-lived**: Branches should ideally be merged back to `main` within 2-3 days of creation.
- **Rebase frequently**: Rebase feature branches against `main` before submitting PRs to resolve conflicts early.
- **Squash on merge**: Squash feature branch commits into a single commit when merging to `main` to keep the main branch history clean.
