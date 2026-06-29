import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function ComposedTrendChart({ data }) {
  const { isDark } = useTheme();

  // Verify that the data prop is not empty before rendering the chart components
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 text-xs font-semibold select-none">
        No monthly spend data available.
      </div>
    );
  }

  const gridStroke = isDark ? '#334155' : '#E5E7EB';
  const axisColor = isDark ? '#94A3B8' : '#64748B';

  // Custom tooltips with backdrop blur and shadow card styling
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-205 dark:border-slate-800 p-3 rounded-lg shadow-md text-xs space-y-1.5 select-none">
          <p className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <span className="text-slate-500 dark:text-slate-405 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.stroke }}></span>
                {entry.name}
              </span>
              <span className="font-black text-slate-850 dark:text-slate-100">
                ₹{entry.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col justify-between select-none" style={{ height: '340px' }}>
      
      {/* Explicit height wrapper (height={300}) to prevent any rendering constraints */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 15, right: 10, left: -22, bottom: 5 }}>
            
            <CartesianGrid stroke={gridStroke} strokeDasharray="0 0" vertical={false} />
            
            <XAxis
              dataKey="month"
              stroke={axisColor}
              fontSize={10}
              fontWeight="600"
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke={axisColor}
              fontSize={10}
              fontWeight="600"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              dx={-8}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: gridStroke, strokeWidth: 1 }} />

            {/* Actual Spend Line: Bright Blue (#007AFF) mapped to dataKey="totalSpend" */}
            <Line
              type="monotone"
              dataKey="totalSpend"
              name="Actual Spend"
              stroke="#007AFF"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#007AFF', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={true}
            />

            {/* Budget Limit Line: Vibrant Purple (#8A2BE2) mapped to dataKey="budgetLimit" */}
            <Line
              type="monotone"
              dataKey="budgetLimit"
              name="Budget Limit"
              stroke="#8A2BE2"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#8A2BE2', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={true}
            />

          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend Component placing colorful pills aligned below the chart */}
      <div className="flex justify-center items-center gap-8 pb-2 select-none">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#007AFF] inline-block shadow-sm"></span>
          <span className="text-xs font-bold text-slate-550 dark:text-slate-400">Actual Spend</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#8A2BE2] inline-block shadow-sm"></span>
          <span className="text-xs font-bold text-slate-550 dark:text-slate-400">Budget Limit</span>
        </div>
      </div>

    </div>
  );
}
