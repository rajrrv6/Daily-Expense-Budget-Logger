import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import CenterModal from '../common/CenterModal';
import { getCategories } from '../../services/categoryService';

const budgetFormSchema = z.object({
  categoryId: z.string().optional(),
  monthlyLimit: z.string()
    .min(1, 'Monthly limit is required.')
    .refine(val => !isNaN(Number(val)) && parseFloat(val) > 0, 'Limit must be greater than 0.'),
  warningThresholdPercent: z.string()
    .min(1, 'Warning threshold is required.')
    .refine(val => {
      const num = Number(val);
      return !isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 100;
    }, 'Threshold must be an integer between 1 and 100.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date cannot be after end date.',
  path: ['endDate'],
});

export default function BudgetFormModal({ isOpen, onClose, onSubmit, budget }) {
  const isEditMode = !!budget;
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [dbCategories, setDbCategories] = React.useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
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

  const selectedCategoryId = watch('categoryId');
  const selectedCategoryName = selectedCategoryId
    ? dbCategories.find(c => c.id.toString() === selectedCategoryId.toString())?.name || 'Global Budget'
    : 'Global Budget (All spending categories)';

  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        try {
          const data = await getCategories();
          setDbCategories(data);
        } catch (err) {
          // Fallback
        }
      };
      loadCategories();
    }
  }, [isOpen]);

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
    <CenterModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Modify Budget Configuration' : 'Setup New Budget limit'}
    >
      {/* Form Body */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        
        {/* Category Dropdown */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Category Scope
          </label>
          <input type="hidden" {...register('categoryId')} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full pl-4 pr-10 py-2.5 text-left text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 transition-colors flex items-center justify-between font-semibold"
            >
              <span className="truncate">{selectedCategoryName}</span>
              <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute z-20 mt-1.5 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1">
                  <div
                    onClick={() => {
                      setValue('categoryId', '', { shouldValidate: true });
                      setIsDropdownOpen(false);
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                      !selectedCategoryId ? 'bg-slate-100/50 dark:bg-slate-850 font-semibold' : ''
                    }`}
                  >
                    Global Budget (All spending categories)
                  </div>
                  {dbCategories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setValue('categoryId', cat.id.toString(), { shouldValidate: true });
                        setIsDropdownOpen(false);
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                        selectedCategoryId?.toString() === cat.id.toString() ? 'bg-slate-100/50 dark:bg-slate-850 font-semibold' : ''
                      }`}
                    >
                      {cat.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-semibold">Assign to a single category or leave as Global.</p>
        </div>

        {/* Monthly Limit */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Monthly Limit Amount (₹)
          </label>
          <input
            type="text"
            {...register('monthlyLimit')}
            placeholder="e.g. 1500.00"
            className={`w-full px-4 py-3 text-sm text-slate-805 dark:text-slate-205 bg-slate-50 dark:bg-slate-950 border ${
              errors.monthlyLimit ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
            } rounded-xl focus:outline-none focus:border-brand-500 transition-colors font-semibold`}
          />
          {errors.monthlyLimit && (
            <span className="block text-xs text-red-500 mt-1 font-semibold">{errors.monthlyLimit.message}</span>
          )}
        </div>

        {/* Warning Threshold */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Warning Threshold (%)
          </label>
          <input
            type="number"
            {...register('warningThresholdPercent')}
            placeholder="e.g. 80"
            className={`w-full px-4 py-3 text-sm text-slate-805 dark:text-slate-205 bg-slate-50 dark:bg-slate-950 border ${
              errors.warningThresholdPercent ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
            } rounded-xl focus:outline-none focus:border-brand-500 transition-colors font-semibold`}
          />
          {errors.warningThresholdPercent && (
            <span className="block text-xs text-red-500 mt-1 font-semibold">{errors.warningThresholdPercent.message}</span>
          )}
          <p className="text-[10px] text-slate-400 font-semibold">Triggers alert warnings when category spending reaches this percentage.</p>
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Start Date
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="w-full px-4 py-3 text-sm text-slate-805 dark:text-slate-205 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 transition-colors"
            />
            {errors.startDate && (
              <span className="block text-xs text-red-500 mt-1 font-semibold">{errors.startDate.message}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              End Date
            </label>
            <input
              type="date"
              {...register('endDate')}
              className={`w-full px-4 py-3 text-sm text-slate-805 dark:text-slate-205 bg-slate-50 dark:bg-slate-950 border ${
                errors.endDate ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
              } rounded-xl focus:outline-none focus:border-brand-500 transition-colors`}
            />
            {errors.endDate && (
              <span className="block text-xs text-red-500 mt-1 font-semibold">{errors.endDate.message}</span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-6 py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-brand-500/15"
        >
          {isSubmitting ? 'Saving changes...' : isEditMode ? 'Confirm & Update' : 'Confirm & Create'}
        </button>

      </form>
    </CenterModal>
  );
}
