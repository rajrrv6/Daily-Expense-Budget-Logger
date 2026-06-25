# Sprint 5: Analytics & CSV Export (sprint_05_analytics_reports.md)

## 🎯 Sprint Objective
The primary focus of **Sprint 5** is to implement analytical charting and data export features. This includes integrating Recharts visualization charts, adding date-range filters to views, and enabling CSV data exports.

## 📦 Features Included
- Dashboard Pie chart (Category distribution).
- Dashboard Bar chart (Monthly spending trends).
- Date-range filter selection APIs and client bindings.
- CSV export generation APIs and client downloads.

## 🛠️ Tasks Breakdown
- Implement API endpoints returning aggregated categories and monthly spending totals.
- Write query specifications to filter expenses by date range.
- Bind Pie and Bar charts to dashboard layouts in the React client.
- Build date-range picker select parameters.
- Implement CSV export endpoint on backend, and map download actions on React client.

## 📥 Entry Criteria
- Sprint 4 expense CRUD operations are complete and verified.
- Analytical packages (Recharts) are installed on frontend.

## 📤 Exit Criteria
- Dashboard Pie and Bar charts render correctly, displaying active user spending totals.
- Users can filter dashboard details by date range.
- Users can successfully download accounting data in CSV format.

## 🚫 Blockers & Risks
- **Risk**: Chart rendering issues on mobile viewports due to narrow container screens.
  - *Mitigation*: Wrap all chart components in ResponsiveContainers, disabling animations on mobile viewports to optimize rendering speed.

## 🔗 Dependencies
- Core expense data must exist before charts or CSV exports can be validated.

## 🧪 QA Checklist
- [ ] Verify chart components scale when browser viewports change size.
- [ ] Verify CSV export output contains correct names, dates, amounts, and category fields.
- [ ] Verify date-range picker queries filter records correctly on ledger and chart views.
- [ ] Verify users cannot export or view other users' transaction data.

## 📦 Deliverables
- Analytics Controller class.
- Query specification helper.
- React Chart panels.
- CSV export download button.

## ⏱️ Estimated Timeline & Complexity
- **Duration**: 5 Days.
- **Story Points**: 5 (Medium complexity).
