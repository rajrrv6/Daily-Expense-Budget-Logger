import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from './NotificationCenter';

export default function TopHeader() {
  const { user } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard Overview';
      case '/expenses':
        return 'Expense Tracker';
      case '/todos':
        return 'Shopping Checklist';
      case '/analytics':
        return 'Analytics & Reports';
      case '/settings':
        return 'Profile Settings';
      default:
        return 'Budget Logger';
    }
  };

  return (
    <header className="flex items-center justify-between h-16 px-8 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/80">
      <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
        {getPageTitle()}
      </h2>

      {user && (
        <div className="flex items-center gap-6">
          <NotificationCenter />

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-200">{user.username}</span>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
            <div className="flex items-center justify-center w-9 h-9 bg-brand-500 rounded-full text-white font-bold border border-brand-100/10">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
