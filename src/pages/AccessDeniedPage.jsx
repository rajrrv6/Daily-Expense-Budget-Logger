import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:scale-[1.01]">
        {/* Warning Badge Icon */}
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center text-3xl mb-6 animate-pulse">
          🚫
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          You do not have the required administrative privileges to access this view. If you believe this is an error, please contact your systems administrator.
        </p>

        {/* Action Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3 px-6 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
