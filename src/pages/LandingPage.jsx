import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sun,
  Moon,
  Monitor,
  Receipt,
  Target,
  BarChart3,
  CheckSquare,
  Bell,
  ShieldCheck,
  Wallet,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
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
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  const currentOption = themeOptions.find(opt => opt.value === theme) || themeOptions[2];

  const features = [
    {
      icon: Receipt,
      title: 'Real-time Expense Logging',
      description: 'Quickly record daily transactions, assign categories, and track spending details as they occur.',
    },
    {
      icon: Target,
      title: 'Smart Category Budgets',
      description: 'Set monthly category or global limits. Receive alerts at 80% utilization and warnings when limits are exceeded.',
    },
    {
      icon: BarChart3,
      title: 'Rich Analytics & Charts',
      description: 'Visualize your spending habits with dynamic pie charts, monthly trend bars, and category comparisons.',
    },
    {
      icon: CheckSquare,
      title: 'Interactive Checklist',
      description: 'Manage shopping tasks and budget checklists. Cross off items on the go with real-time status tracking.',
    },
    {
      icon: Bell,
      title: 'Alert & Notifications',
      description: 'Stay updated with critical budget warnings, quiet hours configuration, and real-time security alerts.',
    },
    {
      icon: ShieldCheck,
      title: 'Enterprise-grade Security',
      description: 'Secured with JWT stateless authentication, password hashing, and login rate-limiting for data safety.',
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col font-sans">
      {/* Header / Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/85 transition-colors duration-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-brand-500 dark:text-brand-100 flex-shrink-0" />
          <span className="text-xl font-bold tracking-tight text-brand-500 dark:text-brand-100">BudgetLogger</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Selector */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700/40 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={`Change theme. Current theme is ${theme}`}
            >
              <currentOption.icon className="w-4 h-4 flex-shrink-0" />
            </button>
            
            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-900 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col animate-slide-in pointer-events-auto">
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

          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md transition-all"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/10 hover:shadow-lg transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 max-w-6xl mx-auto px-6 py-20 md:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-xs font-semibold text-brand-600 dark:text-brand-300 mb-8 animate-slide-in">
          <Target className="w-3.5 h-3.5 flex-shrink-0" /> Optimize Your Personal Finances
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 max-w-4xl leading-tight">
          Simplify Your Spending & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-indigo-600 dark:from-brand-300 dark:to-indigo-400">
            Conquer Your Monthly Budgets
          </span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Log expenses in real-time, configure smart category limits with warnings, and analyze trends using beautiful reports. Built with professional enterprise-grade aesthetics.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all text-base w-full sm:w-auto"
            >
              Enter Dashboard <ArrowRight className="w-5 h-5 ml-2 flex-shrink-0" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all text-base w-full sm:w-auto"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all text-base w-full sm:w-auto"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200/80 dark:border-slate-900/60 py-24 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
              Powerful Features to Manage Your Cashflow
            </h2>
            <p className="mt-4 text-sm md:text-base text-slate-500 dark:text-slate-400">
              Everything you need to visualize records, limit targets, and keep your financial health on track.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-500/30 dark:hover:border-brand-500/30 transition-all duration-300 group"
              >
                <div className="mb-4 bg-brand-50 dark:bg-slate-950 w-12 h-12 rounded-xl flex items-center justify-center border border-brand-100/10 text-brand-500 dark:text-brand-300 transition-colors">
                  <feat.icon className="w-6 h-6 flex-shrink-0" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-500 dark:group-hover:text-brand-100 transition-colors">
                  {feat.title}
                </h3>
                <p className="mt-2.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 px-6 py-8 bg-white dark:bg-slate-950 text-center transition-colors duration-300">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} BudgetLogger Finance System. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
