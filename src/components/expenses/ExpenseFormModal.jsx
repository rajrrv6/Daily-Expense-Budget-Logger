import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../common/Modal';
import { getCategories, createCategory } from '../../services/categoryService';
import { createExpense, updateExpense, uploadReceipt } from '../../services/expenseService';
import { useNotification } from '../../context/NotificationContext';

const expenseFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be between 2 and 100 characters').max(100),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be a positive number',
    }),
  transactionDate: z.string().min(1, 'Transaction date is required')
    .refine((val) => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      return val <= todayStr;
    }, {
      message: 'Transaction date cannot be in the future',
    }),
  categoryId: z.string().min(1, 'Category is required'),
  receiptPath: z.string().optional().nullable(),
});

export default function ExpenseFormModal({ isOpen, onClose, expense, onSubmitSuccess }) {
  const { showNotification } = useNotification();
  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
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
      receiptPath: '',
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

  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [receiptPath, setReceiptPath] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds the 5MB limit.');
      return;
    }

    const allowedExtensions = ['pdf', 'jpg', 'jpeg'];
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setFileError('Only PDF, JPG, and JPEG file types are allowed.');
      return;
    }

    setFileError('');
    setUploadingFile(true);
    try {
      const response = await uploadReceipt(file);
      const fileName = response.fileName;
      setReceiptPath(fileName);
      setValue('receiptPath', fileName);
      showNotification('Receipt uploaded successfully!', 'success');
    } catch (err) {
      setFileError(err.response?.data?.message || 'Failed to upload receipt.');
      showNotification('Receipt upload failed.', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setReceiptPath('');
    setValue('receiptPath', '');
    setFileError('');
    const fileInput = document.getElementById('receipt-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Set values if in Edit mode
  useEffect(() => {
    if (isOpen) {
      setFileError('');
      setUploadingFile(false);
      if (expense) {
        setReceiptPath(expense.receiptPath || '');
        reset({
          name: expense.name,
          amount: expense.amount.toString(),
          transactionDate: expense.transactionDate,
          categoryId: expense.category.id.toString(),
          receiptPath: expense.receiptPath || '',
        });
      } else {
        setReceiptPath('');
        reset({
          name: '',
          amount: '',
          transactionDate: new Date().toISOString().split('T')[0],
          categoryId: '',
          receiptPath: '',
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
        receiptPath: receiptPath || null,
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
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Expense Name
          </label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. Office rent, Groceries"
            className="w-full px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-400 dark:placeholder-slate-650"
          />
          {errors.name && (
            <span className="block text-xs text-red-500 dark:text-red-400 mt-1">{errors.name.message}</span>
          )}
        </div>

        {/* Grid Amount & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Amount (₹)
            </label>
            <input
              type="text"
              {...register('amount')}
              placeholder="0.00"
              className="w-full px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-400 dark:placeholder-slate-650"
            />
            {errors.amount && (
              <span className="block text-xs text-red-500 dark:text-red-400 mt-1">{errors.amount.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Transaction Date
            </label>
            <input
              type="date"
              max={todayStr}
              {...register('transactionDate')}
              className="w-full px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
            />
            {errors.transactionDate && (
              <span className="block text-xs text-red-500 dark:text-red-400 mt-1">{errors.transactionDate.message}</span>
            )}
          </div>
        </div>

        {/* Category Selector */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Category
            </label>
            <button
              type="button"
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="text-xs text-brand-600 dark:text-brand-100 hover:text-brand-500 dark:hover:text-white transition-colors"
            >
              {showAddCategory ? 'Cancel' : '+ Add New Category'}
            </button>
          </div>

          {/* Quick Add Category Form */}
          {showAddCategory && (
            <div className="p-3 mb-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 transition-colors duration-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-brand-500 placeholder-slate-400 dark:placeholder-slate-650"
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
                />
                <button
                  type="button"
                  disabled={catLoading}
                  onClick={handleAddNewCategory}
                  className="px-3 py-1.5 text-xs text-slate-700 dark:text-white bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 rounded disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <select
            {...register('categoryId')}
            className="w-full px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <span className="block text-xs text-red-500 dark:text-red-400 mt-1">{errors.categoryId.message}</span>
          )}
        </div>

        {/* Payment Receipt Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Payment Receipt (Optional)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,image/jpeg,image/jpg,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="receipt-file-input"
            />
            <label
              htmlFor="receipt-file-input"
              className="flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              {uploadingFile ? 'Uploading...' : receiptPath ? 'Change File' : 'Choose Receipt File'}
            </label>
            {receiptPath && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-1.5 rounded-lg max-w-[280px]">
                <span className="truncate flex-1">
                  {receiptPath.substring(receiptPath.indexOf('_') + 1)}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-400 font-bold ml-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {fileError && (
            <span className="block text-xs text-red-500 dark:text-red-400 mt-1">{fileError}</span>
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
