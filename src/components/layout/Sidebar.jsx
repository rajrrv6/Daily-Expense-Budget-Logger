import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Wallet
} from 'lucide-react';

export default function Sidebar() {
  const { logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Expenses', path: '/expenses', icon: CreditCard },
    { name: 'Checklist', path: '/todos', icon: CheckSquare },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Budgets', path: '/budgets', icon: Target },
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
    <aside className="flex flex-col w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200 dark:border-slate-800">
        <Wallet className="w-6 h-6 text-brand-500 dark:text-brand-100 flex-shrink-0" />
        <h1 className="text-xl font-bold tracking-tight text-brand-500 dark:text-brand-100">BudgetLogger</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Footer Action */}
      <div className="flex items-center h-16 border-t border-slate-200 dark:border-slate-800 px-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 w-full px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
