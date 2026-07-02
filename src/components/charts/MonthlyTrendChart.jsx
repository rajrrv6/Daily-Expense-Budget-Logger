import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const GRID_STROKE_DASHARRAY = '3 3';

const formatShortCurrency = (value) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
};

const MonthlyTrendChart = React.memo(({ data }) => {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400 text-sm">
        No spending trend data available.
      </div>
    );
  }

  // Map pre-formatted labels and values directly
  const formattedData = data.map((item) => {
    return {
      ...item,
      displayLabel: item.label,
      amount: parseFloat(item.amount),
    };
  });

  const gridStroke = isDark ? '#1E293B' : '#F1F5F9';
  const axisStroke = isDark ? '#475569' : '#94A3B8';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-150 dark:border-slate-800 p-3.5 rounded-xl shadow-xl text-xs space-y-1 select-none transition-all duration-200">
          <p className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 mb-1.5">{label}</p>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block bg-indigo-500"></span>
              Spent
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              ₹{parseFloat(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full" aria-label="Monthly Spending Trend Chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="trendBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="trendBarGradHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818CF8" stopOpacity={1} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridStroke} strokeDasharray={GRID_STROKE_DASHARRAY} vertical={false} />
          <XAxis
            dataKey="displayLabel"
            stroke={axisStroke}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke={axisStroke}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatShortCurrency}
            dx={-4}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#1E293B30' : '#F1F5F960' }} />
          <Bar
            dataKey="amount"
            fill="url(#trendBarGrad)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={true}
            maxBarSize={40}
            activeBar={{ fill: 'url(#trendBarGradHover)', stroke: '#818CF8', strokeWidth: 1.5 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

MonthlyTrendChart.displayName = 'MonthlyTrendChart';

export default MonthlyTrendChart;
