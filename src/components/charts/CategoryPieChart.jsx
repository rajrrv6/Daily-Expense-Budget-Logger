import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: '#0F172A',
  border: '1px solid #1E293B',
  borderRadius: '8px',
  color: '#F1F5F9',
};

const LEGEND_FORMATTER = (value) => <span className="text-xs text-slate-400">{value}</span>;

const CategoryPieChart = React.memo(({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No category data to display.
      </div>
    );
  }

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
            formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, 'Spent']}
            contentStyle={TOOLTIP_CONTENT_STYLE}
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
