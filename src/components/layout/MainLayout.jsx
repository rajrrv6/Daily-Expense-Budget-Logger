import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleMobileSidebar = () => setIsMobileOpen(prev => !prev);
  const closeMobileSidebar = () => setIsMobileOpen(false);

  return (
    <div className="flex w-screen h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[3px] lg:hidden transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* Sidebar navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileOpen={isMobileOpen}
        closeMobileSidebar={closeMobileSidebar}
      />

      {/* Main content display frame */}
      <div className="flex flex-col flex-1 h-full overflow-hidden transition-all duration-300">
        {/* Header toolbar */}
        <TopHeader onToggleMobileSidebar={toggleMobileSidebar} />

        {/* Scrollable workspace viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-500/5 dark:bg-slate-950/20 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <Outlet />
          </div>
        </main>

        {/* Dashboard Footer */}
        <footer className="flex items-center justify-center h-14 border-t border-slate-200 dark:border-slate-800/80 px-4 sm:px-8 bg-white dark:bg-slate-900 text-center transition-colors duration-200 flex-shrink-0">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            &copy; {new Date().getFullYear()} BudgetLogger Finance System. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
