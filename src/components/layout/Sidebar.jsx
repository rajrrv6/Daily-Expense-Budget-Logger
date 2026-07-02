import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CreditCard,
  CheckSquare,
  BarChart3,
  Target,
  Settings,
  Users,
  ClipboardList,
  LogOut,
  Wallet,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ isCollapsed, toggleSidebar, isMobileOpen, closeMobileSidebar }) {
  const { logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Expenses', path: '/expenses', icon: CreditCard },
    { name: 'Budgets', path: '/budgets', icon: Target },
    { name: 'Categories', path: '/categories', icon: Tag },
    { name: 'Checklist', path: '/todos', icon: CheckSquare },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'User Management', path: '/admin/users', icon: Users, requiredPermission: 'write:user_management' },
    { name: 'Audit Logs', path: '/admin/logs', icon: ClipboardList, requiredPermission: 'read:system_logs' },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission);
    }
    return true;
  });

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 lg:static flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <Link
          to="/"
          onClick={closeMobileSidebar}
          className={`flex items-center gap-3 hover:opacity-90 transition-all duration-200 cursor-pointer ${isCollapsed ? 'mx-auto' : ''
            }`}
        >
          <Wallet className="w-6 h-6 text-brand-500 dark:text-brand-100 flex-shrink-0 animate-pulse" />
          {!isCollapsed && (
            <h1 className="text-lg font-extrabold tracking-tight text-brand-500 dark:text-brand-100">
              BudgetLogger
            </h1>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={closeMobileSidebar}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${isActive
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-100'
              } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className={isCollapsed ? 'lg:hidden' : ''}>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Controls */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2 flex-shrink-0">
        {/* Collapse Trigger Button */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center gap-4 w-full px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl transition-colors outline-none focus:ring-1 focus:ring-brand-500/30"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 mx-auto flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span>Collapse Menu</span>
            </>
          )}
        </button>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className="flex items-center gap-4 w-full px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all duration-200 outline-none"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
