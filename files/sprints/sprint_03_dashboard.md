# Sprint 3: Dashboard Module (sprint_03_dashboard.md)

## 🎯 Sprint Objective
The primary focus of **Sprint 3** is to build the central dashboard views. This includes creating a unified dashboard aggregation API endpoint, implementing client dashboard cards, and mapping basic budget status progress bars.

## 📦 Features Included
- Consolidated dashboard aggregation API.
- Dashboard grid layout (cards showing total expenses, budget status, highest category).
- Budget utilization progress bar with HSL alerts.
- Quick action buttons (Add Expense modal triggers).

## 🛠️ Tasks Breakdown
- Create a unified dashboard DTO mapping recent transactions and aggregated totals.
- Write a dashboard REST controller mapping queries.
- Build the dashboard view page grid in the React client.
- Implement summary metric card components.
- Develop the budget utilization progress bar, color-coding warning levels.

## 📥 Entry Criteria
- Sprint 2 authentication system is complete.
- Staging database is active and populated with category options.

## 📤 Exit Criteria
- Dashboard page renders correctly after successful login.
- Metric cards display correct expense totals.
- The budget utilization progress bar scales and changes color based on spending limits.

## 🚫 Blockers & Risks
- **Risk**: API query latency when compiling large dataset metrics.
  - *Mitigation*: Configure optimized database aggregation queries, retrieving dashboard totals in a single database read operation.

## 🔗 Dependencies
- JWT authentication must be verified and active to route requests to the protected dashboard API.

## 🧪 QA Checklist
- [ ] Verify dashboard API returns a single consolidated DTO payload.
- [ ] Verify unauthorized users are redirected to login when attempting to access the dashboard.
- [ ] Verify the budget progress bar changes color as spending approaches limits.
- [ ] Verify metric cards display loading skeletons while API requests are pending.

## 📦 Deliverables
- Dashboard API REST Controller.
- Dashboard DTO classes.
- React Dashboard Page.
- Reusable Card and Progress Bar components.

## ⏱️ Estimated Timeline & Complexity
- **Duration**: 5 Days.
- **Story Points**: 5 (Medium complexity).
