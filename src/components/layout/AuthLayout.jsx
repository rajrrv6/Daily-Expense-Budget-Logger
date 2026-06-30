import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Monitor, Wallet, TrendingUp, PiggyBank, ShieldCheck } from 'lucide-react';

export default function AuthLayout() {
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

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors duration-300 font-sans">

      {/* LEFT PANEL: Enterprise Branding & Graphics (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-slate-950 via-slate-900 to-brand-600 relative overflow-hidden flex-col justify-between p-12 text-white border-r border-slate-900 select-none">

        {/* Background Grid Patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35"></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Logo */}
        <Link to="/" className="relative flex items-center gap-3 hover:opacity-90 transition-all duration-200 cursor-pointer">
          <div className="p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">BudgetLogger</span>
        </Link>

        {/* Core Product Summary */}
        <div className="relative space-y-6 my-auto max-w-lg">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-100">
            Enterprise Expense &amp; Budget Optimization.
          </h2>
          <p className="text-base text-slate-300 font-medium leading-relaxed">
            Take full command of department limits, track transaction categories, monitor items with checklists, and view forecasts.
          </p>

          {/* Interactive B2B SaaS Mock Metric Card */}
          <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-brand-100" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-350">SaaS Budget Metric</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> On Track
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Monthly Allocation Utilized</span>
              <div className="flex items-baseline gap-2 mt-1">
                <h4 className="text-2xl font-black">₹48,250.00</h4>
                <span className="text-xs text-slate-400">of ₹150,000.00 cap</span>
              </div>
            </div>
            {/* Progress Meter */}
            <div className="space-y-1">
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-brand-100 rounded-full" style={{ width: '32.1%' }}></div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>32.1% Spent</span>
                <span>Remaining: ₹101,750.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom trust factors */}
        <div className="relative flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <span className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> SOC2 Certified Security
          </span>
          <span>&copy; {new Date().getFullYear()} BudgetLogger Finance.</span>
        </div>
      </div>

      {/* RIGHT PANEL: Authentic Form Interface */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between py-6 px-6 sm:px-12 relative">

        {/* Floating Utilities Header (Theme Toggle, Back links) */}
        <header className="flex justify-between items-center h-12 flex-shrink-0">
          <Link to="/" className="lg:hidden flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Wallet className="w-6 h-6 text-brand-500 dark:text-brand-100 flex-shrink-0" />
            <span className="text-lg font-bold tracking-tight text-brand-500 dark:text-brand-100">BudgetLogger</span>
          </Link>
          <div className="hidden lg:block"></div>

          {/* Theme Selector */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl border border-slate-200 dark:border-slate-800/80 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={`Change theme. Current theme is ${theme}`}
            >
              <currentOption.icon className="w-4 h-4 flex-shrink-0" />
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
                    className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-colors duration-150 ${theme === opt.value
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
        </header>

        {/* Central Form Viewport */}
        <main className="flex-1 flex items-center justify-center py-8">
          <div className="w-full flex justify-center animate-slide-in">
            <Outlet />
          </div>
        </main>

        {/* Footer info (Mobile viewports) */}
        <footer className="text-center py-4 lg:hidden border-t border-slate-100 dark:border-slate-900 mt-4 flex-shrink-0">
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} BudgetLogger Finance. All rights reserved.
          </p>
        </footer>
      </div>

    </div>
  );
}
