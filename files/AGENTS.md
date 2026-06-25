# Development Governance & Collaboration Plan (AGENTS.md)

## 🎯 Objectives
The primary objective of the **Development Governance Plan** is to establish clear rules, communication methods, and context-sharing protocols for multiple engineering processes and workflows (e.g., Code Reviewer, Development Lead, and QA Process verification) cooperating on the codebase. This ensures development consistency, minimizes context bloat, and prevents conflicting code blocks from being written.

## 🔍 Scope
- **In-Scope**:
  - Definition of development roles and workflows (Code Reviewer, Development Lead, QA Process).
  - Guidelines for task delegation, message formatting, and communication channels.
  - Rules for updating tasks (`task.md`) and tracking change history.
  - Limits on concurrent operations.
- **Out-of-Scope**:
  - Settings of IDE-level agent configurations.

## 🏗️ Design Decisions
1. **Asynchronous Single-Task Owner pattern**:
   - *Rationale*: To avoid race conditions in file modification, only one active developer/session should own and modify a specific module or directory at a time. The Development Lead defines tasks and delegates read-only analysis to the Code Reviewer or QA Process checks, maintaining total control of write operations.
2. **Standardized Communication Envelope**:
   - *Rationale*: Different workflows communicate using standard JSON-like formats detailing Task ID, Status, Findings, and Action Items. This prevents loose, ambiguous text queries and keeps process interaction highly focused.

---

## 🤝 Development Roles & Cooperation Matrix

```
       +---------------------------------------------+
       |         DEVELOPMENT LEAD / WORKFLOW         |
       |  - Defines task.md, manages user approvals |
       |  - Generates code edits and implementations |
       +---------------------+-----------------------+
                             |
         Delegates Tasks     |     Reports Progress & Findings
         & Context Logs      v     & File Contents
       +---------------------------------------------+
       |       CODE REVIEWER / QA PROCESS            |
       |  - Read-Only Codebase Explorer              |
       |  - Web Search & API Docs Analysis           |
       +---------------------------------------------+
```

---

## 💎 Advantages
- **Conflict Prevention**: Clear module ownership prevents multiple workflows from overwriting the same code blocks.
- **Context Preservation**: Read-only workflows gather context and summarize it, preventing context overflow in the Development Lead workflow.
- **Traceable Code Integrity**: All development processes write to files using the exact same standard, maintaining high readability.

## ⚠️ Risks & Mitigations
1. **Risk**: Overlapping edits on core configuration files (like `pom.xml` or `App.js`).
   - *Mitigation*: The Development Lead must lock configuration file modifications and apply changes sequentially, verifying compilation after every single modification chunk.
2. **Risk**: Circular messaging loops between workflows.
   - *Mitigation*: Limit delegation depth to 1 level (Lead -> Reviewer), and forbid QA/Reviewer processes from invoking further sub-processes without explicit Lead-level orchestration tasks.

## 🚀 Future Scalability Notes
- **Automated Coding Pipelines**: As the codebase expands, additional specialized automated roles can be declared (e.g., `DatabaseMigrator`, `TestRunner`), each isolated to their respective directory domains under strict Development Lead monitoring.

## 🛠️ Best Practices
- **Strict Documentation First**: Every workflow must read `governance/ENGINEERING_RULES.md` and `governance/DEVELOPMENT_CONSTRAINTS.md` before performing any task.
- **Verify after delegation**: The Development Lead must run dry-run validation commands or view modified file lines immediately after a QA/Reviewer process claims a task is complete.
- **Keep task.md up to date**: Always update the progress checkbox (`[ ]` to `[/]` to `[x]`) when a specific role/task starts or finishes.
