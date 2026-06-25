# AI Agent Workflow & Check-In Plan (AI_AGENT_WORKFLOW.md)

## 🎯 Objectives
The primary objective of the **AI Agent Workflow** document is to establish a strict, multi-step pipeline that AI agents must follow when executing tasks. This workflow enforces documentation-first engineering, blocks the generation of raw application code before planning approvals are obtained, and defines verification gates to guarantee code quality.

## 🔍 Scope
- **In-Scope**:
  - Detailed flow diagram of the agent lifecycle.
  - Guidelines for planning, approval, execution, and verification phases.
  - Check-in protocols requiring explicit user feedback.
  - Output validation expectations (tests, linting).
- **Out-of-Scope**:
  - Configuration of host environment execution limits.

## 🏗️ Design Decisions
1. **Immutable "Plan-Wait-Execute-Verify" Loop**:
   - *Rationale*: Allowing AI agents to write code directly leads to fragmented files, broken compilation steps, and skipped requirements. Forcing a planning-gate step ensures all architectural decisions are aligned with system standards before files are modified.
2. **Mandatory Artifact Documentation (task.md, implementation_plan.md, walkthrough.md)**:
   - *Rationale*: These living documents keep the developer informed of progress, architecture changes, and testing results without polluting the terminal context.

---

## 🔄 AI Agent Development Lifecycle

```
    [Research Task / Request]
               |
               v
  +--------------------------+
  |  1. CREATE/UPDATE PLAN   |  <-- Outlines files, tables, APIs, tests
  |  (implementation_plan.md)|      Sets request_feedback = true
  +------------|-------------+
               v
  +--------------------------+
  |   2. OBTAIN APPROVAL     |  <-- Waits for user explicit message: "Approved"
  |   (Wait in planning mode)|
  +------------|-------------+
               v
  +--------------------------+
  |      3. EXECUTE          |  <-- Creates task.md tracking list
  |   (Write Code Files)     |      Marks items [/] then [x] as done
  +------------|-------------+
               v
  +--------------------------+
  |      4. VERIFY           |  <-- Runs lint, compiles codebase, runs tests
  |  (Verify / walkthrough.md)|      Generates change summaries & captures UI
  +--------------------------+
```

---

## 💎 Advantages
- **Controlled Executions**: The user retains full control over the structural changes applied to their project.
- **Zero Orphan Files**: Pre-planning prevents agents from creating dead files or outdated endpoints.
- **Clear Documentation Trail**: System updates are documented in the walkthrough artifact automatically, maintaining accurate records.

## ⚠️ Risks & Mitigations
1. **Risk**: Agents executing code edits during the "Research" phase of planning mode.
   - *Mitigation*: The system prompt enforces strict read-only permissions during planning, and block checks raise errors if files are modified before approval is received.
2. **Risk**: Incomplete walkthrough records where testing details are missing.
   - *Mitigation*: The validation check rejects walkthroughs that do not document unit test command execution and outcomes.

## 🚀 Future Scalability Notes
- **Continuous Integration Gateways**: As automated CI/CD is set up, the validation phase can integrate with GitHub Actions, automatically checking off tasks once the build pipeline succeeds.

## 🛠️ Best Practices
- **Plan for one module at a time**: Keep implementation plans focused on specific, cohesive tasks rather than mixing database, security, and charting updates into a single massive plan.
- **Provide clear, clickable links**: Always link directly to target file paths in both implementation plans and walkthroughs.
- **Wait for explicit approval**: Never interpret ambiguous user comments as approval. Wait for explicit confirmation.
- **Double-check compilation**: Run building and compiling checks after every step before concluding the task.
