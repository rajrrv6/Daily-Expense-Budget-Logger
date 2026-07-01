import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Wallet, AlertTriangle } from 'lucide-react';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    defaultValues: { usernameOrEmail: '', password: '' },
  });

  const usernameOrEmail = watch('usernameOrEmail');
  const password = watch('password');
  const isFormFilled = usernameOrEmail?.trim() && password;

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      await login(data.usernameOrEmail, data.password);
      showNotification('Signed in successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      setSubmitError(errMsg);
      showNotification(errMsg, 'error');
    }
  };

  return (
    <div className="w-full max-w-lg p-8 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all duration-200">
      {/* Title */}
      <div className="text-center mb-6 flex flex-col items-center">
        <Wallet className="w-12 h-12 text-brand-500 dark:text-brand-100 flex-shrink-0" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Sign In to BudgetLogger</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Log in to track your expenses and budgets</p>
      </div>

      {/* Error Alert */}
      {submitError && (
        <div className="p-4 mb-5 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Username or Email
          </label>
          <input
            type="text"
            {...register('usernameOrEmail')}
            placeholder="Enter username or email"
            className={`w-full px-5 py-3 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
              errors.usernameOrEmail ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-100 focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-100/20'
            } rounded-xl focus:outline-none transition-all`}
          />
          {errors.usernameOrEmail && (
            <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.usernameOrEmail.message}</span>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors">
              Forgot Password?
            </Link>
          </div>
          <input
            type="password"
            {...register('password')}
            placeholder="••••••••"
            className={`w-full px-5 py-3 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
              errors.password ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-100 focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-100/20'
            } rounded-xl focus:outline-none transition-all`}
          />
          {errors.password && (
            <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.password.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isFormFilled}
          className="w-full py-3.5 text-base font-semibold text-white bg-brand-500 dark:bg-brand-100 dark:text-brand-600 dark:hover:bg-white rounded-xl hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25 dark:hover:shadow-brand-100/25"
        >
          {isSubmitting ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {"Don't"} have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
