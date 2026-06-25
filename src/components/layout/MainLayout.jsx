import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function MainLayout() {
  return (
    <div className="flex w-screen h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content display frame */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Header toolbar */}
        <TopHeader />

        {/* Scrollable workspace viewport */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>

        {/* Dashboard Footer */}
        <footer className="flex items-center justify-center h-16 border-t border-slate-200 dark:border-slate-800 px-8 bg-white dark:bg-slate-900 text-center transition-colors duration-200">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} BudgetLogger Finance System. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
