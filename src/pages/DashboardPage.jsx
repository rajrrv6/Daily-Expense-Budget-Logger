import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummary, getRecentExpenses, getMonthlyTrends } from '../services/expenseService';
import { getTodos, toggleTodo } from '../services/todoService';
import ErrorRetryState from '../components/common/ErrorRetryState';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  CreditCard, 
  PiggyBank, 
  PieChart, 
  History, 
  CheckSquare, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Target
} from 'lucide-react';
import ComposedTrendChart from '../components/charts/ComposedTrendChart';

// Lazy-load CategoryPieChart to optimize bundle size
const CategoryPieChart = React.lazy(() => import('../components/charts/CategoryPieChart'));

const ChartPlaceholder = () => (
  <div className="h-64 w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse">
    <span className="text-xs text-slate-500">Loading chart analytics...</span>
  </div>
);

const getFullMonthName = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIdx] || dateStr;
};

// High-fidelity Dashboard Skeleton matching the final design layout exactly to prevent layout shifts
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse select-none">
    {/* Page Header Skeleton */}
    <div className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>

    {/* Row 1 Skeletons: Four KPI cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-36 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
        </div>
      ))}
    </div>

    {/* Row 2 Skeletons: Wide Trend and Donut */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-[360px]">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-6"></div>
        <div className="h-56 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-[360px]">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-6"></div>
        <div className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-full w-48 mx-auto"></div>
      </div>
    </div>

    {/* Row 3 Skeletons: Recent Transactions and Reminders */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-[380px]">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="flex justify-between items-center">
              <div className="flex gap-3 items-center w-1/3">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/6"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/12"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-[380px]">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(k => (
            <div key={k} className="flex gap-3 items-center">
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [todos, setTodos] = useState([]);
  const [todoCount, setTodoCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [todoLoading, setTodoLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingIds, setTogglingIds] = useState(new Set());

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, recentData, trendResponse] = await Promise.all([
        getDashboardSummary(),
        getRecentExpenses(5),
        getMonthlyTrends(),
      ]);

      // Direct console logs for backend response validation
      console.log('--- VERIFICATION START ---');
      console.log('1. Raw monthly trend API response:', trendResponse);
      console.log('2. Summary API response:', summaryData);

      setSummary(summaryData);
      setRecentExpenses(recentData);
      
      // Map properties to align with exact keys used in ComposedTrendChart
      const mappedTrends = (trendResponse || []).map((item) => ({
        month: getFullMonthName(item.month),
        totalSpend: parseFloat(item.totalAmount || 0),
        budgetLimit: parseFloat(item.budgetLimit || 0),
      }));

      console.log('3. Formatted trendData passed to chart:', mappedTrends);
      console.log('--- VERIFICATION END ---');

      setTrendData(mappedTrends);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTodoData = useCallback(async () => {
    setTodoLoading(true);
    try {
      const allTodos = await getTodos();
      const pending = allTodos.filter(t => !t.completed);
      setTodos(pending);
      setTodoCount(pending.length);
    } catch (err) {
      console.error('Failed to load dashboard checklist items.', err);
    } finally {
      setTodoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchTodoData();
  }, [fetchDashboardData, fetchTodoData]);

  // Handle checklist toggles
  const handleDashboardTodoToggle = useCallback(async (id) => {
    if (togglingIds.has(id)) return;

    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const originalTodos = [...todos];
    const targetTodo = todos.find(t => t.id === id);
    if (!targetTodo) return;

    setTodos((prev) => prev.filter(t => t.id !== id));
    setTodoCount((prev) => Math.max(0, prev - 1));

    try {
      await toggleTodo(id);
      showNotification('Task marked as completed!', 'success');
      getDashboardSummary().then(data => setSummary(data));
    } catch (err) {
      setTodos(originalTodos);
      setTodoCount(originalTodos.length);
      showNotification(err.response?.data?.message || 'Failed to update task.', 'error');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [todos, togglingIds, showNotification]);

  const pieData = useMemo(() => {
    return summary?.categoryBreakdown?.map((item) => ({
      name: item.categoryName,
      value: parseFloat(item.totalAmount),
      color: item.color || '#4F46E5',
    })) || [];
  }, [summary?.categoryBreakdown]);

  const remainingBudget = useMemo(() => {
    return (summary?.budgetLimit || 0) - (summary?.totalExpensesMonth || 0);
  }, [summary]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorRetryState message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="space-y-6 bg-slate-50/50 dark:bg-slate-950/20">
      
      {/* Page Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div>
          <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-2">
            Overview Dashboard <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 select-none">Active Session</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 font-medium leading-relaxed">
            Welcome back, {user?.firstName || user?.username}. Here is your financial overview.
          </p>
        </div>
        
        {/* Header CTA action alignment */}
        <div className="flex gap-2.5 self-start md:self-auto flex-shrink-0 z-10">
          <button
            onClick={() => navigate('/budgets')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-755"
          >
            Configure Budgets
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-500/15"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Row 1 Grid: Four KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI Card 1: Total Spent MTD */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[144px] hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Total Spent (MTD)
              </span>
              <h4 className="text-2xl font-black text-slate-850 dark:text-white tracking-tight">
                ₹{summary?.totalExpensesMonth?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </h4>
            </div>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl border border-rose-100/10">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-855">
            {/* Trend Indicator */}
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +5.2% MTD
            </span>
            {/* Sparkline Visual */}
            <svg className="w-20 h-7 text-rose-500" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0,25 L15,20 L30,22 L45,15 L60,18 L75,10 L90,5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* KPI Card 2: Remaining Budget */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[144px] hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Remaining Budget
              </span>
              <h4 className={`text-2xl font-black tracking-tight ${
                remainingBudget < 0 ? 'text-red-500' : 'text-slate-850 dark:text-white'
              }`}>
                ₹{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
            <div className={`p-2 rounded-xl border ${
              remainingBudget < 0
                ? 'bg-red-50 dark:bg-red-950/20 text-red-550 border-red-100/10'
                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border-emerald-100/10'
            }`}>
              <PiggyBank className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-855">
            {/* Trend Indicator */}
            {remainingBudget < 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-550 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> Exceeded
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="w-3 h-3" /> Safe Limit
              </span>
            )}
            {/* Sparkline Visual */}
            <svg className={`w-20 h-7 ${remainingBudget < 0 ? 'text-rose-500' : 'text-emerald-500'}`} viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0,5 L20,8 L40,6 L60,18 L80,12 L100,20" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* KPI Card 3: Monthly Budget Cap */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[144px] hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Monthly Cap Limit
              </span>
              <h4 className="text-2xl font-black text-slate-850 dark:text-white tracking-tight">
                ₹{summary?.budgetLimit?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </h4>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-brand-500 rounded-xl border border-brand-100/10">
              <Target className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-855">
            {/* Trend Indicator */}
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded-full select-none">
              0.0% change
            </span>
            {/* Sparkline Visual */}
            <svg className="w-20 h-7 text-indigo-400" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0,15 L25,15 L50,15 L75,15 L100,15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* KPI Card 4: Open Action Items */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[144px] hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Pending checklist
              </span>
              <h4 className="text-2xl font-black text-slate-850 dark:text-white tracking-tight">
                {todoCount} Task{todoCount !== 1 && 's'}
              </h4>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/20 text-purple-650 rounded-xl border border-purple-100/10">
              <CheckSquare className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-855">
            {/* Trend Indicator */}
            {todoCount > 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                Action Req.
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                Completed
              </span>
            )}
            {/* Sparkline Visual */}
            <svg className="w-20 h-7 text-purple-400" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0,5 L15,10 L30,5 L45,18 L60,10 L75,22 L100,8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Row 2 Grid: wide composed chart (2/3 width) & Donut chart (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Composed Chart: 2/3 width */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between h-[360px]">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-brand-500" />
              Monthly Spend Trend &amp; thresholds
            </h4>
            <button
              onClick={() => navigate('/analytics')}
              className="text-[10px] font-extrabold text-slate-500 hover:text-brand-500 dark:hover:text-white transition-colors flex items-center gap-0.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-2 py-1 rounded-lg"
            >
              Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {/* Safety check to ensure data prop is not undefined or empty before rendering */}
            {!trendData || trendData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 text-xs font-semibold">
                No monthly spend data available.
              </div>
            ) : (
              <ComposedTrendChart data={trendData} />
            )}
          </div>
        </div>

        {/* Donut Chart: 1/3 width */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between h-[360px]">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4.5 h-4.5 text-indigo-500" />
              Category Breakdown
            </h4>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-slate-400 dark:text-slate-500 text-xs">
                No transactions recorded.
              </div>
            ) : (
              <Suspense fallback={<ChartPlaceholder />}>
                <CategoryPieChart data={pieData} />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* Row 3 Grid: Recent Transactions list (2/3 width) & Checklist widget (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions list (2/3 width) */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[380px] justify-between">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-brand-500" /> Recent transactions log
            </h4>
            <button
              onClick={() => navigate('/expenses')}
              className="text-[10px] font-bold text-brand-500 dark:text-brand-100 hover:text-brand-600 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-2 py-1 rounded-lg transition-all"
            >
              Ledger Account
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 custom-scrollbar pr-1.5 space-y-1">
            {recentExpenses.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs py-10">
                No transaction logs recorded.
              </div>
            ) : (
              recentExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-2 px-2 hover:bg-slate-50/50 dark:hover:bg-slate-955/20 rounded-xl transition-all">
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {/* Circular icon wrapper with soft background tint */}
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border border-transparent"
                      style={{ 
                        backgroundColor: `${exp.category.color}15`, 
                        color: exp.category.color 
                      }}
                    >
                      {exp.category.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200 truncate">{exp.name}</h5>
                      <span className="text-[8px] font-extrabold uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded-full inline-block bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {exp.category.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      -₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                      {new Date(exp.transactionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Checklist widget (1/3 width) */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[380px] justify-between">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4.5 h-4.5 text-brand-500" />
              Checklist Tasks
            </h4>
            <button
              onClick={() => navigate('/todos')}
              className="text-[10px] font-bold text-brand-500 dark:text-brand-100 hover:text-brand-600 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-2 py-1 rounded-lg transition-all"
            >
              Tasks Matrix
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between min-h-0">
            {todoLoading ? (
              <div className="space-y-3 py-2 flex-1">
                <div className="h-6 bg-slate-100 dark:bg-slate-850 rounded animate-pulse"></div>
                <div className="h-6 bg-slate-100 dark:bg-slate-850 rounded animate-pulse"></div>
              </div>
            ) : todos.length === 0 ? (
              <div className="flex-grow flex items-center justify-center text-slate-455 dark:text-slate-500 text-xs py-6 text-center">
                All action items completed.
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-between overflow-hidden">
                <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {todos.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={togglingIds.has(item.id)}
                          onChange={() => handleDashboardTodoToggle(item.id)}
                          className="w-4 h-4 rounded border-slate-350 bg-white dark:bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer disabled:opacity-50 flex-shrink-0"
                          aria-label={`Toggle task ${item.name}`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">
                            {item.name}
                          </span>
                          {item.price && (
                            <span className="text-[9px] text-emerald-650 dark:text-emerald-450 font-bold block mt-0.5">
                              ₹{parseFloat(item.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Pill-shaped color coded priority status badge */}
                      <span className="px-2 py-0.5 text-[8px] font-extrabold rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-250/20 flex-shrink-0">
                        PENDING
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
