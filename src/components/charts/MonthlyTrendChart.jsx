import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const GRID_STROKE_DASHARRAY = '3 3';

const MonthlyTrendChart = React.memo(({ data }) => {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-450 text-sm">
        No monthly trend data available.
      </div>
    );
  }

  // Format month label from "YYYY-MM" to "MMM YY" for visual aesthetics
  const formattedData = data.map((item) => {
    const [year, month] = item.month.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const label = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    return {
      ...item,
      displayLabel: label,
      amount: parseFloat(item.totalAmount),
    };
  });

  const tooltipStyle = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    border: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}`,
    borderRadius: '8px',
    color: isDark ? '#F1F5F9' : '#0F172A',
  };

  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const axisStroke = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="h-64 w-full" aria-label="Monthly Spending Trend Chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray={GRID_STROKE_DASHARRAY} />
          <XAxis
            dataKey="displayLabel"
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
            formatter={(value) => [`₹${parseFloat(value).toFixed(2)}`, 'Total Spent']}
            contentStyle={tooltipStyle}
          />
          <Bar
            dataKey="amount"
            fill="#4F46E5"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

MonthlyTrendChart.displayName = 'MonthlyTrendChart';

export default MonthlyTrendChart;
