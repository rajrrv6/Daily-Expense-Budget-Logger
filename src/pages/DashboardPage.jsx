import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummary, getRecentExpenses } from '../services/expenseService';
import { getTodos, toggleTodo } from '../services/todoService';
import SkeletonCard from '../components/common/SkeletonCard';
import ErrorRetryState from '../components/common/ErrorRetryState';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

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
        getRecentExpenses(5),
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
      {/* Welcome Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Hello, {user?.firstName || user?.username}! 👋
        </h3>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
          Here is your financial snapshot for this month.
        </p>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Expenses */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Spent (This Month)
          </span>
          <h4 className="text-3xl font-bold text-slate-850 dark:text-slate-100 mt-2">
            ₹{summary?.totalExpensesMonth?.toFixed(2) || '0.00'}
          </h4>
          <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-1.5 mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary?.budgetUtilizationPercent >= 100
                  ? 'bg-red-500'
                  : summary?.budgetUtilizationPercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-brand-500'
              }`}
              style={{ width: `${Math.min(summary?.budgetUtilizationPercent || 0, 100)}%` }}
            ></div>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {summary?.budgetUtilizationPercent?.toFixed(1) || '0.0'}% of your budget used
          </span>
        </div>

        {/* Budget Limit */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Monthly Budget Cap
          </span>
          <h4 className="text-3xl font-bold text-slate-850 dark:text-slate-100 mt-2">
            ₹{summary?.budgetLimit?.toFixed(2) || '0.00'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            Fixed caps help allocate monthly savings goals.
          </p>
        </div>

        {/* Top Spending Category */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Highest Spending Sector
          </span>
          <h4 className="text-3xl font-bold text-brand-600 dark:text-brand-100 mt-2 truncate">
            {summary?.highestSpendingCategory || 'N/A'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            This sector represents your largest spending driver.
          </p>
        </div>
      </div>

      {/* Grid Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown visual charts */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[350px] flex flex-col justify-between transition-colors duration-200">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Category Breakdown</h4>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-450 text-sm">
              No transactions recorded for this month yet.
            </div>
          ) : (
            <Suspense fallback={<ChartPlaceholder />}>
              <CategoryPieChart data={pieData} />
            </Suspense>
          )}
        </div>

        {/* Recent Transactions List Feed */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[350px] flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Transactions</h4>
              <button
                onClick={() => navigate('/expenses')}
                className="text-xs text-brand-600 dark:text-brand-100 hover:text-brand-500 dark:hover:text-white transition-colors"
                aria-label="Navigate to full expense ledger"
              >
                View All Ledger
              </button>
            </div>

            {recent.length === 0 ? (
              <div className="text-slate-500 dark:text-slate-450 text-sm py-12 text-center">
                No expense transactions found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[250px] overflow-y-auto pr-1">
                {recent.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div>
                      <h5 className="text-sm font-medium text-slate-850 dark:text-slate-200">{item.name}</h5>
                      <span
                        className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full text-white/90 mt-1"
                        style={{ backgroundColor: item.category.color || '#4F46E5' }}
                      >
                        {item.category.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        -₹{item.amount.toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1">
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

        {/* Productivity Checklist Widget */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[350px] flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Shopping Checklist</h4>
              <button
                onClick={() => navigate('/todos')}
                className="text-xs text-brand-600 dark:text-brand-100 hover:text-brand-500 dark:hover:text-white transition-colors"
                aria-label="Navigate to full checklist manager"
              >
                Manage All
              </button>
            </div>

            {todoLoading ? (
              <div className="space-y-3 py-6">
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              </div>
            ) : todos.length === 0 ? (
              <div className="text-slate-500 dark:text-slate-450 text-sm py-12 text-center">
                No pending items on checklist.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You have <span className="text-brand-600 dark:text-brand-100 font-semibold">{todoCount}</span> pending checklist items:
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {todos.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={togglingIds.has(item.id)}
                          onChange={() => handleDashboardTodoToggle(item.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer disabled:opacity-50"
                          aria-label={`Mark checklist item ${item.name} as completed`}
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">
                          {item.name}
                        </span>
                      </div>
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
