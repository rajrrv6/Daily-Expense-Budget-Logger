import React from 'react';

export default function BudgetCard({ budget, onEdit, onDelete }) {
  const { categoryName, monthlyLimit, warningThresholdPercent, spentAmount, exceeded, warningTriggered } = budget;

  const spent = spentAmount || 0;
  const limit = monthlyLimit || 0;
  const remaining = limit - spent;
  
  // Calculate percentage utilization
  const utilizationPercent = limit > 0 ? (spent / limit) * 100 : 0;
  const formattedPercent = utilizationPercent.toFixed(1);

  // Set colors according to warnings
  let progressColorClass = 'bg-emerald-500';
  let cardBorderClass = 'border-slate-200 dark:border-slate-800';
  
  if (exceeded) {
    progressColorClass = 'bg-red-500';
    cardBorderClass = 'border-red-500 dark:border-red-900/50';
  } else if (warningTriggered) {
    progressColorClass = 'bg-amber-500';
    cardBorderClass = 'border-amber-500 dark:border-amber-800/50';
  }

  return (
    <div className={`p-6 bg-white dark:bg-slate-900 border ${cardBorderClass} rounded-xl shadow-sm space-y-4 transition-all hover:shadow-md duration-200`}>
      {/* Title & Badges */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-md font-bold text-slate-800 dark:text-slate-100">{categoryName || 'Global Budget'}</h4>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {budget.startDate} to {budget.endDate}
          </span>
        </div>

        {/* Warnings */}
        <div className="flex flex-col items-end gap-1">
          {exceeded && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-950/20 text-red-500 border border-red-500/20">
              Exceeded
            </span>
          )}
          {!exceeded && warningTriggered && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-950/20 text-amber-500 border border-amber-500/20">
              Warning
            </span>
          )}
          {!exceeded && !warningTriggered && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-950/20 text-emerald-500 border border-emerald-500/20">
              On Track
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-slate-100 dark:border-slate-800/80">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Limit</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">₹{limit.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Spent</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">₹{spent.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Remaining</span>
          <span className={`text-sm font-semibold block ${remaining < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
            ₹{remaining.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Utilized</span>
          <span>{formattedPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-200/20">
          <div 
            className={`h-full ${progressColorClass} transition-all duration-500`}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-400">
          <span>Threshold: {warningThresholdPercent}%</span>
          <span>{exceeded ? 'Over limit!' : ''}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          onClick={() => onEdit(budget)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg hover:border-brand-500 dark:hover:border-brand-100 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(budget.id)}
          className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-white hover:bg-red-500 border border-transparent rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
