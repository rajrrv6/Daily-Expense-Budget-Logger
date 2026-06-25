import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../common/Modal';
import { getCategories, createCategory } from '../../services/categoryService';
import { createExpense, updateExpense } from '../../services/expenseService';
import { useNotification } from '../../context/NotificationContext';

const expenseFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be between 2 and 100 characters').max(100),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be a positive number',
    }),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  categoryId: z.string().min(1, 'Category is required'),
});

export default function ExpenseFormModal({ isOpen, onClose, expense, onSubmitSuccess }) {
  const { showNotification } = useNotification();
  const [categories, setCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4F46E5');
  const [catLoading, setCatLoading] = useState(false);

  const isEditMode = !!expense;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      name: '',
      amount: '',
      transactionDate: new Date().toISOString().split('T')[0],
      categoryId: '',
    },
  });

  // Load categories
  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        try {
          const data = await getCategories();
          setCategories(data);
        } catch (err) {
          showNotification('Failed to load categories', 'error');
        }
      };
      loadCategories();
    }
  }, [isOpen, showNotification]);

  // Set values if in Edit mode
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        reset({
          name: expense.name,
          amount: expense.amount.toString(),
          transactionDate: expense.transactionDate,
          categoryId: expense.category.id.toString(),
        });
      } else {
        reset({
          name: '',
          amount: '',
          transactionDate: new Date().toISOString().split('T')[0],
          categoryId: '',
        });
      }
      setShowAddCategory(false);
    }
  }, [isOpen, expense, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        amount: parseFloat(data.amount),
        transactionDate: data.transactionDate,
        categoryId: parseInt(data.categoryId),
      };

      if (isEditMode) {
        await updateExpense(expense.id, payload);
        showNotification('Expense updated successfully!', 'success');
      } else {
        await createExpense(payload);
        showNotification('Expense created successfully!', 'success');
      }
      onSubmitSuccess();
      onClose();
    } catch (err) {
      showNotification(
        err.response?.data?.message || 'Failed to save expense details.',
        'error'
      );
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCatName.trim()) {
      showNotification('Category name cannot be blank', 'error');
      return;
    }
    setCatLoading(true);
    try {
      const newCat = await createCategory({
        name: newCatName.trim(),
        color: newCatColor,
      });
      setCategories((prev) => [...prev, newCat]);
      setValue('categoryId', newCat.id.toString());
      setNewCatName('');
      setShowAddCategory(false);
      showNotification('New category added!', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to add category', 'error');
    } finally {
      setCatLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Expense Record' : 'Add New Expense'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Expense Name
          </label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. Office rent, Groceries"
            className="w-full px-4 py-2.5 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
          />
          {errors.name && (
            <span className="block text-xs text-red-400 mt-1">{errors.name.message}</span>
          )}
        </div>

        {/* Grid Amount & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Amount ($)
            </label>
            <input
              type="text"
              {...register('amount')}
              placeholder="0.00"
              className="w-full px-4 py-2.5 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
            />
            {errors.amount && (
              <span className="block text-xs text-red-400 mt-1">{errors.amount.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Transaction Date
            </label>
            <input
              type="date"
              {...register('transactionDate')}
              className="w-full px-4 py-2.5 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
            />
            {errors.transactionDate && (
              <span className="block text-xs text-red-400 mt-1">{errors.transactionDate.message}</span>
            )}
          </div>
        </div>

        {/* Category Selector */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Category
            </label>
            <button
              type="button"
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="text-xs text-brand-100 hover:text-white transition-colors"
            >
              {showAddCategory ? 'Cancel' : '+ Add New Category'}
            </button>
          </div>

          {/* Quick Add Category Form */}
          {showAddCategory && (
            <div className="p-3 mb-3 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-3 py-1.5 text-xs text-slate-100 bg-slate-900 border border-slate-800 rounded focus:outline-none focus:border-brand-500"
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer"
                />
                <button
                  type="button"
                  disabled={catLoading}
                  onClick={handleAddNewCategory}
                  className="px-3 py-1.5 text-xs text-white bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <select
            {...register('categoryId')}
            className="w-full px-4 py-2.5 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <span className="block text-xs text-red-400 mt-1">{errors.categoryId.message}</span>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-brand-500/20"
        >
          {isSubmitting ? 'Saving record...' : isEditMode ? 'Update Record' : 'Save Expense'}
        </button>
      </form>
    </Modal>
  );
}
