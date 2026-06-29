import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationCenter from './NotificationCenter';
import { Sun, Moon, Monitor, Settings, LogOut, Search, ChevronRight, Home, Shield } from 'lucide-react';

export default function TopHeader({ onSearch }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const themeMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setShowThemeMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener to focus search when '/' is pressed
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === '/' && document.activeElement !== searchInputRef.current) {
        const tagName = document.activeElement?.tagName;
        if (tagName !== 'INPUT' && tagName !== 'TEXTAREA' && !document.activeElement?.isContentEditable) {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/login');
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  const currentOption = themeOptions.find(opt => opt.value === theme) || themeOptions[2];

  // Helper to generate breadcrumbs details based on route path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.startsWith('/admin/')) {
      const sub = path.replace('/admin/', '');
      const subName = sub === 'users' ? 'User Management' : 'Audit Logs';
      return [
        { label: 'Admin', icon: Shield, path: '#' },
        { label: subName, path }
      ];
    }

    let label = 'Dashboard';
    switch (path) {
      case '/expenses':
        label = 'Expenses';
        break;
      case '/budgets':
        label = 'Budgets';
        break;
      case '/categories':
        label = 'Categories';
        break;
      case '/todos':
        label = 'Checklist';
        break;
      case '/analytics':
        label = 'Analytics';
        break;
      case '/settings':
        label = 'Settings';
        break;
      default:
        label = 'Dashboard';
    }

    return [
      { label: 'Home', icon: Home, path: '/dashboard' },
      { label, path }
    ];
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim() && onSearch) {
        onSearch(searchQuery.trim());
      }
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex items-center justify-between h-16 px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 flex-shrink-0">
      {/* Contextual Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.label}>
            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-350 dark:text-slate-655" />}
            <Link
              to={crumb.path}
              className={`flex items-center gap-1.5 hover:text-brand-500 dark:hover:text-white transition-colors duration-150 ${
                idx === breadcrumbs.length - 1 ? 'text-slate-850 dark:text-slate-100 font-bold' : ''
              }`}
            >
              {crumb.icon && <crumb.icon className="w-3.5 h-3.5 flex-shrink-0" />}
              <span>{crumb.label}</span>
            </Link>
          </React.Fragment>
        ))}
      </nav>

      {user && (
        <div className="flex items-center gap-6">
          {/* Global Mock Search input */}
          <div className="relative max-w-xs hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search data... (Press '/')"
              className="block w-64 pl-9 pr-8 py-2 text-xs bg-slate-100 hover:bg-slate-200/50 focus:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:focus:bg-slate-950 border border-transparent focus:border-brand-500 rounded-xl focus:outline-none transition-all duration-200 text-slate-800 dark:text-slate-100 font-medium"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
              <kbd className="text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-1.5 py-0.5 rounded-lg select-none">
                /
              </kbd>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl border border-slate-200 dark:border-slate-700/40 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={`Change theme. Current theme is ${theme}`}
            >
              <currentOption.icon className="w-4 h-4 flex-shrink-0" />
            </button>
            
            {showThemeMenu && (
              <div className="absolute right-0 mt-2.5 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col animate-slide-in pointer-events-auto">
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
                    <opt.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification bell */}
          <NotificationCenter />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 p-1 rounded-xl transition-all outline-none focus:ring-2 focus:ring-brand-500 text-left"
              aria-label="User profile menu"
              aria-expanded={showProfileMenu}
            >
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors duration-200">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-550 transition-colors duration-200 font-semibold">{user.email}</span>
              </div>
              {user.profilePicturePath ? (
                <img
                  src={`/api/v1/users/profile-picture/${user.profilePicturePath}`}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full object-cover border border-brand-100/20 shadow-sm"
                />
              ) : (
                <div className="flex items-center justify-center w-9 h-9 bg-brand-500 rounded-full text-white font-bold border border-brand-100/10 text-xs shadow-md">
                  {(user.firstName || user.username).charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col animate-slide-in pointer-events-auto">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowProfileMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Profile Settings</span>
                </button>
                
                {/* Mock Preferences Action */}
                <button
                  onClick={() => {
                    navigate('/settings?tab=preferences');
                    setShowProfileMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span>Preferences</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border-t border-slate-100 dark:border-slate-800/60 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-red-500 dark:text-red-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
