import React, { useEffect, useState, useCallback } from 'react';
import useQueryParams from '../hooks/useQueryParams';
import { getExpenses, deleteExpense, exportExpenses } from '../services/expenseService';
import Table from '../components/common/Table';
import ExpenseFormModal from '../components/expenses/ExpenseFormModal';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import ErrorRetryState from '../components/common/ErrorRetryState';
import { useNotification } from '../context/NotificationContext';

export default function ExpensesPage() {
  const { showNotification } = useNotification();
  const { params, setParam, setPageNumber, resetFilters } = useQueryParams();

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, isLast: true });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

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
    if (!window.confirm('Are you sure you want to delete this expense record?')) {
      return;
    }

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

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await exportExpenses(params.startDate, params.endDate);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('CSV export completed successfully.', 'success');
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

  const headers = ['Expense Name', 'Category', 'Amount', 'Date', 'Actions'];

  const renderRow = (item) => (
    <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
      <td className="px-6 py-4 text-sm font-medium text-slate-200">{item.name}</td>
      <td className="px-6 py-4 text-sm">
        <span
          className="px-2.5 py-1 text-xs font-semibold rounded-full text-white/90"
          style={{ backgroundColor: item.category.color || '#4F46E5' }}
        >
          {item.category.name}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-bold text-slate-100">${item.amount.toFixed(2)}</td>
      <td className="px-6 py-4 text-sm text-slate-400">
        {new Date(item.transactionDate).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </td>
      <td className="px-6 py-4 text-sm space-x-3">
        <button
          onClick={() => handleEdit(item)}
          className="text-brand-100 hover:text-white transition-colors"
        >
          Edit
        </button>
        <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 transition-colors">
          Delete
        </button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div>
          <h3 className="text-xl font-semibold text-slate-100">Expenses Log</h3>
          <p className="text-sm text-slate-400 mt-1">
            Review, add, and organize your ledger details here.
          </p>
        </div>
        <div className="flex gap-3 self-start md:self-auto">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-4 py-2.5 text-sm font-semibold text-slate-300 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Export expenses ledger to CSV file"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={params.startDate}
              onChange={(e) => setParam('startDate', e.target.value)}
              className="px-4 py-2 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              End Date
            </label>
            <input
              type="date"
              value={params.endDate}
              onChange={(e) => setParam('endDate', e.target.value)}
              className="px-4 py-2 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500"
            />
          </div>

          {(params.startDate || params.endDate) && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Sorting Dropdowns */}
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Sort By
            </label>
            <select
              value={params.sortBy}
              onChange={(e) => setParam('sortBy', e.target.value)}
              className="px-4 py-2 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500"
            >
              <option value="transactionDate">Transaction Date</option>
              <option value="name">Expense Name</option>
              <option value="amount">Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Direction
            </label>
            <select
              value={params.sortDirection}
              onChange={(e) => setParam('sortDirection', e.target.value)}
              className="px-4 py-2 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500"
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-slate-800 bg-slate-900/20 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Rows per page:</span>
              <select
                value={params.pageSize}
                onChange={(e) => setParam('pageSize', parseInt(e.target.value))}
                className="px-2 py-1 text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded focus:outline-none"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
              <span className="text-xs text-slate-400">
                Showing {params.pageNumber * params.pageSize + 1} to{' '}
                {Math.min((params.pageNumber + 1) * params.pageSize, data.totalElements)} of{' '}
                {data.totalElements} entries
              </span>
            </div>

            <div className="flex gap-2">
              <button
                disabled={params.pageNumber === 0}
                onClick={() => setPageNumber(params.pageNumber - 1)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={data.isLast}
                onClick={() => setPageNumber(params.pageNumber + 1)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}
