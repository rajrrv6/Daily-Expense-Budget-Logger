import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: '#0F172A',
  border: '1px solid #1E293B',
  borderRadius: '8px',
  color: '#F1F5F9',
};

const LEGEND_FORMATTER = (value) => <span className="text-xs text-slate-400">{value}</span>;
const GRID_STROKE_DASHARRAY = '3 3';

const CategoryComparisonChart = React.memo(({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No category comparison data available.
      </div>
    );
  }

  // Format data for Recharts
  const formattedData = data.map((item) => ({
    name: item.categoryName,
    'Current Month': parseFloat(item.currentMonthAmount),
    'Previous Month': parseFloat(item.previousMonthAmount),
  }));

  return (
    <div className="h-64 w-full" aria-label="Category Month-Over-Month Comparison Chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#1E293B" strokeDasharray={GRID_STROKE_DASHARRAY} />
          <XAxis
            dataKey="name"
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            formatter={(value, name) => [`$${parseFloat(value).toFixed(2)}`, name]}
            contentStyle={TOOLTIP_CONTENT_STYLE}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={LEGEND_FORMATTER}
          />
          <Bar dataKey="Previous Month" fill="#475569" radius={[4, 4, 0, 0]} isAnimationActive={true} />
          <Bar dataKey="Current Month" fill="#6366F1" radius={[4, 4, 0, 0]} isAnimationActive={true} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

CategoryComparisonChart.displayName = 'CategoryComparisonChart';

export default CategoryComparisonChart;
