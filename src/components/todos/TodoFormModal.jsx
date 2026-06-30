import React, { useState, useEffect } from 'react';
import CenterModal from '../common/CenterModal';
import { createTodo, updateTodo } from '../../services/todoService';
import { getCategories, createCategory } from '../../services/categoryService';
import { useNotification } from '../../context/NotificationContext';

export default function TodoFormModal({ isOpen, onClose, todo, onSubmitSuccess }) {
  const { showNotification } = useNotification();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState('');

  // Category addition states
  const [dbCategories, setDbCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4F46E5');
  const [catLoading, setCatLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isEditMode = !!todo;

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // Fetch categories from backend when modal is opened
  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        try {
          const data = await getCategories();
          setDbCategories(data);
        } catch (err) {
          showNotification('Failed to load categories', 'error');
        }
      };
      loadCategories();
    }
  }, [isOpen, showNotification]);

  useEffect(() => {
    if (isOpen) {
      setShowAddCategory(false);
      setNewCatName('');
      setDateError('');
      if (todo) {
        setName(todo.name || '');
        setPrice(todo.price !== null && todo.price !== undefined ? todo.price.toString() : '');
        setCategoryId(todo.categoryId !== null && todo.categoryId !== undefined ? todo.categoryId.toString() : '');
        setTargetDate(todo.targetDate || '');
      } else {
        setName('');
        setPrice('');
        setCategoryId('');
        setTargetDate('');
      }
      setIsDropdownOpen(false);
    }
  }, [isOpen, todo]);

  const selectedCategoryName = categoryId
    ? dbCategories.find(c => c.id.toString() === categoryId.toString())?.name || 'Select a category'
    : 'Select a category';

  const handleAddNewCategory = async () => {
    if (!newCatName.trim()) {
      showNotification('Category name cannot be blank.', 'error');
      return;
    }
    setCatLoading(true);
    try {
      const newCat = await createCategory({
        name: newCatName.trim(),
        color: newCatColor,
      });
      setDbCategories((prev) => [...prev, newCat]);
      setCategoryId(newCat.id.toString());
      setNewCatName('');
      setShowAddCategory(false);
      showNotification('New category added!', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to add category.', 'error');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setTargetDate(val);
    if (val && val < todayStr) {
      setDateError('Target date cannot be in the past.');
    } else {
      setDateError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameStr = name.trim();
    if (!nameStr) {
      showNotification('Item name is required.', 'error');
      return;
    }

    if (price && parseFloat(price) < 0) {
      showNotification('Price must be greater than or equal to zero.', 'error');
      return;
    }

    if (targetDate && targetDate < todayStr) {
      setDateError('Target date cannot be in the past.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: nameStr,
        price: price ? parseFloat(price) : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        targetDate: targetDate || null,
      };

      let result;
      if (isEditMode) {
        result = await updateTodo(todo.id, payload);
        showNotification('Checklist item updated successfully.', 'success');
      } else {
        result = await createTodo(payload);
        showNotification('Checklist item added successfully.', 'success');
      }

      onSubmitSuccess(result, isEditMode);
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.message;
      if (errMsg && errMsg.toLowerCase().includes('target date')) {
        setDateError('Target date cannot be in the past.');
      } else {
        showNotification(errMsg || 'Failed to save checklist item.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CenterModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Checklist Item' : 'Add New Checklist Item'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Item Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Item Name
          </label>
          <input
            type="text"
            required
            disabled={submitting}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Office supplies, Snacks"
            className="w-full px-4 py-3 text-sm text-slate-805 dark:text-slate-205 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-400 font-semibold"
          />
        </div>

        {/* Grid Estimated Price & Date to Buy */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estimated Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.00"
              disabled={submitting}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 text-sm text-slate-855 dark:text-slate-205 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-400 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Date to Buy
            </label>
            <input
              type="date"
              min={todayStr}
              disabled={submitting}
              value={targetDate}
              onChange={handleDateChange}
              onBlur={handleDateChange}
              className={`w-full px-4 py-3 text-sm text-slate-855 dark:text-slate-205 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:border-brand-500 transition-colors font-semibold ${
                dateError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800'
              }`}
            />
            {dateError && (
              <span className="block text-xs text-red-500 dark:text-red-400 mt-1 font-semibold">
                {dateError}
              </span>
            )}
          </div>
        </div>

        {/* Category Selector */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Category
            </label>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="text-xs text-brand-600 dark:text-brand-100 hover:text-brand-500 font-bold transition-colors"
            >
              {showAddCategory ? 'Cancel' : '+ New Category'}
            </button>
          </div>

          {/* Quick Add Category Form */}
          {showAddCategory && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 transition-colors duration-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 placeholder-slate-400 font-semibold"
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
                />
                <button
                  type="button"
                  disabled={catLoading}
                  onClick={handleAddNewCategory}
                  className="px-3 py-1.5 text-xs text-slate-700 dark:text-white bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 rounded disabled:opacity-50 transition-colors font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full pl-4 pr-10 py-2.5 text-left text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 transition-colors flex items-center justify-between font-semibold"
            >
              <span className="truncate">{selectedCategoryName}</span>
              <svg className="h-4 w-4 text-slate-550 dark:text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute z-20 mt-1.5 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1">
                  <div
                    onClick={() => {
                      setCategoryId('');
                      setIsDropdownOpen(false);
                    }}
                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                      !categoryId ? 'bg-slate-100/50 dark:bg-slate-850 font-semibold' : ''
                    }`}
                  >
                    Select a category
                  </div>
                  {dbCategories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setCategoryId(cat.id.toString());
                        setIsDropdownOpen(false);
                      }}
                      className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                        categoryId?.toString() === cat.id.toString() ? 'bg-slate-100/50 dark:bg-slate-850 font-semibold' : ''
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

        {/* Action Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-6 py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-brand-500/15"
        >
          {submitting ? 'Saving changes...' : isEditMode ? 'Confirm & Update' : 'Confirm & Create'}
        </button>
      </form>
    </CenterModal>
  );
}
