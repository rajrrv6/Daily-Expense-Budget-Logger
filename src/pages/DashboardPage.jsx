import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummary, getRecentExpenses } from '../services/expenseService';
import { getTodos, toggleTodo } from '../services/todoService';
import SkeletonCard from '../components/common/SkeletonCard';
import ErrorRetryState from '../components/common/ErrorRetryState';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, CreditCard, PiggyBank, Award, PieChart, History, CheckSquare } from 'lucide-react';

// Lazy-load CategoryPieChart to optimize bundle size
const CategoryPieChart = React.lazy(() => import('../components/charts/CategoryPieChart'));

const ChartPlaceholder = () => (
  <div className="h-64 w-full flex items-center justify-center bg-slate-950/30 rounded-lg border border-slate-800/60 animate-pulse">
    <span className="text-xs text-slate-500">Loading visual category analysis...</span>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
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
      const [summaryData, recentData] = await Promise.all([
        getDashboardSummary(),
        getRecentExpenses(4),
      ]);
      setSummary(summaryData);
      setRecent(recentData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTodoData = useCallback(async () => {
    setTodoLoading(true);
    try {
      const allTodos = await getTodos();
      // Filter pending in client to verify count correctly and show top 3
      const pending = allTodos.filter(t => !t.completed);
      setTodos(pending);
      setTodoCount(pending.length);
    } catch (err) {
      console.error('Failed to load dashboard todo items.', err);
    } finally {
      setTodoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchTodoData();
  }, [fetchDashboardData, fetchTodoData]);

  // Handle optimistic toggle for checklist widget
  const handleDashboardTodoToggle = useCallback(async (id) => {
    if (togglingIds.has(id)) return; // Prevent repeated double-clicks during active request

    // Mark as toggling in local state
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Save previous state for rollback
    const originalTodos = [...todos];
    const targetTodo = todos.find(t => t.id === id);
    if (!targetTodo) return;

    // Optimistically toggle completion status in local state (which removes it from pending list)
    setTodos((prev) => prev.filter(t => t.id !== id));
    setTodoCount((prev) => Math.max(0, prev - 1));

    try {
      await toggleTodo(id);
      showNotification('Task completed successfully!', 'success');
    } catch (err) {
      // Rollback to original state on request failure
      setTodos(originalTodos);
      setTodoCount(originalTodos.length);
      showNotification(err.response?.data?.message || 'Failed to update todo status. Rolling back.', 'error');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [todos, togglingIds, showNotification]);

  // Format Recharts data (Memoized to prevent inline array/object re-creation)
  const pieData = useMemo(() => {
    return summary?.categoryBreakdown?.map((item) => ({
      name: item.categoryName,
      value: parseFloat(item.totalAmount),
      color: item.color || '#4F46E5',
    })) || [];
  }, [summary?.categoryBreakdown]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return <ErrorRetryState message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner - Premium Theme-Aware Panel */}
      <div className="relative overflow-hidden p-6 md:p-8 bg-gradient-to-r from-brand-50/70 via-indigo-50/30 to-white dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-brand-100/50 dark:border-slate-800/80 rounded-2xl shadow-sm transition-all duration-300">
        {/* Abstract Background Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              Hello, {user?.firstName || user?.username}! <span className="animate-wiggle">👋</span>
            </h3>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-350 mt-2 font-medium max-w-2xl leading-relaxed">
              Here is your financial overview for this month. All indicators are up-to-date and mapped to your system budgeting constraints.
            </p>
          </div>
          <div className="hidden md:flex items-center justify-center w-14 h-14 bg-brand-50 dark:bg-white/10 backdrop-blur-md rounded-2xl border border-brand-100/30 dark:border-white/10 shadow-sm flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-brand-500 dark:text-brand-100" />
          </div>
        </div>
      </div>

      {/* Grid Summary Cards - Premium Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Spent Card */}
        <div className="relative overflow-hidden p-6 bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Total Spent ({new Date().toLocaleDateString('en-US', { month: 'long' })})
              </span>
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            
            <h4 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mt-3">
              ₹{summary?.totalExpensesMonth?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </h4>
          </div>

          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                  summary?.budgetUtilizationPercent >= 100
                    ? 'from-red-500 to-rose-600'
                    : summary?.budgetUtilizationPercent >= 80
                    ? 'from-amber-400 to-orange-500'
                    : 'from-brand-500 to-indigo-500'
                }`}
                style={{ width: `${Math.min(summary?.budgetUtilizationPercent || 0, 100)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {summary?.budgetUtilizationPercent?.toFixed(1) || '0.0'}% of limit utilized
              </span>
              {summary?.budgetUtilizationPercent >= 100 && (
                <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full animate-pulse border border-red-200 dark:border-red-900/30">
                  Over Budget
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Budget Cap */}
        <div className="relative overflow-hidden p-6 bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Monthly Budget Cap
              </span>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-500 dark:text-blue-400 rounded-xl">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>
            
            <h4 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mt-3">
              ₹{summary?.budgetLimit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </h4>
          </div>
          
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-4 leading-relaxed font-medium">
            Allocated baseline spending cap to align with monthly savings target matrices.
          </p>
        </div>

        {/* Highest Spending Sector */}
        <div className="relative overflow-hidden p-6 bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Highest Spending Sector
              </span>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <h4 className="text-3xl font-extrabold text-brand-500 dark:text-brand-100 tracking-tight mt-3 truncate">
              {summary?.highestSpendingCategory || 'N/A'}
            </h4>
          </div>

          <p className="text-xs text-slate-555 dark:text-slate-400 mt-4 leading-relaxed font-medium">
            This category is responsible for your highest relative debit profiles this month.
          </p>
        </div>
      </div>

      {/* Grid Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown chart */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.012)] dark:shadow-none flex flex-col transition-colors duration-200 h-[350px]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-500" />
              Category Breakdown
            </h4>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
            {pieData.length === 0 ? (
              <div className="text-slate-400 dark:text-slate-500 text-sm">
                No transactions recorded for this month.
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center select-none">
                <Suspense fallback={<ChartPlaceholder />}>
                  <CategoryPieChart data={pieData} />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.012)] dark:shadow-none flex flex-col transition-colors duration-200 h-[350px]">
          <div className="flex justify-between items-center mb-3 flex-shrink-0">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <History className="w-5 h-5 text-brand-500 dark:text-brand-100" />
              Recent Transactions
            </h4>
            <button
              onClick={() => navigate('/expenses')}
              className="text-xs font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg hover:shadow-sm transition-all"
              aria-label="Navigate to full expense ledger"
            >
              View Ledger
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between min-h-0">
            {recent.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm py-12 text-center">
                No expense transactions found.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center divide-y divide-slate-100/60 dark:divide-slate-800/40 space-y-1 overflow-hidden">
                {recent.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 rounded-xl transition-all duration-150">
                    <div className="flex-1 min-w-0 pr-4 flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.category.color || '#4F46E5' }}
                      ></div>
                      <div className="min-w-0">
                        <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.name}
                        </h5>
                        <span className="text-[10px] text-slate-400 dark:text-slate-550 font-semibold uppercase tracking-wider">
                          {item.category.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        -₹{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        {new Date(item.transactionDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shopping Checklist Widget */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.012)] dark:shadow-none flex flex-col transition-colors duration-200 h-[350px]">
          <div className="flex justify-between items-center mb-3 flex-shrink-0">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-violet-500" />
              Shopping Checklist
            </h4>
            <button
              onClick={() => navigate('/todos')}
              className="text-xs font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg hover:shadow-sm transition-all"
              aria-label="Navigate to full checklist manager"
            >
              Manage All
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between min-h-0">
            {todoLoading ? (
              <div className="space-y-3 py-6 flex-grow">
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              </div>
            ) : todos.length === 0 ? (
              <div className="flex-grow flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm py-12 text-center">
                No pending items on checklist.
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-between overflow-hidden">
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    You have <span className="text-brand-500 dark:text-brand-100 font-bold">{todoCount}</span> pending checklist items:
                  </p>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/40 space-y-1">
                    {todos.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 px-2 hover:bg-slate-50/40 dark:hover:bg-slate-950/20 rounded-xl transition-all duration-150">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled={togglingIds.has(item.id)}
                            onChange={() => handleDashboardTodoToggle(item.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer disabled:opacity-50 flex-shrink-0"
                            aria-label={`Mark checklist item ${item.name} as completed`}
                          />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {item.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

