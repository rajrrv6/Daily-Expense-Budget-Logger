# Chart Visualization Strategy (chart_visualization_strategy.md)

## 🎯 Objectives
The primary objective of the **Chart Visualization Strategy** is to define the implementation details of Recharts charts inside the dashboard and analytics modules. This ensures data insights are displayed using responsive, high-contrast, and interactive SVG charts.

## 🔍 Scope
- **In-Scope**:
  - Recharts configuration wrappers (ResponsiveContainer).
  - Pie Chart design (Category Distribution).
  - Bar Chart design (Monthly spending trends).
  - SVG color palette configurations.
  - Interactive tooltips and labels styling.
  - Legend toggle layouts.
- **Out-of-Scope**:
  - Excel file rendering.

## 🏗️ Design Decisions
1. **Interactive SVG Recharts**:
   - *Rationale*: Recharts utilizes SVG elements, which scale perfectly across device sizes and screen resolutions. This provides a crisp visual appearance compared to Canvas-based alternatives.
2. **Coordinated Colors Matrix**:
   - *Rationale*: Recharts colors map directly to spending categories (e.g. food is green, utility is blue, entertainment is violet), keeping the UI consistent across ledger tables, dashboard widgets, and charts.

---

## 🎨 Visualization Chart Models

### 1. Category Distribution Pie Chart
- **Type**: Interactive Donut Chart (`<Pie innerRadius={60} outerRadius={80} />`).
- **Data Source**: Backend Category Aggregation DTO.
- **Visuals**: Displays percentage distributions inside active donut rings, highlighting selected slices on hover.

### 2. Monthly Trend Bar Chart
- **Type**: Double Rounded Bar Chart (`<Bar radius={[4, 4, 0, 0]} />`).
- **Data Source**: Backend Monthly History DTO.
- **Visuals**: Displays monthly spending trends over time, rendering a target budget line overlay to show budget limit breaches visually.

---

## 💎 Advantages
- **Responsive Layouts**: SVG containers automatically scale to fit their parent card grids.
- **Interactive Details**: Custom tooltip overlays show exact transaction amounts when data points are hovered.
- **Consistent Styling**: Unified color palettes match the application's overall design system.

## ⚠️ Risks & Mitigations
1. **Risk**: Page rendering lag when animating large datasets on mobile browsers.
   - *Mitigation*: Disable animation packages on mobile screens (`isAnimationActive={false}`) to optimize performance, rendering static SVG shapes instantly instead.
2. **Risk**: Overlapping labels when categories exceed 10 items.
   - *Mitigation*: Limit pie charts to the top 5 categories, grouping smaller categories into an "Others" category dynamically.

## 🚀 Future Scalability Notes
- **Interactive Drill-Down**: In later enterprise phases, clicking on a chart slice or bar will filter the ledger tables below automatically, letting users inspect category details directly from charts.

## 🛠️ Best Practices
- **Wrap charts in ResponsiveContainers**: Ensure all charts use responsive container wrappers to adapt to grid layout resizing.
- **Style Tooltips customly**: Keep tooltips readable by using custom HTML overlays styled with Tailwind background gradients.
- **Ensure high contrast**: Maintain readable color ratios for chart labels and legends on dark themes.
