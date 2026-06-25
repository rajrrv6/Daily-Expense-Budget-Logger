import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const budgetFormSchema = z.object({
  categoryId: z.string().optional(),
  monthlyLimit: z.string()
    .min(1, 'Monthly limit is required')
    .refine(val => !isNaN(Number(val)) && parseFloat(val) > 0, 'Limit must be greater than 0'),
  warningThresholdPercent: z.string()
    .min(1, 'Warning threshold is required')
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 100;
    }, 'Threshold must be an integer between 1 and 100'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date cannot be after end date',
  path: ['endDate'],
});

export default function BudgetFormModal({ isOpen, onClose, onSubmit, budget, categories }) {
  const isEditMode = !!budget;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: '',
      monthlyLimit: '',
      warningThresholdPercent: '80',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (budget) {
        reset({
          categoryId: budget.categoryId ? budget.categoryId.toString() : '',
          monthlyLimit: budget.monthlyLimit ? budget.monthlyLimit.toString() : '',
          warningThresholdPercent: budget.warningThresholdPercent ? budget.warningThresholdPercent.toString() : '80',
          startDate: budget.startDate || '',
          endDate: budget.endDate || '',
        });
      } else {
        reset({
          categoryId: '',
          monthlyLimit: '',
          warningThresholdPercent: '80',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        });
      }
    }
  }, [isOpen, budget, reset]);

  if (!isOpen) return null;

  const handleFormSubmit = async (data) => {
    const payload = {
      categoryId: data.categoryId ? parseInt(data.categoryId) : null,
      monthlyLimit: parseFloat(data.monthlyLimit),
      warningThresholdPercent: parseInt(data.warningThresholdPercent),
      startDate: data.startDate,
      endDate: data.endDate,
    };
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 animate-slide-in pointer-events-auto transition-colors duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-850">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {isEditMode ? 'Modify Budget Configuration' : 'Setup New Budget limit'}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
          
          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Category Scope
            </label>
            <select
              {...register('categoryId')}
              className="w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="">Global Budget (All spending categories)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Assign to a single category or leave as Global.</p>
          </div>

          {/* Monthly Limit */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Monthly Limit Amount (₹)
            </label>
            <input
              type="text"
              {...register('monthlyLimit')}
              placeholder="e.g. 1500.00"
              className={`w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border ${
                errors.monthlyLimit ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
              } rounded-lg focus:outline-none focus:border-brand-500 transition-colors`}
            />
            {errors.monthlyLimit && (
              <span className="block text-xs text-red-500 mt-1">{errors.monthlyLimit.message}</span>
            )}
          </div>

          {/* Warning Threshold */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Warning Threshold (%)
            </label>
            <input
              type="number"
              {...register('warningThresholdPercent')}
              placeholder="e.g. 80"
              className={`w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border ${
                errors.warningThresholdPercent ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
              } rounded-lg focus:outline-none focus:border-brand-500 transition-colors`}
            />
            {errors.warningThresholdPercent && (
              <span className="block text-xs text-red-500 mt-1">{errors.warningThresholdPercent.message}</span>
            )}
            <p className="text-[10px] text-slate-400 mt-1">Triggers alert warnings when category spending reaches this percentage.</p>
          </div>

          {/* Date Ranges */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 transition-colors"
              />
              {errors.startDate && (
                <span className="block text-xs text-red-500 mt-1">{errors.startDate.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                End Date
              </label>
              <input
                type="date"
                {...register('endDate')}
                className={`w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border ${
                  errors.endDate ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:border-brand-500 transition-colors`}
              />
              {errors.endDate && (
                <span className="block text-xs text-red-500 mt-1">{errors.endDate.message}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-850 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : isEditMode ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
