import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const LEGEND_FORMATTER = (value) => <span className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">{value}</span>;

const CategoryPieChart = React.memo(({ data }) => {
  const { isDark } = useTheme();
  const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < 480);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400 text-sm">
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
    <div className="h-[220px] w-full" aria-label="Category Spending Breakdown Chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 30 : 40}
            outerRadius={isMobile ? 50 : 60}
            paddingAngle={3}
            dataKey="value"
            isAnimationActive={true}
            label={isMobile ? null : ({ name, percent, x, y, textAnchor }) => {
              if (!percent || percent < 0.01) return null;
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  fill={isDark ? '#94A3B8' : '#475569'}
                  fontSize={10}
                  fontWeight="700"
                >
                  {`${name} (${(percent * 100).toFixed(0)}%)`}
                </text>
              );
            }}
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
