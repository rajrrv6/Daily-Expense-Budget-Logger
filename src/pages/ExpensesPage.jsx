import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useQueryParams from '../hooks/useQueryParams';
import { getExpenses, deleteExpense, exportExpenses, getReceiptFile, getExpenseById } from '../services/expenseService';
import { getCategories } from '../services/categoryService';
import ExpenseFormModal from '../components/expenses/ExpenseFormModal';
import BulkUploadModal from '../components/expenses/BulkUploadModal';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import ErrorRetryState from '../components/common/ErrorRetryState';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import ActionIcons from '../components/common/ActionIcons';
import ViewModal from '../components/common/ViewModal';
import { 
  CreditCard, 
  ArrowUpDown, 
  ChevronDown, 
  Trash2, 
  Download, 
  Plus, 
  Calendar,
  Filter,
  UploadCloud
} from 'lucide-react';

export default function ExpensesPage() {
  const { showNotification } = useNotification();
  const { params, setParam, setPageNumber, resetFilters } = useQueryParams();
  const location = useLocation();

  useEffect(() => {
    const checkIncomingExpense = async () => {
      const targetId = location.state?.viewExpenseId;
      if (targetId) {
        window.history.replaceState({}, document.title);
        try {
          const expense = await getExpenseById(targetId);
          handleViewDetails(expense);
        } catch (err) {
          showNotification('Failed to load search result expense.', 'error');
        }
      }
    };
    checkIncomingExpense();
  }, [location.state?.viewExpenseId, showNotification]);

  // Primary data states
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, isLast: true });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  
  // SlideOver form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // View details modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState(null);



  // Bulk action selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Client-side additional filters state
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);


  // Delete confirmation modals states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch baseline categories initially
  useEffect(() => {
    getCategories().then(setCategories).catch(err => console.error('Failed to load categories', err));
  }, []);

  // Open drawer modal automatically if navigated from Dashboard link
  useEffect(() => {
    if (location.state?.openAddForm) {
      setSelectedExpense(null);
      setIsDrawerOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleStartDateChange = (e) => {
    const val = e.target.value;
    if (val && val > todayStr) {
      showNotification('Start date cannot be in the future', 'warning');
      setParam('startDate', todayStr);
    } else {
      setParam('startDate', val);
    }
  };

  const handleEndDateChange = (e) => {
    const val = e.target.value;
    if (val && val > todayStr) {
      showNotification('End date cannot be in the future', 'warning');
      setParam('endDate', todayStr);
    } else {
      setParam('endDate', val);
    }
  };

  const fetchExpensesList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        sortBy: params.sortBy,
        sortDirection: params.sortDirection,
        ...(params.startDate && { startDate: params.startDate }),
        ...(params.endDate && { endDate: params.endDate }),
      };

      const result = await getExpenses(queryParams);
      setData(result);
      // Reset bulk selection on page navigation
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve expense records.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchExpensesList();
  }, [fetchExpensesList]);

  // Client-side category & amount filters on top of current page content
  const filteredExpenses = useMemo(() => {
    let list = [...data.content];
    
    if (filterCategory) {
      list = list.filter(item => item.category?.id?.toString() === filterCategory.toString());
    }

    if (filterMinAmount) {
      list = list.filter(item => item.amount >= parseFloat(filterMinAmount));
    }

    if (filterMaxAmount) {
      list = list.filter(item => item.amount <= parseFloat(filterMaxAmount));
    }

    return list;
  }, [data.content, filterCategory, filterMinAmount, filterMaxAmount]);

  const handleSortHeader = (field) => {
    if (params.sortBy === field) {
      setParam('sortDirection', params.sortDirection === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setParam('sortBy', field);
      setParam('sortDirection', 'DESC');
    }
  };

  // Bulk Actions
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = new Set(filteredExpenses.map(item => item.id));
      setSelectedIds(ids);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleteConfirmOpen(false);
    setLoading(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => deleteExpense(id)));
      showNotification(`${ids.length} transactions deleted successfully.`, 'success');
      setSelectedIds(new Set());
      fetchExpensesList();
    } catch (err) {
      showNotification('Failed to complete some deletion actions.', 'error');
      fetchExpensesList();
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setIsDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetName('');
    await handleDelete(targetId);
  };

  const handleDelete = async (id) => {
    const previousContent = [...data.content];
    setData((prev) => ({
      ...prev,
      content: prev.content.filter((item) => item.id !== id),
      totalElements: Math.max(0, prev.totalElements - 1),
    }));

    try {
      await deleteExpense(id);
      showNotification('Expense transaction deleted.', 'success');
      fetchExpensesList();
    } catch (err) {
      setData((prev) => ({ ...prev, content: previousContent }));
      showNotification(err.response?.data?.message || 'Failed to delete record. Reverted.', 'error');
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await exportExpenses(params.startDate, params.endDate);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_ledger_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('PDF export completed successfully.', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to export expenses.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleViewReceipt = async (filename) => {
    try {
      const blob = await getReceiptFile(filename);
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
    } catch (err) {
      showNotification('Failed to download receipt file.', 'error');
    }
  };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setIsDrawerOpen(true);
  };

  const handleViewDetails = (expense) => {
    setViewingExpense(expense);
    setIsViewModalOpen(true);
  };

  const viewFields = viewingExpense ? [
    { label: 'Expense Name', value: viewingExpense.name },
    { label: 'Amount', value: `₹${viewingExpense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { label: 'Category', value: viewingExpense.category?.name || 'N/A' },
    { 
      label: 'Transaction Date', 
      value: new Date(viewingExpense.transactionDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) 
    },
    { label: 'Receipt Path', value: viewingExpense.receiptPath || 'No receipt attached' }
  ] : [];

  const viewReceiptContent = viewingExpense && viewingExpense.receiptPath ? (
    <div className="space-y-3">
      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        Attached Receipt
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleViewReceipt(viewingExpense.receiptPath)}
          className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200/20 rounded-xl transition-all"
        >
          View Receipt Document
        </button>
      </div>
    </div>
  ) : null;

  const handleAddNew = () => {
    setSelectedExpense(null);
    setIsDrawerOpen(true);
  };



  return (
    <div className="space-y-6">
      
      {/* Standardized B2B Header area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl transition-all duration-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-500" /> Transaction Ledger
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Monitor, filter, and export transaction audit trails.
          </p>
        </div>
        
        {/* Alignment matches the top-right CTA rules */}
        <div className="flex gap-2.5 self-start md:self-auto flex-wrap">
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl transition-all disabled:opacity-50 border border-slate-200 dark:border-slate-900"
          >
            <Download className="w-4 h-4" /> {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl transition-all border border-slate-200 dark:border-slate-900"
          >
            <UploadCloud className="w-4 h-4" /> Bulk Upload
          </button>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors shadow-lg shadow-brand-500/15"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-brand-500 dark:bg-brand-600 text-white rounded-2xl shadow-lg animate-toast-in select-none">
          <div className="flex items-center gap-3 pl-2">
            <span className="text-xs font-bold uppercase tracking-wider">{selectedIds.size} row{selectedIds.size > 1 && 's'} selected</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3.5 py-1.5 text-xs font-bold hover:bg-white/10 rounded-lg transition-all"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              className="flex items-center gap-1 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-xs font-bold rounded-lg transition-all shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filter Panel */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all duration-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" /> Filter Criteria
          </h4>
          <button
            onClick={() => setShowAdvancedFilters(p => !p)}
            className="text-xs font-bold text-brand-500 dark:text-brand-100 flex items-center gap-1"
          >
            {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-185' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Start Date
            </label>
             <input
              type="date"
              value={params.startDate}
              onChange={handleStartDateChange}
              max={todayStr}
              onClick={(e) => { try { e.target.showPicker(); } catch (err) { console.debug(err); } }}
              className="w-full px-3 py-2 text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              End Date
            </label>
             <input
              type="date"
              value={params.endDate}
              onChange={handleEndDateChange}
              max={todayStr}
              onClick={(e) => { try { e.target.showPicker(); } catch (err) { console.debug(err); } }}
              className="w-full px-3 py-2 text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Category Dropdown (Advanced) */}
          {showAdvancedFilters && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-[size:18px_18px] bg-no-repeat font-bold"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount range (Advanced) */}
          {showAdvancedFilters && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Amount Range (Min - Max)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filterMinAmount}
                  onChange={(e) => setFilterMinAmount(e.target.value)}
                  className="w-1/2 px-2.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filterMaxAmount}
                  onChange={(e) => setFilterMaxAmount(e.target.value)}
                  className="w-1/2 px-2.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {(params.startDate || params.endDate || filterCategory || filterMinAmount || filterMaxAmount) && (
              <button
                onClick={() => {
                  resetFilters();
                  setFilterCategory('');
                  setFilterMinAmount('');
                  setFilterMaxAmount('');
                }}
                className="px-3.5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Content */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorRetryState message={error} onRetry={fetchExpensesList} />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          title="No Transactions Registered"
          description="We couldn't find any transactions fitting your current filters. Setup parameters or add an expense."
          actionText="Record First Expense"
          onAction={handleAddNew}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-150 dark:border-slate-900 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-900 text-left">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      onChange={handleToggleSelectAll}
                      checked={filteredExpenses.length > 0 && selectedIds.size === filteredExpenses.length}
                      className="w-4 h-4 rounded border-slate-300 bg-white dark:bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      aria-label="Select all transactions"
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <button onClick={() => handleSortHeader('name')} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                      Expense Name <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <button onClick={() => handleSortHeader('amount')} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                      Amount <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <button onClick={() => handleSortHeader('transactionDate')} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                      Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Receipt
                  </th>
                  {/* Sticky header right action column */}
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20 sticky right-0 bg-slate-50 dark:bg-slate-950 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_12px_-8px_rgba(255,255,255,0.02)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {filteredExpenses.map((item) => (
                  <tr
                    key={item.id}
                    onDoubleClick={() => handleViewDetails(item)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-955/15 transition-all cursor-pointer select-none"
                  >
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleToggleSelectRow(item.id)}
                        className="w-4 h-4 rounded border-slate-300 bg-white dark:bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer"
                        aria-label={`Select transaction ${item.name}`}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</td>
                    <td className="px-6 py-4 text-xs">
                      <span
                        className="px-2.5 py-1 text-[10px] font-bold rounded-full text-white/90 shadow-sm"
                        style={{ backgroundColor: item.category.color || '#4F46E5' }}
                      >
                        {item.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-slate-100">
                      ₹{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 pt-6">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(item.transactionDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {item.receiptPath ? (
                        <button
                          onClick={() => handleViewReceipt(item.receiptPath)}
                          className="text-emerald-600 dark:text-emerald-450 hover:text-emerald-500 transition-colors inline-flex items-center gap-1 font-bold"
                          title="View Attached Receipt"
                        >
                          View Receipt
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-medium">-</span>
                      )}
                    </td>
                    {/* Sticky right actions column */}
                    <td className="px-6 py-4 text-right sticky right-0 bg-white dark:bg-slate-900 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_12px_-8px_rgba(255,255,255,0.02)]">
                      <ActionIcons
                        onView={() => handleViewDetails(item)}
                        onEdit={() => handleEdit(item)}
                        onDelete={() => {
                          setDeleteTargetId(item.id);
                          setDeleteTargetName(item.name);
                          setIsDeleteConfirmOpen(true);
                        }}
                        viewTitle="View Expense Details"
                        editTitle="Edit Expense"
                        deleteTitle="Delete Expense"
                        ariaLabelView={`View details for expense ${item.name}`}
                        ariaLabelEdit={`Edit expense ${item.name}`}
                        ariaLabelDelete={`Delete expense ${item.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Server-side Pagination Footer */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl transition-colors duration-200 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={params.pageSize}
                onChange={(e) => setParam('pageSize', parseInt(e.target.value))}
                className="pl-2 pr-6 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_4px_center] bg-[size:14px_14px] bg-no-repeat font-bold"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
              <span>
                Showing {params.pageNumber * params.pageSize + 1} to{' '}
                {Math.min((params.pageNumber + 1) * params.pageSize, data.totalElements)} of{' '}
                {data.totalElements} entries
              </span>
            </div>

            <div className="flex gap-2">
              <button
                disabled={params.pageNumber === 0}
                onClick={() => setPageNumber(params.pageNumber - 1)}
                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={data.isLast ?? data.last ?? (params.pageNumber >= data.totalPages - 1)}
                onClick={() => setPageNumber(params.pageNumber + 1)}
                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer SlideOver for Add/Edit Expense */}
      <ExpenseFormModal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        expense={selectedExpense}
        onSubmitSuccess={fetchExpensesList}
      />

      {/* Single Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Transaction Record"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-100">&quot;{deleteTargetName}&quot;</strong>? This action cannot be undone and will update MTD analytics.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteAction}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        title="Bulk Delete Transactions"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete <strong className="text-slate-900 dark:text-white font-extrabold">{selectedIds.size} selected transaction records</strong>? This will permanently remove them from the database audit trail.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsBulkDeleteConfirmOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md"
            >
              Confirm Bulk Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Expense Detail View Modal */}
      <ViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingExpense(null);
        }}
        title="Expense Record Details"
        fields={viewFields}
        extraContent={viewReceiptContent}
      />

      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadSuccess={fetchExpensesList}
      />
    </div>
  );
}
