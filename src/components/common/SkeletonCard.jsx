import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 animate-pulse transition-colors duration-200">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
      <div className="space-y-2">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
      </div>
    </div>
  );
}
