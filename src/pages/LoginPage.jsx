import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { loginSchema } from '../utils/validationSchemas';

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
    defaultValues: { usernameOrEmail: '', password: '' },
  });

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      await login(data.usernameOrEmail, data.password);
      showNotification('Signed in successfully!', 'success');
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      setSubmitError(errMsg);
      showNotification(errMsg, 'error');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-600/20 p-4">
      <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-4xl">💰</span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-400">Log in to track your expenses and budgets</p>
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 mb-6 text-sm text-red-200 bg-red-950/40 border border-red-800 rounded-lg">
            ⚠️ {submitError}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Username or Email
            </label>
            <input
              type="text"
              {...register('usernameOrEmail')}
              placeholder="Enter username or email"
              className={`w-full px-4 py-3 text-sm text-slate-100 bg-slate-950/80 border ${
                errors.usernameOrEmail ? 'border-red-800 focus:border-red-800' : 'border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.usernameOrEmail && (
              <span className="block text-xs text-red-400 mt-1">{errors.usernameOrEmail.message}</span>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-brand-100 hover:text-white transition-colors">
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className={`w-full px-4 py-3 text-sm text-slate-100 bg-slate-950/80 border ${
                errors.password ? 'border-red-800 focus:border-red-800' : 'border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.password && (
              <span className="block text-xs text-red-400 mt-1">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25"
          >
            {isSubmitting ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {"Don't"} have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-100 hover:text-white transition-colors">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
