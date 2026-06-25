import React, { useEffect, useState, useCallback } from 'react';
import useQueryParams from '../hooks/useQueryParams';
import { getExpenses, deleteExpense, exportExpenses, getReceiptFile } from '../services/expenseService';
import Table from '../components/common/Table';
import ExpenseFormModal from '../components/expenses/ExpenseFormModal';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import ErrorRetryState from '../components/common/ErrorRetryState';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';

export default function ExpensesPage() {
  const { showNotification } = useNotification();
  const { params, setParam, setPageNumber, resetFilters } = useQueryParams();

  const handleViewReceipt = async (filename) => {
    try {
      const blob = await getReceiptFile(filename);
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
    } catch (err) {
      showNotification('Failed to download receipt file. It may have been deleted or is inaccessible.', 'error');
    }
  };

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

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

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, isLast: true });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Deletion confirmation states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  const confirmDeleteAction = async () => {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setIsDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetName('');
    await handleDelete(targetId);
  };

  // Fetch expenses
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve expense records.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchExpensesList();
  }, [fetchExpensesList]);

  // Optimistic Delete handler
  const handleDelete = async (id) => {
    const previousContent = [...data.content];
    // Optimistic UI state update: immediately remove from view
    setData((prev) => ({
      ...prev,
      content: prev.content.filter((item) => item.id !== id),
      totalElements: prev.totalElements - 1,
    }));

    try {
      await deleteExpense(id);
      showNotification('Expense deleted successfully!', 'success');
      // Refetch to align pagination bounds
      fetchExpensesList();
    } catch (err) {
      // Revert state on failure
      setData((prev) => ({ ...prev, content: previousContent, totalElements: previousContent.length + prev.content.length }));
      showNotification(err.response?.data?.message || 'Failed to delete record. Reverting action.', 'error');
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await exportExpenses(params.startDate, params.endDate);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_export_${new Date().toISOString().split('T')[0]}.pdf`);
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

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const headers = ['Expense Name', 'Category', 'Amount', 'Date', 'Receipt', 'Actions'];

  const renderRow = (item) => (
    <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors">
      <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</td>
      <td className="px-6 py-4 text-sm">
        <span
          className="px-2.5 py-1 text-xs font-semibold rounded-full text-white/90"
          style={{ backgroundColor: item.category.color || '#4F46E5' }}
        >
          {item.category.name}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">₹{item.amount.toFixed(2)}</td>
      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
        {new Date(item.transactionDate).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </td>
      <td className="px-6 py-4 text-sm">
        {item.receiptPath ? (
          <button
            onClick={() => handleViewReceipt(item.receiptPath)}
            className="text-emerald-650 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors inline-flex items-center gap-1 font-semibold"
            title="View Attached Receipt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Receipt</span>
          </button>
        ) : (
          <span className="text-slate-400 dark:text-slate-650">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm space-x-3">
        <button
          onClick={() => handleEdit(item)}
          className="text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-white transition-colors"
          title="Edit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => {
            setDeleteTargetId(item.id);
            setDeleteTargetName(item.name);
            setIsDeleteConfirmOpen(true);
          }}
          className="text-red-500 hover:text-red-700 transition-colors"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
        <div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Expenses Log</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review, add, and organize your ledger details here.
          </p>
        </div>
        <div className="flex gap-3 self-start md:self-auto">
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 dark:hover:bg-slate-900 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Export expenses ledger to PDF report"
          >
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={handleAddNew}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors hover:shadow-lg hover:shadow-brand-500/20"
            aria-label="Add new expense record"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={params.startDate}
              onChange={handleStartDateChange}
              max={todayStr}
              className="px-4 py-2 text-sm text-slate-800 dark:text-slate-100 bg-slate-550/5 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              End Date
            </label>
            <input
              type="date"
              value={params.endDate}
              onChange={handleEndDateChange}
              max={todayStr}
              className="px-4 py-2 text-sm text-slate-800 dark:text-slate-100 bg-slate-550/5 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500"
            />
          </div>

          {(params.startDate || params.endDate) && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Sorting Dropdowns */}
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Sort By
            </label>
            <select
              value={params.sortBy}
              onChange={(e) => setParam('sortBy', e.target.value)}
              className="px-4 py-2 text-sm text-slate-800 dark:text-slate-100 bg-slate-550/5 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500"
            >
              <option value="transactionDate">Transaction Date</option>
              <option value="name">Expense Name</option>
              <option value="amount">Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Direction
            </label>
            <select
              value={params.sortDirection}
              onChange={(e) => setParam('sortDirection', e.target.value)}
              className="px-4 py-2 text-sm text-slate-800 dark:text-slate-100 bg-slate-550/5 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500"
            >
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
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
      ) : data.content.length === 0 ? (
        <EmptyState
          icon="💸"
          title="No expenses registered"
          description="Click the Add Expense button above to record your first transaction."
          actionLabel="Record Expense"
          onAction={handleAddNew}
        />
      ) : (
        <div className="space-y-4">
          <Table headers={headers} data={data.content} renderRow={renderRow} />

          {/* Pagination Footer */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl transition-colors duration-200">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">Rows per page:</span>
              <select
                value={params.pageSize}
                onChange={(e) => setParam('pageSize', parseInt(e.target.value))}
                className="px-2 py-1 text-xs text-slate-700 dark:text-slate-250 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {params.pageNumber * params.pageSize + 1} to{' '}
                {Math.min((params.pageNumber + 1) * params.pageSize, data.totalElements)} of{' '}
                {data.totalElements} entries
              </span>
            </div>

            <div className="flex gap-2">
              <button
                disabled={params.pageNumber === 0}
                onClick={() => setPageNumber(params.pageNumber - 1)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={data.isLast}
                onClick={() => setPageNumber(params.pageNumber + 1)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal Form */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        expense={selectedExpense}
        onSubmitSuccess={fetchExpensesList}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete the expense <strong className="text-slate-800 dark:text-slate-100">"{deleteTargetName}"</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-350 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteAction}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-650 rounded-lg transition-colors hover:shadow-lg hover:shadow-red-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
