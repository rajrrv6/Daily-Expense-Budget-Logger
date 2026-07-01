import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const LEGEND_FORMATTER = (value) => <span className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">{value}</span>;
const GRID_STROKE_DASHARRAY = '3 3';

const CategoryComparisonChart = React.memo(({ data }) => {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400 text-sm">
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

  const tooltipStyle = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    border: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}`,
    borderRadius: '8px',
    color: isDark ? '#F1F5F9' : '#0F172A',
  };

  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const axisStroke = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="h-64 w-full" aria-label="Category Month-Over-Month Comparison Chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray={GRID_STROKE_DASHARRAY} />
          <XAxis
            dataKey="name"
            stroke={axisStroke}
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={axisStroke}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₹${value}`}
          />
          <Tooltip
            formatter={(value, name) => [`₹${parseFloat(value).toFixed(2)}`, name]}
            contentStyle={tooltipStyle}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={LEGEND_FORMATTER}
          />
          <Bar dataKey="Previous Month" fill={isDark ? '#475569' : '#94A3B8'} radius={[4, 4, 0, 0]} isAnimationActive={true} maxBarSize={32} />
          <Bar dataKey="Current Month" fill="#6366F1" radius={[4, 4, 0, 0]} isAnimationActive={true} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

CategoryComparisonChart.displayName = 'CategoryComparisonChart';

export default CategoryComparisonChart;
