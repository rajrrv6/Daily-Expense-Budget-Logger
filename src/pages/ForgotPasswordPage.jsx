import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '../services/apiClient';
import { KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email cannot be blank.')
    .email('Invalid email format.'),
});

export default function ForgotPasswordPage() {
  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    setSuccessMessage('');
    setSubmitError('');
    try {
      await apiClient.post('/api/v1/auth/forgot-password', { email: data.email });
      setSuccessMessage('If the email is registered, you will receive a reset link shortly.');
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'An error occurred. Please try again later.');
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200">
        {/* Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <KeyRound className="w-12 h-12 text-brand-500 dark:text-brand-100 flex-shrink-0" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Reset Password</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Enter your email to receive a recovery link</p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 mb-6 text-sm text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 mb-6 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Reset Form */}
        {!successMessage && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="e.g. john@example.com"
                className={`w-full px-4 py-3 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              {errors.email && (
                <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.email.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25"
            >
              {isSubmitting ? 'Sending link...' : 'Send Recovery Link'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors">
            Sign In
          </Link>
        </div>
      </div>
  );
}
