import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getTodos, completeTodo, deleteTodo } from '../services/todoService';
import { getCategories } from '../services/categoryService';
import { uploadReceipt } from '../services/expenseService';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import TodoFormModal from '../components/todos/TodoFormModal';

export default function TodosPage() {
  const { showNotification } = useNotification();

  // State Management
  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'
  
  // Creation/Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  // Deletion Confirmation Modal State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  // Completion dialog Modal State
  const [completeItem, setCompleteItem] = useState(null);
  const [completePrice, setCompletePrice] = useState('');
  const [completeCategoryId, setCompleteCategoryId] = useState('');
  const [completeReceiptPath, setCompleteReceiptPath] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [completeDropdownOpen, setCompleteDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const completeCategoryName = completeCategoryId
    ? categories.find(c => c.id.toString() === completeCategoryId.toString())?.name || 'Select Category'
    : 'Select Category';

  // Fetch checklist items and categories
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [todosData, categoriesData] = await Promise.all([
        getTodos(),
        getCategories()
      ]);
      setTodos(todosData);
      setCategories(categoriesData);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to retrieve checklist data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add Item triggering
  const handleAddNew = () => {
    setEditingTodo(null);
    setIsFormModalOpen(true);
  };

  // Edit Item triggering
  const handleEdit = (item) => {
    setEditingTodo(item);
    setIsFormModalOpen(true);
  };

  // Callback on successful form submit
  const handleFormSubmitSuccess = (savedItem, isEditMode) => {
    if (isEditMode) {
      setTodos((prev) => prev.map((t) => (t.id === savedItem.id ? savedItem : t)));
    } else {
      setTodos((prev) => [savedItem, ...prev]);
    }
  };

  // Click on checkbox triggers completion flow
  const handleCheckboxClick = (item) => {
    if (item.completed) return;
    setCompleteItem(item);
    setCompletePrice(item.price ? item.price.toString() : '');
    setCompleteCategoryId(item.categoryId ? item.categoryId.toString() : '');
    setCompleteReceiptPath('');
    setReceiptError('');
    setCompleteDropdownOpen(false);
  };

  // Submit checklist item completion
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
      const updatedItem = await completeTodo(completeItem.id, {
        price: parseFloat(completePrice),
        categoryId: parseInt(completeCategoryId),
        receiptPath: completeReceiptPath || null
      });

      setTodos((prev) => prev.map((t) => (t.id === completeItem.id ? updatedItem : t)));
      setCompleteItem(null);
      setCompleteDropdownOpen(false);
      showNotification('Checklist item marked as completed and expense logged.', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to complete checklist item.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // File Upload Handler for Receipts
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

  // Delete flow
  const openDeleteConfirm = (item) => {
    setDeleteTargetId(item.id);
    setDeleteTargetName(item.name);
    setIsDeleteConfirmOpen(true);
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
    const originalTodos = [...todos];
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      await deleteTodo(id);
      showNotification('Checklist item deleted.', 'success');
    } catch (err) {
      setTodos(originalTodos);
      showNotification(err.response?.data?.message || 'Failed to delete task. Rolled back.', 'error');
    }
  };

  // Stable memoized filter selection
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'PENDING') return !todo.completed;
      if (filter === 'COMPLETED') return todo.completed;
      return true;
    });
  }, [todos, filter]);

  // Formatter for Target Date
  const formatTargetDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Title Header with Add Item button */}
      <div className="flex justify-between items-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
        <div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Shopping Checklist</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage tasks or budget purchases. Changes sync automatically in the background.
          </p>
        </div>
        
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-brand-500/10 hover:shadow-brand-500/20 transition-all duration-205"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      {/* List Manager Panel */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[400px] transition-colors duration-200">
        <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-800 mb-6 transition-colors duration-200">
          <div className="flex gap-2" role="tablist" aria-label="Task Status Filters">
            {['ALL', 'PENDING', 'COMPLETED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors outline-none ${
                  filter === status
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950/40 hover:bg-slate-200 dark:hover:bg-slate-900'
                }`}
                role="tab"
                aria-selected={filter === status}
                aria-label={`Show ${status.toLowerCase()} items`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredTodos.length} items
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 py-12 animate-pulse">
            <div className="h-12 bg-slate-100 dark:bg-slate-850 rounded-lg"></div>
            <div className="h-12 bg-slate-100 dark:bg-slate-850 rounded-lg"></div>
            <div className="h-12 bg-slate-100 dark:bg-slate-850 rounded-lg"></div>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-450 text-sm">
            <p>No checklist items found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTodos.map((item) => (
              <div
                key={item.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-lg hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-200 gap-3"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Status checkbox */}
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={item.completed || submitting}
                    onChange={() => handleCheckboxClick(item)}
                    className="w-5 h-5 rounded border-slate-350 dark:border-slate-750 bg-white dark:bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Toggle completeness for task ${item.name}`}
                  />

                  {/* Task Name & details */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm text-slate-800 dark:text-slate-200 font-semibold break-all ${
                          item.completed ? 'line-through text-slate-400 dark:text-slate-550' : ''
                        }`}
                      >
                        {item.name}
                      </span>

                      {/* Category badge */}
                      {item.categoryName && (
                        <span
                          className="px-2 py-0.5 text-xs font-semibold rounded-full border"
                          style={{
                            backgroundColor: `${item.categoryColor}15`,
                            color: item.categoryColor,
                            borderColor: `${item.categoryColor}30`,
                          }}
                        >
                          {item.categoryName}
                        </span>
                      )}

                      {/* Estimated Price label */}
                      {item.price !== null && item.price !== undefined && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
                          Estimated: ₹{Number(item.price).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Target Date Details */}
                    {item.targetDate && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Buy by: {formatTargetDate(item.targetDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations buttons */}
                <div className="flex items-center justify-end gap-3">
                  {/* Edit Pencil icon */}
                  {!item.completed && (
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-colors p-1"
                      aria-label={`Edit ${item.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}

                  {/* Bin Delete icon in red */}
                  <button
                    onClick={() => openDeleteConfirm(item)}
                    className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-405 transition-colors p-1"
                    aria-label={`Delete task ${item.name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creation/Edit Form Modal */}
      <TodoFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        todo={editingTodo}
        onSubmitSuccess={handleFormSubmitSuccess}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDeleteConfirmOpen(false)}
          title="Confirm Delete"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">&quot;{deleteTargetName}&quot;</strong> from your Shopping Checklist? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

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
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                          !completeCategoryId ? 'bg-slate-100/50 dark:bg-slate-850 font-semibold' : ''
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
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                            completeCategoryId?.toString() === cat.id.toString() ? 'bg-slate-100/50 dark:bg-slate-850 font-semibold' : ''
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
                  <div className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-355 truncate">
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
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingReceipt}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm & Add Expense
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
