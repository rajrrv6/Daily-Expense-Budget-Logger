import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationCenter from './NotificationCenter';
import { globalSearch } from '../../services/searchService';
import { Sun, Moon, Monitor, Settings, LogOut, Search, ChevronRight, Home, Shield, X, Menu } from 'lucide-react';

export default function TopHeader({ onSearch, onToggleMobileSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const themeMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setShowThemeMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults(null);
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

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await globalSearch(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const flatResults = useMemo(() => {
    if (!searchResults) return [];
    const list = [];

    (searchResults.expenses || []).forEach(e => {
      list.push({ type: 'expense', id: e.id, name: e.name, subtitle: `Expense • ₹${e.amount.toLocaleString()} in ${e.category?.name || 'Uncategorized'}` });
    });

    (searchResults.categories || []).forEach(c => {
      list.push({ type: 'category', id: c.id, name: c.name, subtitle: `Category • Color ${c.color}` });
    });

    (searchResults.budgets || []).forEach(b => {
      list.push({ type: 'budget', id: b.id, name: `${b.categoryName} Budget`, subtitle: `Budget • Limit ₹${b.monthlyLimit.toLocaleString()}` });
    });

    (searchResults.checklists || []).forEach(t => {
      list.push({ type: 'checklist', id: t.id, name: t.name, subtitle: `Checklist Item • ${t.completed ? 'Completed' : 'Pending'}` });
    });

    return list;
  }, [searchResults]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [flatResults]);

  const handleSelectResult = (item) => {
    clearSearch();
    if (item.type === 'expense') {
      navigate('/expenses', { state: { viewExpenseId: item.id } });
    } else if (item.type === 'category') {
      navigate('/categories', { state: { viewCategoryId: item.id } });
    } else if (item.type === 'budget') {
      navigate('/budgets', { state: { viewBudgetId: item.id } });
    } else if (item.type === 'checklist') {
      navigate('/todos', { state: { viewTodoId: item.id } });
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1 < flatResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < flatResults.length) {
        handleSelectResult(flatResults[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      clearSearch();
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex items-center justify-between h-16 px-4 sm:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 flex-shrink-0">
      <div className="flex items-center">
        {/* Hamburger menu button for mobile/tablet */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700/40 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500 mr-3"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4 flex-shrink-0" />
        </button>

        {/* Contextual Breadcrumbs */}
        <nav className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.label}>
              {idx > 0 && <ChevronRight className={`w-3 h-3 text-slate-300 dark:text-slate-700 ${idx === breadcrumbs.length - 1 ? '' : 'hidden md:block'}`} />}
              <Link
                to={crumb.path}
                className={`flex items-center gap-1.5 hover:text-brand-500 dark:hover:text-white transition-colors duration-150 ${
                  idx === breadcrumbs.length - 1 ? 'text-slate-900 dark:text-slate-100 font-bold' : 'hidden md:flex text-slate-400'
                }`}
              >
                {crumb.icon && <crumb.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                <span>{crumb.label}</span>
              </Link>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {user && (
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Global Mock Search input */}
          <div className="relative max-w-xs hidden md:block" ref={searchContainerRef}>
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
            {searchQuery ? (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-2 pr-1.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                <kbd className="text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-1.5 py-0.5 rounded-lg select-none">
                  /
                </kbd>
              </div>
            )}

            {/* Search Dropdown Results Panel */}
            {searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 max-h-96 overflow-y-auto custom-scrollbar animate-slide-in">
                {isSearching ? (
                  <div className="flex items-center justify-center py-6 text-xs text-slate-400 dark:text-slate-500 font-semibold gap-2 animate-pulse">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></span>
                    Searching database...
                  </div>
                ) : flatResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {flatResults.map((item, idx) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelectResult(item)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left px-3 py-2.5 flex flex-col transition-colors border-l-2 ${highlightedIndex === idx
                            ? 'bg-brand-50/40 dark:bg-brand-950/10 border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                      >
                        <span className="text-xs font-bold truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{item.subtitle}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Selector */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700/40 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={`Change theme. Current theme is ${theme}`}
            >
              <currentOption.icon className="w-4 h-4 flex-shrink-0" />
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2.5 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-900 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col animate-slide-in pointer-events-auto">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setShowThemeMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-colors duration-150 ${theme === opt.value
                        ? 'bg-brand-500 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
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
                <span className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors duration-200 font-semibold">{user.email}</span>
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
              <div className="absolute right-0 mt-2.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-900 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col animate-slide-in pointer-events-auto">
                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Settings</span>
                </Link>

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
