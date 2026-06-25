# Dashboard Design Strategy (dashboard_design_strategy.md)

## 🎯 Objectives
The primary objective of the **Dashboard Design Strategy** is to specify the visual layout and user interactions of the central dashboard. It details card locations, budget indicators, recent transaction feeds, and quick actions to ensure users receive a clear and engaging overview of their financial data.

## 🔍 Scope
- **In-Scope**:
  - Visual layout design of the dashboard screen.
  - Core metric widgets (Total Monthly Expenses, Budget Progress, Highest Category).
  - Quick action buttons (Add Expense, Add Todo).
  - Recent transaction feed layout.
  - Budget progress bar calculations.
- **Out-of-Scope**:
  - Backend database schema configurations.

## 🏗️ Design Decisions
1. **Consolidated Dashboard API DTO**:
   - *Rationale*: Requesting data from separate endpoints (e.g. recent expenses, budget progress, category metrics) on page load causes network overhead and layout shifts. Creating a unified API endpoint returning a single aggregated dashboard payload ensures fast loading and smooth rendering.
2. **Visual Hierarchy and Progress Bars**:
   - *Rationale*: Budget progress utilizes dynamic HSL color indicators (e.g., green for < 70% budget used, yellow for 70-90%, red for > 90%), providing clear, instant feedback on spending limits.

---

## 🎨 Dashboard Grid Layout Blueprint

```
+--------------------------------------------------------------------------------+
|  HEADER: Greeting (e.g., "Welcome back, John") & Current Month Date Picker     |
+--------------------------------------------------------------------------------+
|  GRID 1: SUMMARY METRICS CARDS (3-Column Layout on Desktop, 1-Column on Mobile)|
|  +------------------------+ +------------------------+ +---------------------+ |
|  | Total Monthly Expenses | |   Budget Utilization   | |  Highest Category   | |
|  | $1,420.50 (+5% vs last)| |  71% ($2,000.00 Limit) | |  Food ($450.00)     | |
|  +------------------------+ +------------------------+ +---------------------+ |
+--------------------------------------------------------------------------------+
|  GRID 2: RECHARTS VISUALIZATION PANELS (2-Column Layout)                       |
|  +-------------------------------------+ +-----------------------------------+ |
|  | Category distribution (Pie Chart)   | | Monthly spending trend (Bar Chart)| |
|  +-------------------------------------+ +-----------------------------------+ |
+--------------------------------------------------------------------------------+
|  GRID 3: RECENT TRANSACTIONS FEED & QUICK ACTIONS (2-Column Layout)            |
|  +-------------------------------------+ +-----------------------------------+ |
|  | Recent Expenses List (Last 5 items) | | Quick Actions (Add expense form)  | |
|  +-------------------------------------+ +-----------------------------------+ |
+--------------------------------------------------------------------------------+
```

---

## 💎 Advantages
- **Instant Insights**: Visually structured layouts let users evaluate their budget status at a glance.
- **Optimized Data Fetching**: A unified dashboard DTO reduces backend request loads.
- **Responsive Navigation**: Users can add transactions immediately using quick action buttons without leaving the dashboard page.

## ⚠️ Risks & Mitigations
1. **Risk**: Layout shifts and loading flickers while data is fetching.
   - *Mitigation*: Render layout skeleton screens matching the exact size of the final dashboard cards while API requests are in progress.
2. **Risk**: Data truncation on mobile screens due to wide tables.
   - *Mitigation*: Hide secondary columns (e.g., category description or transaction date) on mobile screens, exposing them only when details are clicked.

## 🚀 Future Scalability Notes
- **Customizable Widgets**: The grid layout is designed to support custom dashboards in future phases, allowing users to rearrange, add, or remove analytical widgets based on preferences.

## 🛠️ Best Practices
- **Implement skeleton screens**: Avoid blank page transitions by displaying loading skeletons during API calls.
- **Use clear HSL alerts**: Color-code warnings (green/yellow/red) to indicate budget limits clearly.
- **Optimize database queries**: Fetch dashboard aggregations using optimized database queries to keep loading times low.
