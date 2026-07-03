import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummary, getRecentExpenses, getMonthlyTrends, uploadReceipt } from '../services/expenseService';
import { getTodos, completeTodo } from '../services/todoService';
import { getCategories } from '../services/categoryService';
import Modal from '../components/common/Modal';
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

  // Checklist Completion Modal State
  const [completeItem, setCompleteItem] = useState(null);
  const [completePrice, setCompletePrice] = useState('');
  const [completeCategoryId, setCompleteCategoryId] = useState('');
  const [completeReceiptPath, setCompleteReceiptPath] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [completeDropdownOpen, setCompleteDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  const completeCategoryName = completeCategoryId
    ? categories.find(c => c.id.toString() === completeCategoryId.toString())?.name || 'Select Category'
    : 'Select Category';

  const fetchDashboardData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
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
      if (showSkeleton) setLoading(false);
    }
  }, []);

  const fetchTodoData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setTodoLoading(true);
    try {
      const allTodos = await getTodos();
      const pending = allTodos.filter(t => !t.completed);
      setTodos(pending);
      setTodoCount(pending.length);
    } catch (err) {
      console.error('Failed to load dashboard checklist items.', err);
    } finally {
      if (showSkeleton) setTodoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchTodoData();
    getCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to load categories', err));
  }, [fetchDashboardData, fetchTodoData]);

  // Handle checklist completion modal triggers
  const handleCheckboxClick = (item) => {
    if (item.completed) return;
    setCompleteItem(item);
    setCompletePrice(item.price ? item.price.toString() : '');
    setCompleteCategoryId(item.categoryId ? item.categoryId.toString() : '');
    setCompleteReceiptPath('');
    setReceiptError('');
    setCompleteDropdownOpen(false);
  };

  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    if (!completePrice || parseFloat(completePrice) <= 0) {
      showNotification('Please enter a valid final purchase price.', 'error');
      return;
    }
    if (!completeCategoryId) {
      showNotification('Please select a category for logging the expense.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await completeTodo(completeItem.id, {
        price: parseFloat(completePrice),
        categoryId: parseInt(completeCategoryId),
        receiptPath: completeReceiptPath || null
      });

      showNotification('Checklist item marked as completed and expense logged.', 'success');
      setCompleteItem(null);
      setCompleteDropdownOpen(false);

      // Refresh everything silently
      fetchDashboardData(false);
      fetchTodoData(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to complete checklist item.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setReceiptError('File size exceeds the 5MB limit.');
      return;
    }

    const allowedExtensions = ['pdf', 'jpg', 'jpeg'];
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setReceiptError('Only PDF, JPG, and JPEG file types are allowed.');
      return;
    }

    setReceiptError('');
    setUploadingReceipt(true);
    try {
      const response = await uploadReceipt(file);
      setCompleteReceiptPath(response.fileName);
      showNotification('Receipt uploaded successfully!', 'success');
    } catch (err) {
      setReceiptError(err.response?.data?.message || 'Failed to upload receipt.');
      showNotification('Receipt upload failed.', 'error');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleRemoveReceipt = () => {
    setCompleteReceiptPath('');
    setReceiptError('');
    const fileInput = document.getElementById('complete-receipt-file');
    if (fileInput) fileInput.value = '';
  };

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
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-tr from-brand-500/10 to-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Overview Dashboard
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 select-none relative pl-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping absolute left-2.5"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute left-2.5"></span>
              Active Session
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
            Welcome back, {user?.firstName || user?.username}. Here is your department financial dashboard.
          </p>
        </div>

        {/* Header CTA action alignment */}
        <div className="flex gap-2.5 self-start md:self-auto flex-shrink-0 z-10">
          <button
            onClick={() => navigate('/budgets')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-755 hover:shadow-sm"
          >
            Configure Budgets
          </button>
          <button
            onClick={() => navigate('/expenses', { state: { openAddForm: true } })}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-500/15 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Row 1 Grid: Four KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* KPI Card 1: Total Spent MTD */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[144px] hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Total Spent (MTD)
              </span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{summary?.totalExpensesMonth?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </h4>
            </div>
            <div className="p-2 bg-rose-50 dark:bg-rose-955/20 text-rose-500 rounded-xl border border-rose-100/10">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-900">
            {/* Trend Indicator */}
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-955/30 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +5.2% MTD
            </span>
            {/* Sparkline Visual */}
            <svg className="w-20 h-7 text-rose-500 overflow-visible" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5">
              <defs>
                <filter id="sparkline-rose" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path d="M0,25 L15,20 L30,22 L45,15 L60,18 L75,10 L90,5" strokeLinecap="round" strokeLinejoin="round" filter="url(#sparkline-rose)" />
            </svg>
          </div>
        </div>

        {/* KPI Card 2: Remaining Budget */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[144px] hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Remaining Budget
              </span>
              <h4 className={`text-2xl font-black tracking-tight ${remainingBudget < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'
                }`}>
                ₹{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
            <div className={`p-2 rounded-xl border ${remainingBudget < 0
                ? 'bg-red-50 dark:bg-red-955/20 text-red-600 border-red-100/10'
                : 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-500 border-emerald-100/10'
              }`}>
              <PiggyBank className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-900">
            {/* Trend Indicator */}
            {remainingBudget < 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-955/30 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> Exceeded
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="w-3 h-3" /> Safe Limit
              </span>
            )}
            {/* Sparkline Visual */}
            <svg className="w-20 h-7 text-emerald-500 overflow-visible" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5">
              <defs>
                <filter id="sparkline-emerald" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" />
                  <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path d="M0,5 L20,8 L40,6 L60,18 L80,12 L100,20" strokeLinecap="round" strokeLinejoin="round" filter="url(#sparkline-emerald)" />
            </svg>
          </div>
        </div>

        {/* KPI Card 3: Monthly Budget Cap */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[144px] hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Monthly Cap Limit
              </span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{summary?.budgetLimit?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </h4>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-955/20 text-brand-500 rounded-xl border border-brand-100/10">
              <Target className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-900">
            {/* Trend Indicator */}
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full select-none">
              0.0% change
            </span>
            {/* Sparkline Visual */}
            <svg className="w-20 h-7 text-indigo-400 overflow-visible" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5">
              <defs>
                <filter id="sparkline-indigo" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" />
                  <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path d="M0,15 L25,15 L50,15 L75,15 L100,15" strokeLinecap="round" strokeLinejoin="round" filter="url(#sparkline-indigo)" />
            </svg>
          </div>
        </div>

        {/* KPI Card 4: Open Action Items */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[144px] hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Pending checklist
              </span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {todoCount} Task{todoCount !== 1 && 's'}
              </h4>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-955/20 text-purple-650 rounded-xl border border-purple-100/10">
              <CheckSquare className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-900">
            {/* Trend Indicator */}
            {todoCount > 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-955/30 px-2 py-0.5 rounded-full">
                Action Req.
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30 px-2 py-0.5 rounded-full">
                Completed
              </span>
            )}
            {/* Sparkline Visual */}
            <svg className="w-20 h-7 text-purple-400 overflow-visible" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5">
              <defs>
                <filter id="sparkline-purple" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" />
                  <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path d="M0,5 L15,10 L30,5 L45,18 L60,10 L75,22 L100,8" strokeLinecap="round" strokeLinejoin="round" filter="url(#sparkline-purple)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Row 2 Grid: composed chart (7/12 width) & Donut chart (5/12 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Composed Chart: 7/12 width */}
        <div className="lg:col-span-7 p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between h-[320px]">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-brand-500" />
              Monthly Spend Trend &amp; thresholds
            </h4>
            <button
              onClick={() => navigate('/analytics')}
              className="text-[10px] font-extrabold text-slate-500 hover:text-brand-500 dark:hover:text-white transition-all flex items-center gap-0.5 border border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900 px-2 py-1 rounded-lg shadow-sm"
            >
              Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {/* Safety check to ensure data prop is not undefined or empty before rendering */}
            {!trendData || trendData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] border border-dashed border-slate-200/60 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 text-xs font-semibold">
                No monthly spend data available.
              </div>
            ) : (
              <ComposedTrendChart data={trendData} />
            )}
          </div>
        </div>

        {/* Donut Chart: 5/12 width */}
        <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between h-[320px]">
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
              className="text-[10px] font-bold text-brand-500 dark:text-brand-100 hover:text-brand-600 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 px-2 py-1 rounded-lg transition-all"
            >
              Ledger Account
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900 custom-scrollbar pr-1.5 space-y-1">
            {recentExpenses.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs py-10">
                No transaction logs recorded.
              </div>
            ) : (
              recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-xl transition-all hover:translate-x-1 border-l-2"
                  style={{ borderLeftColor: exp.category.color }}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {/* Circular icon wrapper with soft background tint */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border"
                      style={{
                        backgroundColor: `${exp.category.color}15`,
                        color: exp.category.color,
                        borderColor: `${exp.category.color}25`
                      }}
                    >
                      {exp.category.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{exp.name}</h5>
                      <span
                        className="text-[8px] font-extrabold uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded-full inline-block border"
                        style={{
                          backgroundColor: `${exp.category.color}08`,
                          color: exp.category.color,
                          borderColor: `${exp.category.color}20`
                        }}
                      >
                        {exp.category.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      -₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
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
              className="text-[10px] font-bold text-brand-500 dark:text-brand-100 hover:text-brand-600 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 px-2 py-1 rounded-lg transition-all"
            >
              Tasks Matrix
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between min-h-0">
            {todoLoading ? (
              <div className="space-y-3 py-2 flex-1">
                <div className="h-6 bg-slate-100 dark:bg-slate-900 rounded animate-pulse"></div>
                <div className="h-6 bg-slate-100 dark:bg-slate-900 rounded animate-pulse"></div>
              </div>
            ) : todos.length === 0 ? (
              <div className="flex-grow flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 h-full">
                All action items completed.
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-between overflow-hidden">
                <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {todos.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-500/20 dark:hover:border-brand-500/20 hover:shadow-sm hover:shadow-brand-500/5 hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={submitting}
                          onChange={() => handleCheckboxClick(item)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-750 bg-white dark:bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer disabled:opacity-50 flex-shrink-0"
                          aria-label={`Toggle task ${item.name}`}
                        />

                        {/* Dot indicator representing category color */}
                        {item.categoryColor && (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.categoryColor }}
                            title={item.categoryName}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">
                            {item.name}
                          </span>
                          {item.price && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-455 font-extrabold block mt-0.5">
                              ₹{parseFloat(item.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pill-shaped status badge */}
                      <span className="px-2.5 py-0.5 text-[8px] font-extrabold rounded-full bg-rose-50/70 text-rose-600 dark:bg-rose-955/20 dark:text-rose-400 border border-rose-200/20 flex-shrink-0">
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

      {/* Completion Dialog Popup Modal */}
      {completeItem && (
        <Modal
          isOpen={true}
          onClose={() => setCompleteItem(null)}
          title="Complete Checklist Purchase"
        >
          <form onSubmit={handleConfirmComplete} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You are marking <strong className="text-slate-800 dark:text-slate-200">&quot;{completeItem.name}&quot;</strong> as completed. This will log the purchase as an expense.
            </p>

            {/* Purchase Price */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Final Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={completePrice}
                  onChange={(e) => setCompletePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Category selection */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCompleteDropdownOpen(!completeDropdownOpen)}
                  className="w-full pl-3 pr-10 py-2.5 text-left text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{completeCategoryName}</span>
                  <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {completeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCompleteDropdownOpen(false)} />
                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1">
                      <div
                        onClick={() => {
                          setCompleteCategoryId('');
                          setCompleteDropdownOpen(false);
                        }}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${!completeCategoryId ? 'bg-slate-100/50 dark:bg-slate-900 font-semibold' : ''
                          }`}
                      >
                        Select Category
                      </div>
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          onClick={() => {
                            setCompleteCategoryId(cat.id.toString());
                            setCompleteDropdownOpen(false);
                          }}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${completeCategoryId?.toString() === cat.id.toString() ? 'bg-slate-100/50 dark:bg-slate-900 font-semibold' : ''
                            }`}
                        >
                          {cat.name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Receipt Upload (optional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Attach Receipt (Optional)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="complete-receipt-file"
                  accept=".pdf,.jpg,.jpeg"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
                <label
                  htmlFor="complete-receipt-file"
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 cursor-pointer rounded-lg transition-colors inline-block"
                >
                  {uploadingReceipt ? 'Uploading...' : 'Choose File'}
                </label>
                <span className="text-xs text-slate-400 dark:text-slate-500">Supports PDF, JPG, JPEG (Max 5MB)</span>
              </div>

              {receiptError && <p className="text-xs text-red-500 mt-1">{receiptError}</p>}

              {completeReceiptPath && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg mt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-355 truncate">
                    <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">{completeReceiptPath}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold p-1"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setCompleteItem(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingReceipt}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Completing...' : 'Confirm'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
