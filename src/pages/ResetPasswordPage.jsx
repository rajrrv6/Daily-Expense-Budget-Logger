import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '../services/apiClient';
import { Lock, CheckCircle2, AlertTriangle } from 'lucide-react';

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required.'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string().min(1, 'Confirm password cannot be empty.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setSuccessMessage('');
    setSubmitError('');
    try {
      await apiClient.post('/api/v1/auth/reset-password', {
        token: data.token,
        newPassword: data.newPassword,
      });
      setSuccessMessage('Password has been reset successfully. You can now sign in.');
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to reset password. The link may be invalid or expired.');
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200">
      {/* Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Lock className="w-12 h-12 text-brand-500 dark:text-brand-100 flex-shrink-0" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Set New Password</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Complete the form below to restore your account access</p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="space-y-4">
            <div className="p-4 text-sm text-emerald-805 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-250 dark:border-emerald-800 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
            <Link
              to="/login"
              className="block w-full py-3 text-center text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all hover:shadow-lg hover:shadow-brand-500/25"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 mb-6 text-sm text-red-750 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-550 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Reset Form */}
        {!successMessage && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Reset Token Input (Hidden if provided via URL) */}
            {!tokenFromUrl && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Reset Token
                </label>
                <input
                  type="text"
                  {...register('token')}
                  placeholder="Enter the reset token sent to your email"
                  className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                    errors.token ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                  } rounded-lg focus:outline-none transition-colors`}
                />
                {errors.token && (
                  <span className="block text-xs text-red-650 dark:text-red-400 mt-1">{errors.token.message}</span>
                )}
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                {...register('newPassword')}
                placeholder="••••••••"
                className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.newPassword ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              {errors.newPassword && (
                <span className="block text-xs text-red-650 dark:text-red-400 mt-1">{errors.newPassword.message}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                placeholder="••••••••"
                className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              {errors.confirmPassword && (
                <span className="block text-xs text-red-650 dark:text-red-400 mt-1">{errors.confirmPassword.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25"
            >
              {isSubmitting ? 'Resetting password...' : 'Update Password'}
            </button>
          </form>
        )}

        {!successMessage && (
          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Cancel and return to{' '}
            <Link to="/login" className="font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        )}
      </div>
  );
}
