import React from 'react';

export default function EmptyState({ icon = '🔍', title = 'No data found', description = 'There are no items to display at the moment.', actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[300px] transition-colors duration-200">
      <span className="text-4xl mb-4" role="img" aria-label="Empty State Icon">
        {icon}
      </span>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
