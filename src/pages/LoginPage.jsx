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
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { usernameOrEmail: '', password: '' },
  });

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
    <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200">
      {/* Title */}
      <div className="text-center mb-4 flex flex-col items-center">
        <Wallet className="w-9 h-9 text-brand-500 dark:text-brand-100 flex-shrink-0" />
        <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Welcome Back</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Log in to track your expenses and budgets</p>
      </div>

      {/* Error Alert */}
      {submitError && (
        <div className="p-3.5 mb-4 text-xs text-red-750 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-550 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Username or Email
          </label>
          <input
            type="text"
            {...register('usernameOrEmail')}
            placeholder="Enter username or email"
            className={`w-full px-4 py-2 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
              errors.usernameOrEmail ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
            } rounded-lg focus:outline-none transition-colors`}
          />
          {errors.usernameOrEmail && (
            <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.usernameOrEmail.message}</span>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
            className={`w-full px-4 py-2 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
              errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
            } rounded-lg focus:outline-none transition-colors`}
          />
          {errors.password && (
            <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.password.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25"
        >
          {isSubmitting ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
        {"Don't"} have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
