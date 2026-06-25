import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationCenter from './NotificationCenter';

export default function TopHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' }
  ];

  const currentOption = themeOptions.find(opt => opt.value === theme) || themeOptions[2];

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
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
    <header className="flex items-center justify-between h-16 px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-wide transition-colors duration-200">
        {getPageTitle()}
      </h2>

      {user && (
        <div className="flex items-center gap-6">
          {/* Theme Selector */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-350 rounded-xl border border-slate-200 dark:border-slate-700/40 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={`Change theme. Current theme is ${theme}`}
            >
              <span className="text-base">{currentOption.icon}</span>
            </button>
            
            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col animate-slide-in pointer-events-auto">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setShowThemeMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-colors duration-150 ${
                      theme === opt.value
                        ? 'bg-brand-500 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <NotificationCenter />

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors duration-200">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">{user.email}</span>
            </div>
            <div className="flex items-center justify-center w-9 h-9 bg-brand-500 rounded-full text-white font-bold border border-brand-100/10">
              {(user.firstName || user.username).charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
