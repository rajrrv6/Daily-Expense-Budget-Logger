import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const LEGEND_FORMATTER = (value) => <span className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">{value}</span>;

const CategoryPieChart = React.memo(({ data }) => {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-450 text-sm">
        No category data to display.
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    border: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}`,
    borderRadius: '8px',
    color: isDark ? '#F1F5F9' : '#0F172A',
  };

  return (
    <div className="h-64 w-full" aria-label="Category Spending Breakdown Chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`₹${parseFloat(value).toFixed(2)}`, 'Spent']}
            contentStyle={tooltipStyle}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={LEGEND_FORMATTER}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

CategoryPieChart.displayName = 'CategoryPieChart';

export default CategoryPieChart;
